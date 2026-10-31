import numpy as np
from scipy.optimize import minimize
from typing import Dict, Any, List
from simulators import SIMULATORS, SYSTEM_INFO


def optimize_system_parameters(
    system_id: str,
    u: List[float],
    y_target: List[float],
    t_end: float = 20.0,
    dt: float = 0.05,
    initial_params: Dict[str, float] = None,
    param_bounds: Dict[str, List[float]] = None,
) -> Dict[str, Any]:
    """
    Fits system physical parameters theta to match y_target given input u(t).
    Uses L-BFGS-B optimization on MSE cost function.
    """
    if system_id not in SIMULATORS:
        raise ValueError(f"Unknown system ID: {system_id}")

    sim_func = SIMULATORS[system_id]
    u_arr = np.array(u, dtype=np.float64)
    y_target_arr = np.array(y_target, dtype=np.float64)
    n_points = min(len(u_arr), len(y_target_arr))
    t_arr = np.arange(0, n_points * dt, dt)[:n_points]

    # Find system defaults
    sys_meta = next((s for s in SYSTEM_INFO if s["id"] == system_id), None)
    default_params = sys_meta["default_params"].copy() if sys_meta else {}

    if initial_params:
        default_params.update(initial_params)

    # Param keys to optimize (exclude t_end, dt, u_amp, u_freq, x0)
    non_opt_keys = {"t_end", "dt", "u_amp", "u_freq", "u_type", "x0", "h0"}
    opt_keys = [k for k in default_params.keys() if k not in non_opt_keys]

    init_vector = [float(default_params[k]) for k in opt_keys]
    bounds_vector = []
    for k in opt_keys:
        if param_bounds and k in param_bounds:
            bounds_vector.append((param_bounds[k][0], param_bounds[k][1]))
        else:
            val = default_params[k]
            lb = val * 0.1 if val > 0 else val * 3.0 if val < 0 else -10.0
            ub = val * 3.0 if val > 0 else val * 0.1 if val < 0 else 10.0
            bounds_vector.append((min(lb, ub), max(lb, ub)))

    history = []

    def objective(theta_vec):
        p_dict = default_params.copy()
        for k, v in zip(opt_keys, theta_vec):
            p_dict[k] = float(v)
        try:
            res = sim_func(t_end=n_points * dt, dt=dt, **p_dict)
            y_sim = np.array(res["y"][:n_points])
            mse = float(np.mean((y_target_arr[:len(y_sim)] - y_sim) ** 2))
            history.append(mse)
            return mse if np.isfinite(mse) else 1e9
        except Exception:
            return 1e9

    # Run initial simulation
    init_res = sim_func(t_end=n_points * dt, dt=dt, **default_params)
    init_y = init_res["y"][:n_points]
    init_mse = float(np.mean((y_target_arr[:len(init_y)] - init_y) ** 2))

    opt_result = minimize(
        objective,
        init_vector,
        method="L-BFGS-B",
        bounds=bounds_vector,
        options={"maxiter": 100, "ftol": 1e-6}
    )

    opt_params = default_params.copy()
    for k, v in zip(opt_keys, opt_result.x):
        opt_params[k] = float(v)

    opt_sim_res = sim_func(t_end=n_points * dt, dt=dt, **opt_params)
    opt_y = opt_sim_res["y"][:n_points]
    opt_mse = float(np.mean((y_target_arr[:len(opt_y)] - opt_y) ** 2))

    return {
        "system_id": system_id,
        "initial_params": {k: default_params[k] for k in opt_keys},
        "optimized_params": {k: opt_params[k] for k in opt_keys},
        "initial_mse": init_mse,
        "optimized_mse": opt_mse,
        "improvement_percent": max(0.0, float(100.0 * (1.0 - opt_mse / (init_mse + 1e-12)))),
        "iterations": opt_result.nit,
        "objective_history": history[:50],  # sample history for charts
        "t": t_arr.tolist(),
        "y_target": y_target_arr[:n_points].tolist(),
        "y_initial": init_y,
        "y_optimized": opt_y,
    }
