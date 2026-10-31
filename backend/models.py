import numpy as np
from typing import List, Callable, Optional, Dict, Any, Tuple
import torch
import torch.nn as nn
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.svm import SVR
from sklearn.preprocessing import StandardScaler
import math


def _build_lagged_features(u: np.ndarray, y: np.ndarray, lag: int) -> Tuple[np.ndarray, np.ndarray]:
    """Build feature matrix from lagged inputs and outputs."""
    u = np.asarray(u).ravel()
    y = np.asarray(y).ravel()
    n = min(len(u), len(y))
    if n <= lag:
        return np.empty((0, lag * 2), dtype=np.float32), np.empty((0,), dtype=np.float32)
    X, Y = [], []
    for i in range(lag, n):
        u_lags = u[i - lag:i][::-1]
        y_lags = y[i - lag:i][::-1]
        X.append(np.concatenate([u_lags, y_lags]))
        Y.append(y[i])
    return np.array(X, dtype=np.float32), np.array(Y, dtype=np.float32)


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Computes rigorous system identification metrics:
    - RMSE: Root Mean Squared Error
    - MAE: Mean Absolute Error
    - MSE: Mean Squared Error
    - R²: Coefficient of determination
    - NRMSE: Normalized RMSE = RMSE / (max(y) - min(y))
    - fit_percent: Normalized Fit Percent = max(0, 100 * (1 - ||e||_2 / ||y - ȳ||_2))
    - residual_mean, residual_std
    """
    y_true = np.asarray(y_true, dtype=np.float64)
    y_pred = np.asarray(y_pred, dtype=np.float64)

    if len(y_true) == 0 or len(y_pred) == 0:
        return {
            "rmse": 0.0, "mae": 0.0, "mse": 0.0, "r2": 0.0,
            "nrmse": 0.0, "fit_percent": 0.0, "residual_mean": 0.0, "residual_std": 0.0
        }

    n = min(len(y_true), len(y_pred))
    yt = y_true[:n]
    yp = y_pred[:n]

    e = yt - yp
    mse = float(np.mean(e ** 2))
    rmse = float(np.sqrt(mse))
    mae = float(np.mean(np.abs(e)))

    ss_res = float(np.sum(e ** 2))
    y_mean = float(np.mean(yt))
    ss_tot = float(np.sum((yt - y_mean) ** 2))

    # In dynamic systems, R² can theoretically be negative if the model performs worse than a constant mean
    r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 1e-12 else 0.0

    y_range = float(np.max(yt) - np.min(yt))
    nrmse = (rmse / y_range) if y_range > 1e-12 else 0.0

    norm_e = float(np.linalg.norm(e))
    norm_ref = float(np.linalg.norm(yt - y_mean))
    fit_pct = max(0.0, 100.0 * (1.0 - norm_e / norm_ref)) if norm_ref > 1e-12 else 0.0

    res_mean = float(np.mean(e))
    res_std = float(np.std(e))

    return {
        "rmse": rmse,
        "mae": mae,
        "mse": mse,
        "r2": float(r2),
        "nrmse": nrmse,
        "fit_percent": fit_pct,
        "residual_mean": res_mean,
        "residual_std": res_std,
    }


class _MLP(nn.Module):
    def __init__(self, in_dim: int, hidden_dims: List[int], out_dim: int = 1):
        super().__init__()
        layers = []
        prev = in_dim
        for h in hidden_dims:
            layers.extend([nn.Linear(prev, h), nn.Tanh()])
            prev = h
        layers.append(nn.Linear(prev, out_dim))
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x).squeeze(-1)


def _train_mlp(model: nn.Module, X_train: np.ndarray, y_train: np.ndarray,
               X_val: np.ndarray, y_val: np.ndarray,
               epochs: int, lr: float, weight_decay: float,
               callback: Optional[Callable] = None, cancel_check: Optional[Callable] = None,
               pinn_reg: float = 0.0):
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    criterion = nn.MSELoss()

    Xt = torch.tensor(X_train, dtype=torch.float32)
    Yt = torch.tensor(y_train, dtype=torch.float32)
    Xv = torch.tensor(X_val, dtype=torch.float32)
    Yv = torch.tensor(y_val, dtype=torch.float32)

    best_val_loss = float('inf')
    patience = 25
    patience_cnt = 0

    report_interval = max(1, epochs // 40)

    for epoch in range(1, epochs + 1):
        if cancel_check and cancel_check():
            break

        model.train()
        optimizer.zero_grad()
        pred = model(Xt)
        loss = criterion(pred, Yt)

        # Physics-informed regularization penalty if enabled
        if pinn_reg > 0:
            # Penalize unsmooth accelerations: finite-difference derivative penalty
            diff_loss = torch.mean((pred[1:] - pred[:-1]) ** 2)
            loss = loss + pinn_reg * diff_loss

        loss.backward()
        optimizer.step()

        model.eval()
        with torch.no_grad():
            val_loss = criterion(model(Xv), Yv).item() if len(Xv) > 0 else loss.item()

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_cnt = 0
        else:
            patience_cnt += 1

        if callback and (epoch % report_interval == 0 or epoch == epochs):
            callback(epoch, float(loss.item()), float(val_loss))

        # Early stopping
        if patience_cnt >= patience and epoch > 30:
            if callback:
                callback(epoch, float(loss.item()), float(val_loss))
            break

    return model


class LinearARXModel:
    """Classical Linear AutoRegressive with eXogenous input (Ridge regression)."""
    def __init__(self):
        self.model = None
        self.lag = 3
        self.scaler = StandardScaler()

    def fit(self, X_train, y_train, X_val, y_val, config, callback=None, cancel_check=None):
        self.lag = config.get('lag_order', 3)
        u_tr = np.array(X_train)[:, 0] if np.array(X_train).ndim > 1 else np.array(X_train)
        y_tr = np.array(y_train)
        u_v = np.array(X_val)[:, 0] if np.array(X_val).ndim > 1 else np.array(X_val)
        y_v = np.array(y_val)

        Xf_t, Yf_t = _build_lagged_features(u_tr, y_tr, self.lag)
        if len(Xf_t) == 0:
            return

        Xf_t_s = self.scaler.fit_transform(Xf_t)
        self.model = Ridge(alpha=1.0)
        self.model.fit(Xf_t_s, Yf_t)

        # Validation stats
        Xf_v, Yf_v = _build_lagged_features(u_v, y_v, self.lag)
        Xf_v_s = self.scaler.transform(Xf_v) if len(Xf_v) > 0 else Xf_t_s[:1]
        Yf_v = Yf_v if len(Yf_v) > 0 else Yf_t[:1]

        train_mse = float(np.mean((Yf_t - self.model.predict(Xf_t_s)) ** 2))
        val_mse = float(np.mean((Yf_v - self.model.predict(Xf_v_s)) ** 2))

        epochs = config.get('epochs', 100)
        if callback:
            step = max(1, epochs // 10)
            for ep in range(step, epochs + 1, step):
                callback(ep, train_mse, val_mse)

    def predict_from_features(self, X_test, y_test):
        u = np.array(X_test)[:, 0] if np.array(X_test).ndim > 1 else np.array(X_test)
        Xf, Yf = _build_lagged_features(u, np.array(y_test), self.lag)
        if len(Xf) == 0:
            return np.array([]), np.array([])
        pred = self.model.predict(self.scaler.transform(Xf))
        return np.array(pred), np.array(Yf)

    def predict_recursive(self, u: np.ndarray, y_seed: np.ndarray, horizon: int) -> np.ndarray:
        if self.model is None:
            return np.zeros(horizon)
        u_seq = np.asarray(u).ravel().astype(np.float64)
        y_arr = np.asarray(y_seed).ravel().astype(np.float64)
        y_hist = [float(val) for val in y_arr[-self.lag:]] if len(y_arr) >= self.lag else [0.0] * self.lag
        preds = []

        for k in range(horizon):
            u_lags = [float(u_seq[max(0, k - j)]) if (k - j) >= 0 and len(u_seq) > 0 else 0.0 for j in range(1, self.lag + 1)]
            y_lags = [float(y_hist[-j]) for j in range(1, self.lag + 1)]
            feat = np.array(u_lags + y_lags, dtype=np.float64).reshape(1, -1)
            y_next = float(self.model.predict(self.scaler.transform(feat))[0])
            preds.append(y_next)
            y_hist.append(y_next)

        return np.array(preds)


class NARXModel:
    """Nonlinear AutoRegressive with eXogenous input (Neural NARX)."""
    def __init__(self):
        self.model = None
        self.lag = 3
        self.scaler_X = StandardScaler()
        self.scaler_y = StandardScaler()

    def fit(self, X_train, y_train, X_val, y_val, config, callback=None, cancel_check=None):
        torch.manual_seed(config.get('seed', 42))
        self.lag = config.get('lag_order', 3)
        u_tr = np.array(X_train)[:, 0] if np.array(X_train).ndim > 1 else np.array(X_train)
        y_tr = np.array(y_train)
        u_v = np.array(X_val)[:, 0] if np.array(X_val).ndim > 1 else np.array(X_val)
        y_v = np.array(y_val)

        Xt, Yt = _build_lagged_features(u_tr, y_tr, self.lag)
        Xv, Yv = _build_lagged_features(u_v, y_v, self.lag)

        if len(Xt) == 0:
            return

        Xt_s = self.scaler_X.fit_transform(Xt)
        Yt_s = self.scaler_y.fit_transform(Yt.reshape(-1, 1)).ravel()
        Xv_s = self.scaler_X.transform(Xv) if len(Xv) > 0 else Xt_s[:1]
        Yv_s = self.scaler_y.transform(Yv.reshape(-1, 1)).ravel() if len(Yv) > 0 else Yt_s[:1]

        hidden = config.get('hidden_dims', [32, 32])
        self.model = _MLP(self.lag * 2, hidden)
        _train_mlp(self.model, Xt_s, Yt_s, Xv_s, Yv_s,
                   config.get('epochs', 200), config.get('lr', 1e-3),
                   config.get('weight_decay', 1e-4), callback, cancel_check)

    def predict_from_features(self, X_test, y_test):
        u = np.array(X_test)[:, 0] if np.array(X_test).ndim > 1 else np.array(X_test)
        Xf, Yf = _build_lagged_features(u, np.array(y_test), self.lag)
        if len(Xf) == 0:
            return np.array([]), np.array([])
        Xf_s = self.scaler_X.transform(Xf)
        self.model.eval()
        with torch.no_grad():
            pred_s = self.model(torch.tensor(Xf_s, dtype=torch.float32)).numpy()
        pred = self.scaler_y.inverse_transform(pred_s.reshape(-1, 1)).ravel()
        return np.array(pred), np.array(Yf)

    def predict_recursive(self, u: np.ndarray, y_seed: np.ndarray, horizon: int) -> np.ndarray:
        if self.model is None:
            return np.zeros(horizon)
        u_seq = np.asarray(u).ravel().astype(np.float64)
        y_arr = np.asarray(y_seed).ravel().astype(np.float64)
        y_hist = [float(val) for val in y_arr[-self.lag:]] if len(y_arr) >= self.lag else [0.0] * self.lag
        preds = []
        self.model.eval()

        for k in range(horizon):
            u_lags = [float(u_seq[max(0, k - j)]) if (k - j) >= 0 and len(u_seq) > 0 else 0.0 for j in range(1, self.lag + 1)]
            y_lags = [float(y_hist[-j]) for j in range(1, self.lag + 1)]
            feat = np.array(u_lags + y_lags, dtype=np.float32).reshape(1, -1)
            feat_s = self.scaler_X.transform(feat)
            with torch.no_grad():
                p_s = self.model(torch.tensor(feat_s, dtype=torch.float32)).numpy()
            y_next = float(self.scaler_y.inverse_transform(p_s.reshape(-1, 1)).ravel()[0])
            preds.append(y_next)
            y_hist.append(y_next)

        return np.array(preds)


class NeuralNetworkModel:
    """Multilayer Perceptron (MLP) direct dynamic mapping."""
    def __init__(self):
        self.model = None
        self.lag = 3
        self.scaler_X = StandardScaler()
        self.scaler_y = StandardScaler()

    def fit(self, X_train, y_train, X_val, y_val, config, callback=None, cancel_check=None):
        torch.manual_seed(config.get('seed', 42))
        self.lag = config.get('lag_order', 3)
        u_tr = np.array(X_train)[:, 0] if np.array(X_train).ndim > 1 else np.array(X_train)
        y_tr = np.array(y_train)
        u_v = np.array(X_val)[:, 0] if np.array(X_val).ndim > 1 else np.array(X_val)
        y_v = np.array(y_val)

        Xt, Yt = _build_lagged_features(u_tr, y_tr, self.lag)
        Xv, Yv = _build_lagged_features(u_v, y_v, self.lag)
        if len(Xt) == 0:
            return

        Xt_s = self.scaler_X.fit_transform(Xt)
        Yt_s = self.scaler_y.fit_transform(Yt.reshape(-1, 1)).ravel()
        Xv_s = self.scaler_X.transform(Xv) if len(Xv) > 0 else Xt_s[:1]
        Yv_s = self.scaler_y.transform(Yv.reshape(-1, 1)).ravel() if len(Yv) > 0 else Yt_s[:1]

        hidden = config.get('hidden_dims', [48, 48])
        self.model = _MLP(self.lag * 2, hidden)
        _train_mlp(self.model, Xt_s, Yt_s, Xv_s, Yv_s,
                   config.get('epochs', 200), config.get('lr', 1e-3),
                   config.get('weight_decay', 1e-4), callback, cancel_check)

    def predict_from_features(self, X_test, y_test):
        u = np.array(X_test)[:, 0] if np.array(X_test).ndim > 1 else np.array(X_test)
        Xf, Yf = _build_lagged_features(u, np.array(y_test), self.lag)
        if len(Xf) == 0:
            return np.array([]), np.array([])
        Xf_s = self.scaler_X.transform(Xf)
        self.model.eval()
        with torch.no_grad():
            pred_s = self.model(torch.tensor(Xf_s, dtype=torch.float32)).numpy()
        pred = self.scaler_y.inverse_transform(pred_s.reshape(-1, 1)).ravel()
        return np.array(pred), np.array(Yf)

    def predict_recursive(self, u: np.ndarray, y_seed: np.ndarray, horizon: int) -> np.ndarray:
        if self.model is None:
            return np.zeros(horizon)
        u_seq = np.asarray(u).ravel().astype(np.float64)
        y_arr = np.asarray(y_seed).ravel().astype(np.float64)
        y_hist = [float(val) for val in y_arr[-self.lag:]] if len(y_arr) >= self.lag else [0.0] * self.lag
        preds = []
        self.model.eval()

        for k in range(horizon):
            u_lags = [float(u_seq[max(0, k - j)]) if (k - j) >= 0 and len(u_seq) > 0 else 0.0 for j in range(1, self.lag + 1)]
            y_lags = [float(y_hist[-j]) for j in range(1, self.lag + 1)]
            feat = np.array(u_lags + y_lags, dtype=np.float32).reshape(1, -1)
            feat_s = self.scaler_X.transform(feat)
            with torch.no_grad():
                p_s = self.model(torch.tensor(feat_s, dtype=torch.float32)).numpy()
            y_next = float(self.scaler_y.inverse_transform(p_s.reshape(-1, 1)).ravel()[0])
            preds.append(y_next)
            y_hist.append(y_next)

        return np.array(preds)


class RandomForestModel:
    """Random Forest Ensemble Regressor for nonlinear input-output identification."""
    def __init__(self):
        self.model = None
        self.lag = 3
        self.scaler = StandardScaler()

    def fit(self, X_train, y_train, X_val, y_val, config, callback=None, cancel_check=None):
        self.lag = config.get('lag_order', 3)
        u_tr = np.array(X_train)[:, 0] if np.array(X_train).ndim > 1 else np.array(X_train)
        y_tr = np.array(y_train)
        u_v = np.array(X_val)[:, 0] if np.array(X_val).ndim > 1 else np.array(X_val)
        y_v = np.array(y_val)

        Xt, Yt = _build_lagged_features(u_tr, y_tr, self.lag)
        if len(Xt) == 0:
            return
        Xt_s = self.scaler.fit_transform(Xt)

        n_estimators = config.get('n_estimators', 50)
        self.model = RandomForestRegressor(n_estimators=n_estimators, max_depth=12, random_state=42)
        self.model.fit(Xt_s, Yt)

        Xv, Yv = _build_lagged_features(u_v, y_v, self.lag)
        Xv_s = self.scaler.transform(Xv) if len(Xv) > 0 else Xt_s[:1]
        Yv = Yv if len(Yv) > 0 else Yt[:1]

        train_mse = float(np.mean((Yt - self.model.predict(Xt_s)) ** 2))
        val_mse = float(np.mean((Yv - self.model.predict(Xv_s)) ** 2))

        epochs = config.get('epochs', 100)
        if callback:
            step = max(1, epochs // 10)
            for ep in range(step, epochs + 1, step):
                callback(ep, train_mse, val_mse)

    def predict_from_features(self, X_test, y_test):
        u = np.array(X_test)[:, 0] if np.array(X_test).ndim > 1 else np.array(X_test)
        Xf, Yf = _build_lagged_features(u, np.array(y_test), self.lag)
        if len(Xf) == 0:
            return np.array([]), np.array([])
        pred = self.model.predict(self.scaler.transform(Xf))
        return np.array(pred), np.array(Yf)

    def predict_recursive(self, u: np.ndarray, y_seed: np.ndarray, horizon: int) -> np.ndarray:
        if self.model is None:
            return np.zeros(horizon)
        u_seq = np.asarray(u).ravel().astype(np.float64)
        y_arr = np.asarray(y_seed).ravel().astype(np.float64)
        y_hist = [float(val) for val in y_arr[-self.lag:]] if len(y_arr) >= self.lag else [0.0] * self.lag
        preds = []

        for k in range(horizon):
            u_lags = [float(u_seq[max(0, k - j)]) if (k - j) >= 0 and len(u_seq) > 0 else 0.0 for j in range(1, self.lag + 1)]
            y_lags = [float(y_hist[-j]) for j in range(1, self.lag + 1)]
            feat = np.array(u_lags + y_lags, dtype=np.float64).reshape(1, -1)
            y_next = float(self.model.predict(self.scaler.transform(feat))[0])
            preds.append(y_next)
            y_hist.append(y_next)

        return np.array(preds)


class SVRModel:
    """Support Vector Regression (SVR) with RBF kernel."""
    def __init__(self):
        self.model = None
        self.lag = 3
        self.scaler_X = StandardScaler()
        self.scaler_y = StandardScaler()

    def fit(self, X_train, y_train, X_val, y_val, config, callback=None, cancel_check=None):
        self.lag = config.get('lag_order', 3)
        u_tr = np.array(X_train)[:, 0] if np.array(X_train).ndim > 1 else np.array(X_train)
        y_tr = np.array(y_train)
        u_v = np.array(X_val)[:, 0] if np.array(X_val).ndim > 1 else np.array(X_val)
        y_v = np.array(y_val)

        Xt, Yt = _build_lagged_features(u_tr, y_tr, self.lag)
        if len(Xt) == 0:
            return
        Xt_s = self.scaler_X.fit_transform(Xt)
        Yt_s = self.scaler_y.fit_transform(Yt.reshape(-1, 1)).ravel()

        self.model = SVR(C=5.0, epsilon=0.05, kernel='rbf')
        self.model.fit(Xt_s, Yt_s)

        Xv, Yv = _build_lagged_features(u_v, y_v, self.lag)
        Xv_s = self.scaler_X.transform(Xv) if len(Xv) > 0 else Xt_s[:1]
        Yv = Yv if len(Yv) > 0 else Yt[:1]

        p_tr = self.scaler_y.inverse_transform(self.model.predict(Xt_s).reshape(-1, 1)).ravel()
        p_val = self.scaler_y.inverse_transform(self.model.predict(Xv_s).reshape(-1, 1)).ravel()
        train_mse = float(np.mean((Yt - p_tr) ** 2))
        val_mse = float(np.mean((Yv - p_val) ** 2))

        epochs = config.get('epochs', 100)
        if callback:
            step = max(1, epochs // 10)
            for ep in range(step, epochs + 1, step):
                callback(ep, train_mse, val_mse)

    def predict_from_features(self, X_test, y_test):
        u = np.array(X_test)[:, 0] if np.array(X_test).ndim > 1 else np.array(X_test)
        Xf, Yf = _build_lagged_features(u, np.array(y_test), self.lag)
        if len(Xf) == 0:
            return np.array([]), np.array([])
        p_s = self.model.predict(self.scaler_X.transform(Xf))
        pred = self.scaler_y.inverse_transform(p_s.reshape(-1, 1)).ravel()
        return np.array(pred), np.array(Yf)

    def predict_recursive(self, u: np.ndarray, y_seed: np.ndarray, horizon: int) -> np.ndarray:
        if self.model is None:
            return np.zeros(horizon)
        u_seq = np.asarray(u).ravel().astype(np.float64)
        y_arr = np.asarray(y_seed).ravel().astype(np.float64)
        y_hist = [float(val) for val in y_arr[-self.lag:]] if len(y_arr) >= self.lag else [0.0] * self.lag
        preds = []

        for k in range(horizon):
            u_lags = [float(u_seq[max(0, k - j)]) if (k - j) >= 0 and len(u_seq) > 0 else 0.0 for j in range(1, self.lag + 1)]
            y_lags = [float(y_hist[-j]) for j in range(1, self.lag + 1)]
            feat = np.array(u_lags + y_lags, dtype=np.float32).reshape(1, -1)
            p_s = self.model.predict(self.scaler_X.transform(feat))
            y_next = float(self.scaler_y.inverse_transform(p_s.reshape(-1, 1)).ravel()[0])
            preds.append(y_next)
            y_hist.append(y_next)

        return np.array(preds)


class HybridPhysicsAIModel:
    """
    Hybrid Physics + Residual Model:
    ŷ(t) = y_physics(t) + f_residual(x_t)
    First-principles baseline dynamics + Neural Network residual correction.
    """
    def __init__(self):
        self.theta = None  # Linear physical parameter vector [a1, b1]
        self.nn_residual = None
        self.lag = 3
        self.scaler_X = StandardScaler()
        self.scaler_r = StandardScaler()

    def _physics_predict_single(self, y_prev: float, u_curr: float) -> float:
        if self.theta is None:
            return 0.9 * y_prev + 0.1 * u_curr
        return float(self.theta[0] * y_prev + self.theta[1] * u_curr)

    def _physics_predict(self, u: np.ndarray, y: np.ndarray) -> np.ndarray:
        u_f = np.asarray(u).ravel()
        y_f = np.asarray(y).ravel()
        n = min(len(u_f), len(y_f))
        if n <= 1:
            return np.zeros(0)
        phi = np.column_stack([y_f[:n - 1], u_f[1:n]])
        if self.theta is not None:
            pred = phi @ self.theta
        else:
            pred = 0.9 * y_f[:n - 1] + 0.1 * u_f[1:n]
        return np.asarray(pred).ravel()

    def fit(self, X_train, y_train, X_val, y_val, config, callback=None, cancel_check=None):
        torch.manual_seed(config.get('seed', 42))
        self.lag = config.get('lag_order', 3)
        u_tr = np.array(X_train)[:, 0] if np.array(X_train).ndim > 1 else np.array(X_train)
        y_tr = np.array(y_train, dtype=np.float64)

        # 1. Physics baseline parameter estimation via Ordinary Least Squares
        if len(u_tr) > 2:
            phi = np.column_stack([y_tr[:-1], u_tr[1:]])
            target = y_tr[1:]
            self.theta, _, _, _ = np.linalg.lstsq(phi, target, rcond=None)
        else:
            self.theta = np.array([0.9, 0.1])

        # 2. Compute physics residuals
        y_ph = self._physics_predict(u_tr, y_tr)
        y_actual = y_tr[1:len(y_ph) + 1]
        residuals = y_actual - y_ph

        Xf, Rf = _build_lagged_features(u_tr[:len(residuals)], residuals, self.lag)
        if len(Xf) == 0:
            return

        # Validation set residuals
        u_v = np.array(X_val)[:, 0] if np.array(X_val).ndim > 1 else np.array(X_val)
        y_v = np.array(y_val, dtype=np.float64)
        y_ph_v = self._physics_predict(u_v, y_v)
        y_actual_v = y_v[1:len(y_ph_v) + 1]
        res_v = y_actual_v - y_ph_v
        Xfv, Rfv = _build_lagged_features(u_v[:len(res_v)], res_v, self.lag)

        Xf_s = self.scaler_X.fit_transform(Xf.astype(np.float32))
        Rf_s = self.scaler_r.fit_transform(Rf.reshape(-1, 1).astype(np.float32)).ravel()
        Xfv_s = self.scaler_X.transform(Xfv.astype(np.float32)) if len(Xfv) > 0 else Xf_s[:1]
        Rfv_s = self.scaler_r.transform(Rfv.reshape(-1, 1).astype(np.float32)).ravel() if len(Rfv) > 0 else Rf_s[:1]

        hidden = config.get('hidden_dims', [32, 32])
        self.nn_residual = _MLP(self.lag * 2, hidden)
        _train_mlp(self.nn_residual, Xf_s, Rf_s, Xfv_s, Rfv_s,
                   config.get('epochs', 200), config.get('lr', 1e-3),
                   config.get('weight_decay', 1e-4), callback, cancel_check)

    def predict_from_features(self, X_test, y_test):
        u = np.array(X_test)[:, 0] if np.array(X_test).ndim > 1 else np.array(X_test)
        y = np.array(y_test, dtype=np.float64)

        y_ph = self._physics_predict(u, y)
        y_actual = y[1:len(y_ph) + 1]

        if self.nn_residual is None:
            return y_ph, y_actual

        res_seed = y_actual - y_ph
        Xf, _ = _build_lagged_features(u[:len(res_seed)], res_seed, self.lag)
        if len(Xf) == 0:
            return y_ph[:len(y_actual)], y_actual

        Xf_s = self.scaler_X.transform(Xf.astype(np.float32))
        self.nn_residual.eval()
        with torch.no_grad():
            res_pred_s = self.nn_residual(torch.tensor(Xf_s, dtype=torch.float32)).numpy()
        res_pred = self.scaler_r.inverse_transform(res_pred_s.reshape(-1, 1)).ravel()

        n = min(len(y_ph), len(res_pred) + self.lag)
        y_pred = y_ph[self.lag:n] + res_pred[:n - self.lag]
        y_true = y_actual[self.lag:n]
        return np.array(y_pred), np.array(y_true)

    def predict_recursive(self, u: np.ndarray, y_seed: np.ndarray, horizon: int) -> np.ndarray:
        if self.nn_residual is None or self.theta is None:
            return np.zeros(horizon)
        u_seq = np.asarray(u).ravel().astype(np.float64)
        y_arr = np.asarray(y_seed).ravel().astype(np.float64)
        y_hist = [float(val) for val in y_arr[-self.lag:]] if len(y_arr) >= self.lag else [0.0] * self.lag
        res_hist = [0.0] * self.lag
        preds = []
        self.nn_residual.eval()

        for k in range(horizon):
            u_curr = float(u_seq[k]) if k < len(u_seq) else (float(u_seq[-1]) if len(u_seq) > 0 else 0.0)
            y_prev = float(y_hist[-1])

            # 1. Physical baseline contribution
            y_phys = self._physics_predict_single(y_prev, u_curr)

            # 2. Residual neural contribution
            u_lags = [float(u_seq[max(0, k - j)]) if (k - j) >= 0 and len(u_seq) > 0 else 0.0 for j in range(1, self.lag + 1)]
            r_lags = [float(res_hist[-j]) for j in range(1, self.lag + 1)]
            feat = np.array(u_lags + r_lags, dtype=np.float32).reshape(1, -1)
            feat_s = self.scaler_X.transform(feat)
            with torch.no_grad():
                res_s = self.nn_residual(torch.tensor(feat_s, dtype=torch.float32)).numpy()
            r_pred = float(self.scaler_r.inverse_transform(res_s.reshape(-1, 1)).ravel()[0])

            y_comb = y_phys + r_pred
            preds.append(y_comb)
            y_hist.append(y_comb)
            res_hist.append(r_pred)

        return np.array(preds)


class PINNInspiredModel:
    """Physics-Informed Neural Network (PINN-inspired with physical derivative regularizer)."""
    def __init__(self):
        self.model = None
        self.lag = 3
        self.scaler_X = StandardScaler()
        self.scaler_y = StandardScaler()

    def fit(self, X_train, y_train, X_val, y_val, config, callback=None, cancel_check=None):
        torch.manual_seed(config.get('seed', 42))
        self.lag = config.get('lag_order', 3)
        u_tr = np.array(X_train)[:, 0] if np.array(X_train).ndim > 1 else np.array(X_train)
        y_tr = np.array(y_train)
        u_v = np.array(X_val)[:, 0] if np.array(X_val).ndim > 1 else np.array(X_val)
        y_v = np.array(y_val)

        Xt, Yt = _build_lagged_features(u_tr, y_tr, self.lag)
        Xv, Yv = _build_lagged_features(u_v, y_v, self.lag)
        if len(Xt) == 0:
            return

        Xt_s = self.scaler_X.fit_transform(Xt)
        Yt_s = self.scaler_y.fit_transform(Yt.reshape(-1, 1)).ravel()
        Xv_s = self.scaler_X.transform(Xv) if len(Xv) > 0 else Xt_s[:1]
        Yv_s = self.scaler_y.transform(Yv.reshape(-1, 1)).ravel() if len(Yv) > 0 else Yt_s[:1]

        hidden = config.get('hidden_dims', [48, 48])
        self.model = _MLP(self.lag * 2, hidden)
        _train_mlp(self.model, Xt_s, Yt_s, Xv_s, Yv_s,
                   config.get('epochs', 200), config.get('lr', 1e-3),
                   config.get('weight_decay', 1e-4), callback, cancel_check,
                   pinn_reg=0.08)

    def predict_from_features(self, X_test, y_test):
        u = np.array(X_test)[:, 0] if np.array(X_test).ndim > 1 else np.array(X_test)
        Xf, Yf = _build_lagged_features(u, np.array(y_test), self.lag)
        if len(Xf) == 0:
            return np.array([]), np.array([])
        Xf_s = self.scaler_X.transform(Xf)
        self.model.eval()
        with torch.no_grad():
            pred_s = self.model(torch.tensor(Xf_s, dtype=torch.float32)).numpy()
        pred = self.scaler_y.inverse_transform(pred_s.reshape(-1, 1)).ravel()
        return np.array(pred), np.array(Yf)

    def predict_recursive(self, u: np.ndarray, y_seed: np.ndarray, horizon: int) -> np.ndarray:
        if self.model is None:
            return np.zeros(horizon)
        u_seq = np.asarray(u).ravel().astype(np.float64)
        y_arr = np.asarray(y_seed).ravel().astype(np.float64)
        y_hist = [float(val) for val in y_arr[-self.lag:]] if len(y_arr) >= self.lag else [0.0] * self.lag
        preds = []
        self.model.eval()

        for k in range(horizon):
            u_lags = [float(u_seq[max(0, k - j)]) if (k - j) >= 0 and len(u_seq) > 0 else 0.0 for j in range(1, self.lag + 1)]
            y_lags = [float(y_hist[-j]) for j in range(1, self.lag + 1)]
            feat = np.array(u_lags + y_lags, dtype=np.float32).reshape(1, -1)
            feat_s = self.scaler_X.transform(feat)
            with torch.no_grad():
                p_s = self.model(torch.tensor(feat_s, dtype=torch.float32)).numpy()
            y_next = float(self.scaler_y.inverse_transform(p_s.reshape(-1, 1)).ravel()[0])
            preds.append(y_next)
            y_hist.append(y_next)

        return np.array(preds)


class _TSKTakagiSugeno(nn.Module):
    """Takagi-Sugeno-Kang Fuzzy Neural Network with Gaussian membership functions."""
    def __init__(self, in_dim: int, num_rules: int = 4):
        super().__init__()
        self.in_dim = in_dim
        self.num_rules = num_rules
        self.centers = nn.Parameter(torch.randn(num_rules, in_dim) * 0.5)
        self.sigmas = nn.Parameter(torch.ones(num_rules, in_dim) * 1.0)
        self.consequents = nn.Linear(in_dim, num_rules)

    def forward(self, x):
        x_exp = x.unsqueeze(1).expand(-1, self.num_rules, -1)
        diff = (x_exp - self.centers) / (self.sigmas.abs() + 1e-5)
        memb = torch.exp(-0.5 * (diff ** 2))
        firing = torch.prod(memb, dim=-1) + 1e-8
        norm_firing = firing / firing.sum(dim=-1, keepdim=True)
        rule_outputs = self.consequents(x)
        out = torch.sum(norm_firing * rule_outputs, dim=-1)
        return out


class FuzzyNeuralModel:
    """Takagi-Sugeno Fuzzy-Neural Hybrid Model (ANFIS style)."""
    def __init__(self):
        self.model = None
        self.lag = 3
        self.scaler_X = StandardScaler()
        self.scaler_y = StandardScaler()

    def fit(self, X_train, y_train, X_val, y_val, config, callback=None, cancel_check=None):
        torch.manual_seed(config.get('seed', 42))
        self.lag = config.get('lag_order', 3)
        u_tr = np.array(X_train)[:, 0] if np.array(X_train).ndim > 1 else np.array(X_train)
        y_tr = np.array(y_train)
        u_v = np.array(X_val)[:, 0] if np.array(X_val).ndim > 1 else np.array(X_val)
        y_v = np.array(y_val)

        Xt, Yt = _build_lagged_features(u_tr, y_tr, self.lag)
        Xv, Yv = _build_lagged_features(u_v, y_v, self.lag)
        if len(Xt) == 0:
            return

        Xt_s = self.scaler_X.fit_transform(Xt)
        Yt_s = self.scaler_y.fit_transform(Yt.reshape(-1, 1)).ravel()
        Xv_s = self.scaler_X.transform(Xv) if len(Xv) > 0 else Xt_s[:1]
        Yv_s = self.scaler_y.transform(Yv.reshape(-1, 1)).ravel() if len(Yv) > 0 else Yt_s[:1]

        num_rules = config.get('num_rules', 4)
        self.model = _TSKTakagiSugeno(self.lag * 2, num_rules=num_rules)
        _train_mlp(self.model, Xt_s, Yt_s, Xv_s, Yv_s,
                   config.get('epochs', 200), config.get('lr', 1e-2),
                   config.get('weight_decay', 1e-4), callback, cancel_check)

    def predict_from_features(self, X_test, y_test):
        u = np.array(X_test)[:, 0] if np.array(X_test).ndim > 1 else np.array(X_test)
        Xf, Yf = _build_lagged_features(u, np.array(y_test), self.lag)
        if len(Xf) == 0:
            return np.array([]), np.array([])
        Xf_s = self.scaler_X.transform(Xf)
        self.model.eval()
        with torch.no_grad():
            pred_s = self.model(torch.tensor(Xf_s, dtype=torch.float32)).numpy()
        pred = self.scaler_y.inverse_transform(pred_s.reshape(-1, 1)).ravel()
        return np.array(pred), np.array(Yf)

    def predict_recursive(self, u: np.ndarray, y_seed: np.ndarray, horizon: int) -> np.ndarray:
        if self.model is None:
            return np.zeros(horizon)
        u_seq = np.asarray(u).ravel().astype(np.float64)
        y_arr = np.asarray(y_seed).ravel().astype(np.float64)
        y_hist = [float(val) for val in y_arr[-self.lag:]] if len(y_arr) >= self.lag else [0.0] * self.lag
        preds = []
        self.model.eval()

        for k in range(horizon):
            u_lags = [float(u_seq[max(0, k - j)]) if (k - j) >= 0 and len(u_seq) > 0 else 0.0 for j in range(1, self.lag + 1)]
            y_lags = [float(y_hist[-j]) for j in range(1, self.lag + 1)]
            feat = np.array(u_lags + y_lags, dtype=np.float32).reshape(1, -1)
            feat_s = self.scaler_X.transform(feat)
            with torch.no_grad():
                p_s = self.model(torch.tensor(feat_s, dtype=torch.float32)).numpy()
            y_next = float(self.scaler_y.inverse_transform(p_s.reshape(-1, 1)).ravel()[0])
            preds.append(y_next)
            y_hist.append(y_next)

        return np.array(preds)


class _LSTMNet(nn.Module):
    def __init__(self, in_dim: int, hidden_dim: int = 32, num_layers: int = 1):
        super().__init__()
        self.lstm = nn.LSTM(in_dim, hidden_dim, num_layers=num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_dim, 1)

    def forward(self, x):
        # x: [batch, seq_len, in_dim]
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :]).squeeze(-1)


class LSTMSequenceModel:
    """LSTM recurrent sequence identification model."""
    def __init__(self):
        self.model = None
        self.lag = 5
        self.scaler_X = StandardScaler()
        self.scaler_y = StandardScaler()

    def _build_sequences(self, u: np.ndarray, y: np.ndarray, seq_len: int):
        n = len(u)
        X, Y = [], []
        for i in range(seq_len, n):
            seq = np.column_stack([u[i - seq_len:i], y[i - seq_len:i]])
            X.append(seq)
            Y.append(y[i])
        return np.array(X, dtype=np.float32), np.array(Y, dtype=np.float32)

    def fit(self, X_train, y_train, X_val, y_val, config, callback=None, cancel_check=None):
        torch.manual_seed(config.get('seed', 42))
        self.lag = config.get('lag_order', 5)
        u_tr = np.array(X_train)[:, 0] if np.array(X_train).ndim > 1 else np.array(X_train)
        y_tr = np.array(y_train)
        u_v = np.array(X_val)[:, 0] if np.array(X_val).ndim > 1 else np.array(X_val)
        y_v = np.array(y_val)

        Xt, Yt = self._build_sequences(u_tr, y_tr, self.lag)
        Xv, Yv = self._build_sequences(u_v, y_v, self.lag)
        if len(Xt) == 0:
            return

        # Normalize across features
        B, L, D = Xt.shape
        Xt_flat = Xt.reshape(-1, D)
        Xt_norm = self.scaler_X.fit_transform(Xt_flat).reshape(B, L, D)
        Yt_norm = self.scaler_y.fit_transform(Yt.reshape(-1, 1)).ravel()

        if len(Xv) > 0:
            Bv, Lv, Dv = Xv.shape
            Xv_norm = self.scaler_X.transform(Xv.reshape(-1, Dv)).reshape(Bv, Lv, Dv)
            Yv_norm = self.scaler_y.transform(Yv.reshape(-1, 1)).ravel()
        else:
            Xv_norm, Yv_norm = Xt_norm[:1], Yt_norm[:1]

        self.model = _LSTMNet(in_dim=2, hidden_dim=32)
        optimizer = torch.optim.Adam(self.model.parameters(), lr=config.get('lr', 0.002))
        criterion = nn.MSELoss()

        Xt_t = torch.tensor(Xt_norm, dtype=torch.float32)
        Yt_t = torch.tensor(Yt_norm, dtype=torch.float32)
        Xv_t = torch.tensor(Xv_norm, dtype=torch.float32)
        Yv_t = torch.tensor(Yv_norm, dtype=torch.float32)

        epochs = config.get('epochs', 150)
        report_interval = max(1, epochs // 30)

        for ep in range(1, epochs + 1):
            if cancel_check and cancel_check():
                break
            self.model.train()
            optimizer.zero_grad()
            p = self.model(Xt_t)
            loss = criterion(p, Yt_t)
            loss.backward()
            optimizer.step()

            self.model.eval()
            with torch.no_grad():
                val_loss = criterion(self.model(Xv_t), Yv_t).item()

            if callback and (ep % report_interval == 0 or ep == epochs):
                callback(ep, float(loss.item()), float(val_loss))

    def predict_from_features(self, X_test, y_test):
        u = np.array(X_test)[:, 0] if np.array(X_test).ndim > 1 else np.array(X_test)
        y = np.array(y_test)
        Xt, Yt = self._build_sequences(u, y, self.lag)
        if len(Xt) == 0:
            return np.array([]), np.array([])

        B, L, D = Xt.shape
        Xt_norm = self.scaler_X.transform(Xt.reshape(-1, D)).reshape(B, L, D)
        self.model.eval()
        with torch.no_grad():
            p_s = self.model(torch.tensor(Xt_norm, dtype=torch.float32)).numpy()
        pred = self.scaler_y.inverse_transform(p_s.reshape(-1, 1)).ravel()
        return np.array(pred), np.array(Yt)

    def predict_recursive(self, u: np.ndarray, y_seed: np.ndarray, horizon: int) -> np.ndarray:
        if self.model is None:
            return np.zeros(horizon)
        u_seq = np.asarray(u).ravel().astype(np.float64)
        y_arr = np.asarray(y_seed).ravel().astype(np.float64)
        y_hist = [float(val) for val in y_arr[-self.lag:]] if len(y_arr) >= self.lag else [0.0] * self.lag
        preds = []
        self.model.eval()

        for k in range(horizon):
            u_seq_window = [float(u_seq[max(0, k - self.lag + j)]) if (k - self.lag + j) >= 0 and len(u_seq) > 0 else 0.0 for j in range(self.lag)]
            y_seq_window = [float(v) for v in y_hist[-self.lag:]]
            seq = np.column_stack([u_seq_window, y_seq_window]).astype(np.float32)
            seq_norm = self.scaler_X.transform(seq).reshape(1, self.lag, 2)
            with torch.no_grad():
                p_s = self.model(torch.tensor(seq_norm, dtype=torch.float32)).numpy()
            y_next = float(self.scaler_y.inverse_transform(p_s.reshape(-1, 1)).ravel()[0])
            preds.append(y_next)
            y_hist.append(y_next)

        return np.array(preds)


MODEL_REGISTRY = {
    "linear_arx": LinearARXModel,
    "narx": NARXModel,
    "neural_network": NeuralNetworkModel,
    "random_forest": RandomForestModel,
    "svr": SVRModel,
    "hybrid_physics_ai": HybridPhysicsAIModel,
    "pinn_inspired": PINNInspiredModel,
    "fuzzy_neural": FuzzyNeuralModel,
    "lstm_sequence": LSTMSequenceModel,
}
