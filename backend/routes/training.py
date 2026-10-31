from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from training_manager import training_manager
from models import compute_metrics, MODEL_REGISTRY
import numpy as np

router = APIRouter()


class TrainingRequest(BaseModel):
    model_type: str
    X_train: List[List[float]]
    y_train: List[float]
    X_val: List[List[float]]
    y_val: List[float]
    X_test: List[List[float]]
    y_test: List[float]
    config: Dict[str, Any] = {}


class ForecastRequest(BaseModel):
    job_id: str
    u_future: List[float]
    y_seed: List[float]
    horizon: int = 50


class StressTestRequest(BaseModel):
    noise_levels: Optional[List[float]] = [0.0, 0.02, 0.05, 0.1, 0.2]


@router.get("/models")
def list_available_models():
    return [
        {
            "id": "linear_arx",
            "name": "Linear ARX Baseline",
            "family": "Classical",
            "description": "Linear AutoRegressive with eXogenous input. Classical baseline with Ridge regularization.",
        },
        {
            "id": "narx",
            "name": "NARX Neural Network",
            "family": "Classical / Neural",
            "description": "Nonlinear AutoRegressive with eXogenous inputs using multilayer neural mapping.",
        },
        {
            "id": "neural_network",
            "name": "Multilayer Perceptron (MLP)",
            "family": "Machine Learning",
            "description": "Standard deep MLP neural network with hyperbolic tangent activations.",
        },
        {
            "id": "random_forest",
            "name": "Random Forest Regressor",
            "family": "Machine Learning",
            "description": "Ensemble decision tree regression on lagged feature representations.",
        },
        {
            "id": "svr",
            "name": "Support Vector Regression (SVR)",
            "family": "Machine Learning",
            "description": "Kernel-based SVR with Radial Basis Function (RBF) margin minimization.",
        },
        {
            "id": "hybrid_physics_ai",
            "name": "Hybrid Physics + Residual AI",
            "family": "Hybrid AI",
            "description": "First-principles physical baseline model augmented with neural residual error learning.",
        },
        {
            "id": "pinn_inspired",
            "name": "Physics-Informed Neural Network (PINN)",
            "family": "Hybrid AI",
            "description": "Neural network with soft physical differential regularizer penalizing non-physical derivative jumps.",
        },
        {
            "id": "fuzzy_neural",
            "name": "Takagi-Sugeno Fuzzy-Neural",
            "family": "Hybrid AI",
            "description": "Adaptive Neuro-Fuzzy Inference System (ANFIS) with Gaussian membership functions.",
        },
        {
            "id": "lstm_sequence",
            "name": "LSTM Recurrent Sequence Model",
            "family": "Deep Sequence Learning",
            "description": "Long Short-Term Memory network capturing temporal dynamics over sliding windows.",
        },
    ]


@router.post("/start")
def start_training(req: TrainingRequest):
    if req.model_type not in MODEL_REGISTRY:
        raise HTTPException(400, f"Unknown model type: {req.model_type}. Allowed: {list(MODEL_REGISTRY.keys())}")
    if len(req.X_train) < 5:
        raise HTTPException(400, "Training set too small (< 5 samples)")

    job_id = req.config.get('job_id') or f"{req.model_type}_{int(__import__('time').time() * 1000)}"

    training_manager.start_training(
        job_id=job_id,
        model_type=req.model_type,
        X_train=req.X_train,
        y_train=req.y_train,
        X_val=req.X_val,
        y_val=req.y_val,
        X_test=req.X_test,
        y_test=req.y_test,
        config=req.config,
    )
    return {"job_id": job_id, "status": "started", "model_type": req.model_type}


@router.get("/status/{job_id}")
def get_status(job_id: str):
    status = training_manager.get_status(job_id)
    if status is None:
        raise HTTPException(404, f"Job {job_id} not found")
    return status


@router.post("/cancel/{job_id}")
def cancel_job(job_id: str):
    training_manager.cancel_job(job_id)
    return {"status": "cancel_requested"}


@router.get("/predict/{job_id}")
def predict(job_id: str):
    status = training_manager.get_status(job_id)
    if status is None:
        raise HTTPException(404, "Job not found")
    if status['status'] != 'complete':
        raise HTTPException(400, f"Job not complete (status: {status['status']})")

    job = training_manager._jobs.get(job_id)
    if job is None or job.get('model') is None:
        raise HTTPException(500, "Model not available")

    # Retrieve stored test data and run prediction
    model = job['model']
    X_test = job.get('_X_test', [])
    y_test = job.get('_y_test', [])

    if not X_test:
        pred_cache = training_manager.get_predictions(job_id)
        if pred_cache:
            return {**pred_cache, "metrics": status['metrics']}
        raise HTTPException(500, "Test data not available")

    y_pred, y_true = model.predict_from_features(X_test, y_test)
    metrics = compute_metrics(np.array(y_true), np.array(y_pred)) if len(y_pred) > 0 else {}

    return {
        "y_pred": [float(v) for v in y_pred],
        "y_test": [float(v) for v in y_true],
        "metrics": metrics,
    }


@router.post("/forecast")
def forecast(req: ForecastRequest):
    try:
        res = training_manager.recursive_forecast(
            job_id=req.job_id,
            u_future=req.u_future,
            y_seed=req.y_seed,
            horizon=req.horizon,
        )
        return res
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Forecasting error: {e}")


@router.post("/stress-test/{job_id}")
def stress_test(job_id: str, req: StressTestRequest = None):
    noise_levels = req.noise_levels if req and req.noise_levels else [0.0, 0.02, 0.05, 0.1, 0.2]
    try:
        res = training_manager.stress_test_noise(job_id=job_id, noise_levels=noise_levels)
        return {"job_id": job_id, "stress_test": res}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Stress test error: {e}")
