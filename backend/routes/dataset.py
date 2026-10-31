from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import io
import numpy as np

router = APIRouter()


def _safe_float(v):
    try:
        f = float(v)
        return f if (f == f and abs(f) < 1e15) else None
    except:
        return None


@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    try:
        import pandas as pd
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Failed to parse CSV: {e}")

    if df.empty:
        raise HTTPException(400, "CSV file is empty")

    columns = df.columns.tolist()
    stats = {}
    for col in columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            stats[col] = {
                "min": float(df[col].min()),
                "max": float(df[col].max()),
                "mean": float(df[col].mean()),
                "std": float(df[col].std()),
                "missing": int(df[col].isna().sum()),
            }
        else:
            stats[col] = {"missing": int(df[col].isna().sum())}

    all_records = df.fillna(0.0).to_dict(orient="records")
    preview = all_records[:30]
    return {
        "columns": columns,
        "shape": list(df.shape),
        "data": all_records,
        "preview": preview,
        "stats": stats,
    }


class GenerateRequest(BaseModel):
    system: str
    params: Dict[str, Any] = {}
    add_noise: bool = False
    noise_level: float = 0.01


@router.post("/generate")
def generate_dataset(req: GenerateRequest):
    from simulators import SIMULATORS
    fn = SIMULATORS.get(req.system)
    if fn is None:
        raise HTTPException(400, f"Unknown system: {req.system}")
    try:
        result = fn(**{k: v for k, v in req.params.items()})
        y = np.array(result['y'])
        if req.add_noise:
            y = y + np.random.normal(0, req.noise_level * (np.std(y) + 1e-9), size=len(y))
        result['y'] = y.tolist()
        for key in ('t', 'u', 'y'):
            result[key] = [float(v) if (v == v and abs(v) < 1e15) else 0.0 for v in result[key]]
        all_rows = [{"time": result['t'][i], "u": result['u'][i], "y": result['y'][i]} for i in range(len(result['t']))]
        return {
            **result,
            "columns": ["time", "u", "y"],
            "shape": [len(result['t']), 3],
            "data": all_rows,
            "preview": all_rows[:30],
            "stats": {
                "u": {"min": float(min(result['u'])), "max": float(max(result['u'])), "mean": float(np.mean(result['u'])), "std": float(np.std(result['u'])), "missing": 0},
                "y": {"min": float(min(result['y'])), "max": float(max(result['y'])), "mean": float(np.mean(result['y'])), "std": float(np.std(result['y'])), "missing": 0},
            }
        }
    except Exception as e:
        raise HTTPException(500, str(e))


class PreprocessRequest(BaseModel):
    data: List[Dict[str, Any]]
    input_cols: List[str]
    output_col: str
    normalize: bool = True
    train_ratio: float = 0.6
    val_ratio: float = 0.2
    test_ratio: float = 0.2
    handle_missing: str = "drop"


@router.post("/preprocess")
def preprocess(req: PreprocessRequest):
    import pandas as pd
    from sklearn.preprocessing import MinMaxScaler

    df = pd.DataFrame(req.data)
    all_cols = req.input_cols + [req.output_col]
    for col in all_cols:
        if col not in df.columns:
            raise HTTPException(400, f"Column '{col}' not found in dataset")

    # Keep only needed columns
    df = df[all_cols].copy()

    # Handle missing values
    if req.handle_missing == 'drop':
        df = df.dropna()
    elif req.handle_missing == 'ffill':
        df = df.ffill().dropna()
    elif req.handle_missing == 'interpolate':
        df = df.interpolate().dropna()

    if len(df) < 10:
        raise HTTPException(400, "Dataset too small after cleaning (< 10 rows)")

    n = len(df)
    train_end = int(n * req.train_ratio)
    val_end = int(n * (req.train_ratio + req.val_ratio))

    X = df[req.input_cols].values.astype(np.float32)
    y = df[req.output_col].values.astype(np.float32)

    scaler_params = {}
    if req.normalize:
        scaler_X = MinMaxScaler()
        X = scaler_X.fit_transform(X)
        scaler_y = MinMaxScaler()
        y = scaler_y.fit_transform(y.reshape(-1, 1)).ravel()
        scaler_params = {
            "X_min": scaler_X.data_min_.tolist(),
            "X_max": scaler_X.data_max_.tolist(),
            "y_min": float(scaler_y.data_min_[0]),
            "y_max": float(scaler_y.data_max_[0]),
        }

    return {
        "X_train": X[:train_end].tolist(),
        "y_train": y[:train_end].tolist(),
        "X_val": X[train_end:val_end].tolist(),
        "y_val": y[train_end:val_end].tolist(),
        "X_test": X[val_end:].tolist(),
        "y_test": y[val_end:].tolist(),
        "scaler_params": scaler_params,
        "shapes": {
            "train": train_end,
            "val": val_end - train_end,
            "test": n - val_end,
        }
    }
