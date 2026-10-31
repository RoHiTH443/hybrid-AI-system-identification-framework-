import pytest
import numpy as np
from simulators import SIMULATORS, SYSTEM_INFO
from models import MODEL_REGISTRY, compute_metrics, _build_lagged_features


def test_all_simulators():
    for sys_id, fn in SIMULATORS.items():
        res = fn(t_end=2.0, dt=0.05)
        assert "t" in res
        assert "u" in res
        assert "y" in res
        assert len(res["t"]) > 0
        assert len(res["t"]) == len(res["u"]) == len(res["y"])


def test_metrics_computation():
    y_true = np.array([1.0, 2.0, 3.0, 4.0])
    y_pred = np.array([1.1, 1.9, 3.1, 3.9])
    m = compute_metrics(y_true, y_pred)
    assert m["rmse"] > 0
    assert m["r2"] > 0.95
    assert m["fit_percent"] > 90.0


def test_models_fit_and_recursive_forecast():
    # Synthetic dataset
    t = np.linspace(0, 5, 100)
    u = np.sin(2 * np.pi * 0.5 * t)
    y = np.tanh(u) + 0.5 * np.cos(t)

    X_train = u[:70].reshape(-1, 1)
    y_train = y[:70]
    X_val = u[70:85].reshape(-1, 1)
    y_val = y[70:85]
    X_test = u[85:].reshape(-1, 1)
    y_test = y[85:]

    config = {'epochs': 10, 'lag_order': 2, 'hidden_dims': [16, 16], 'lr': 0.01, 'num_rules': 3, 'n_estimators': 10}

    # Test all 9 registered models
    for model_name, ModelClass in MODEL_REGISTRY.items():
        model = ModelClass()
        model.fit(X_train, y_train, X_val, y_val, config)

        pred, actual = model.predict_from_features(X_test, y_test)
        assert len(pred) > 0, f"{model_name} returned empty predictions"

        # Test recursive forecasting with 1D u
        forecast_1d = model.predict_recursive(u[85:], y[:2], horizon=10)
        assert len(forecast_1d) == 10, f"{model_name} failed 1D recursive forecast"
        assert not np.isnan(forecast_1d).any(), f"{model_name} produced NaNs in 1D"

        # Test recursive forecasting with 2D u (shape N, 1)
        forecast_2d = model.predict_recursive(u[85:].reshape(-1, 1), y[:2].reshape(-1, 1), horizon=10)
        assert len(forecast_2d) == 10, f"{model_name} failed 2D recursive forecast"
        assert not np.isnan(forecast_2d).any(), f"{model_name} produced NaNs in 2D"
