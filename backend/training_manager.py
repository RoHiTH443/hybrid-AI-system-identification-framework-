import threading
import time
from typing import Dict, Any, Optional, Callable, List
import numpy as np
from models import MODEL_REGISTRY, compute_metrics


class TrainingManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._jobs: Dict[str, Dict] = {}
            cls._instance._cancel_events: Dict[str, threading.Event] = {}
        return cls._instance

    def start_training(self, job_id: str, model_type: str,
                       X_train, y_train, X_val, y_val, X_test, y_test, config: Dict):
        if job_id in self._jobs and self._jobs[job_id]['status'] in ('running', 'pending'):
            return

        cancel_event = threading.Event()
        self._cancel_events[job_id] = cancel_event

        epochs = config.get('epochs', 200)
        self._jobs[job_id] = {
            'job_id': job_id,
            'model_type': model_type,
            'status': 'pending',
            'epoch': 0,
            'total_epochs': epochs,
            'train_loss': 0.0,
            'val_loss': 0.0,
            'elapsed': 0.0,
            'metrics': None,
            'model': None,
            'error': None,
            '_X_test': X_test,
            '_y_test': y_test,
            '_X_train': X_train,
            '_y_train': y_train,
            '_config': config,
            'history': {'epochs': [], 'train_loss': [], 'val_loss': []},
        }

        def train_thread():
            job = self._jobs[job_id]
            job['status'] = 'running'
            start = time.time()

            try:
                ModelClass = MODEL_REGISTRY.get(model_type)
                if ModelClass is None:
                    raise ValueError(f"Unknown model type: {model_type}")

                model = ModelClass()

                def callback(epoch: int, train_loss: float, val_loss: float):
                    job['epoch'] = epoch
                    job['train_loss'] = float(train_loss)
                    job['val_loss'] = float(val_loss)
                    job['elapsed'] = float(time.time() - start)
                    job['history']['epochs'].append(int(epoch))
                    job['history']['train_loss'].append(float(train_loss))
                    job['history']['val_loss'].append(float(val_loss))

                def cancel_check():
                    return cancel_event.is_set()

                model.fit(
                    X_train, y_train, X_val, y_val,
                    config, callback=callback, cancel_check=cancel_check
                )

                if cancel_event.is_set():
                    job['status'] = 'cancelled'
                    return

                # Evaluate on test set
                y_pred, y_true = model.predict_from_features(X_test, y_test)
                if len(y_pred) > 0:
                    metrics = compute_metrics(np.array(y_true), np.array(y_pred))
                else:
                    metrics = {
                        'rmse': 0.0, 'mae': 0.0, 'mse': 0.0, 'r2': 0.0,
                        'nrmse': 0.0, 'fit_percent': 0.0, 'residual_mean': 0.0, 'residual_std': 0.0
                    }

                job['metrics'] = metrics
                job['model'] = model
                job['status'] = 'complete'
                job['epoch'] = epochs
                job['elapsed'] = float(time.time() - start)
                self.store_test_predictions(job_id, y_pred, y_true)

            except Exception as e:
                job['status'] = 'failed'
                job['error'] = str(e)
                job['elapsed'] = float(time.time() - start)

        t = threading.Thread(target=train_thread, daemon=True)
        t.start()

    def get_status(self, job_id: str) -> Optional[Dict]:
        if job_id not in self._jobs:
            return None
        j = self._jobs[job_id]
        return {
            'job_id': job_id,
            'model_type': j['model_type'],
            'status': j['status'],
            'epoch': j['epoch'],
            'total_epochs': j['total_epochs'],
            'train_loss': j['train_loss'],
            'val_loss': j['val_loss'],
            'elapsed': j['elapsed'],
            'metrics': j['metrics'],
            'error': j['error'],
            'history': j.get('history', {'epochs': [], 'train_loss': [], 'val_loss': []}),
        }

    def cancel_job(self, job_id: str):
        if job_id in self._cancel_events:
            self._cancel_events[job_id].set()

    def get_predictions(self, job_id: str):
        if job_id not in self._jobs:
            return None
        j = self._jobs[job_id]
        if j['status'] != 'complete' or j['model'] is None:
            return None
        return j.get('_last_pred')

    def store_test_predictions(self, job_id: str, y_pred, y_test):
        if job_id in self._jobs:
            self._jobs[job_id]['_last_pred'] = {
                'y_pred': [float(v) for v in y_pred],
                'y_test': [float(v) for v in y_test],
            }

    def recursive_forecast(self, job_id: str, u_future: List[float], y_seed: List[float], horizon: int) -> Dict[str, Any]:
        """Perform true multi-step recursive forecasting."""
        if job_id not in self._jobs:
            raise ValueError(f"Job {job_id} not found")
        job = self._jobs[job_id]
        model = job.get('model')
        if model is None:
            raise ValueError(f"Model for job {job_id} is not trained")

        u_arr = np.asarray(u_future, dtype=np.float64).ravel()
        y_seed_arr = np.asarray(y_seed, dtype=np.float64).ravel()
        horizon = max(1, int(horizon))
        if len(u_arr) == 0:
            u_arr = np.zeros(horizon)
        elif len(u_arr) < horizon:
            u_arr = np.pad(u_arr, (0, horizon - len(u_arr)), mode='edge')

        if hasattr(model, 'predict_recursive'):
            preds = model.predict_recursive(u_arr, y_seed_arr, horizon)
        else:
            # Fallback
            preds = model.predict_from_features(u_arr.reshape(-1, 1), np.zeros(len(u_arr)))[0][:horizon]

        # Uncertainty: estimated from test residual standard deviation
        res_std = float(job.get('metrics', {}).get('residual_std', 0.05)) if job.get('metrics') else 0.05
        # Uncertainty grows with prediction horizon step k: sigma(k) = sigma_0 * sqrt(1 + 0.1 * k)
        k_indices = np.arange(len(preds))
        uncertainty = res_std * np.sqrt(1.0 + 0.08 * k_indices)
        lower_bound = (preds - 1.96 * uncertainty).tolist()
        upper_bound = (preds + 1.96 * uncertainty).tolist()

        return {
            "forecast": [float(v) for v in preds],
            "lower_95": [float(v) for v in lower_bound],
            "upper_95": [float(v) for v in upper_bound],
            "residual_std": res_std,
            "horizon": len(preds),
        }

    def stress_test_noise(self, job_id: str, noise_levels: List[float] = [0.0, 0.02, 0.05, 0.1, 0.2]) -> List[Dict[str, Any]]:
        """Evaluate model robustness against increasing sensor noise."""
        if job_id not in self._jobs:
            raise ValueError(f"Job {job_id} not found")
        job = self._jobs[job_id]
        model = job.get('model')
        X_test = job.get('_X_test', [])
        y_test = job.get('_y_test', [])
        if model is None or len(X_test) == 0:
            raise ValueError("Test data or model unavailable")

        results = []
        y_test_arr = np.asarray(y_test, dtype=np.float64)
        signal_std = float(np.std(y_test_arr)) if len(y_test_arr) > 0 else 1.0

        for nl in noise_levels:
            noise = np.random.normal(0, nl * signal_std, size=len(y_test_arr))
            y_noisy = y_test_arr + noise
            y_pred, y_true = model.predict_from_features(X_test, y_noisy)
            if len(y_pred) > 0:
                m = compute_metrics(np.array(y_true), np.array(y_pred))
            else:
                m = {'rmse': 0.0, 'mae': 0.0, 'r2': 0.0, 'fit_percent': 0.0}
            results.append({
                "noise_ratio": float(nl),
                "noise_pct": float(nl * 100),
                "rmse": float(m["rmse"]),
                "mae": float(m["mae"]),
                "r2": float(m["r2"]),
                "fit_percent": float(m["fit_percent"]),
            })
        return results


training_manager = TrainingManager()
