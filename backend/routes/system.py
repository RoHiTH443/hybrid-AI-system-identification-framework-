from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from simulators import SIMULATORS, SYSTEM_INFO
from core.optimization import optimize_system_parameters

router = APIRouter()


class SimulateRequest(BaseModel):
    system: str
    params: Dict[str, Any] = {}


class OptimizeRequest(BaseModel):
    system: str
    u: List[float]
    y_target: List[float]
    t_end: float = 20.0
    dt: float = 0.05
    initial_params: Optional[Dict[str, float]] = None
    param_bounds: Optional[Dict[str, List[float]]] = None


@router.get("/systems")
def list_systems():
    return SYSTEM_INFO


@router.get("/input-types")
def input_types():
    return [
        {"id": "sine", "label": "Sinusoidal"},
        {"id": "step", "label": "Step"},
        {"id": "chirp", "label": "Chirp (Sweep)"},
        {"id": "prbs", "label": "PRBS (Pseudo-Random Binary)"},
    ]


@router.post("/simulate")
def simulate(req: SimulateRequest):
    fn = SIMULATORS.get(req.system)
    if fn is None:
        raise HTTPException(400, f"Unknown system: {req.system}")
    try:
        result = fn(**{k: v for k, v in req.params.items() if not isinstance(v, dict)})
        for key in ('t', 'u', 'y'):
            result[key] = [float(v) if (v == v and abs(v) < 1e15) else 0.0 for v in result[key]]
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Simulation error: {e}")


@router.post("/optimize")
def optimize(req: OptimizeRequest):
    try:
        res = optimize_system_parameters(
            system_id=req.system,
            u=req.u,
            y_target=req.y_target,
            t_end=req.t_end,
            dt=req.dt,
            initial_params=req.initial_params,
            param_bounds=req.param_bounds,
        )
        return res
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Optimization error: {e}")

