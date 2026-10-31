import numpy as np
from scipy.integrate import solve_ivp
from typing import List, Dict, Any


def _generate_input(t_arr: np.ndarray, u_type: str, amp: float, freq: float) -> np.ndarray:
    n = len(t_arr)
    dt = t_arr[1] - t_arr[0] if n > 1 else 0.05
    T = t_arr[-1] if n > 1 else 1.0

    if u_type == 'step':
        u = np.ones_like(t_arr) * amp
        u[t_arr < T * 0.2] = 0.0
    elif u_type == 'chirp':
        f0, f1 = 0.05, max(freq, 0.1)
        u = amp * np.sin(2 * np.pi * (f0 + (f1 - f0) / (2 * max(T, 1e-3)) * t_arr) * t_arr)
    elif u_type == 'square':
        period = 1.0 / max(freq, 0.01)
        u = amp * np.sign(np.sin(2 * np.pi * freq * t_arr))
    elif u_type == 'multisine':
        u = amp * (
            0.6 * np.sin(2 * np.pi * freq * t_arr) +
            0.3 * np.sin(2 * np.pi * 2.5 * freq * t_arr + 0.4) +
            0.2 * np.sin(2 * np.pi * 5.0 * freq * t_arr + 1.1)
        )
    elif u_type == 'prbs':
        np.random.seed(42)
        switch_rate = max(1, int(1.0 / (max(freq, 0.01) * dt)))
        num_blocks = int(np.ceil(n / switch_rate))
        raw = np.random.choice([-1.0, 1.0], size=num_blocks)
        u = amp * np.repeat(raw, switch_rate)[:n]
    else:  # default 'sine'
        u = amp * np.sin(2 * np.pi * freq * t_arr)

    return u.astype(np.float64)


def simulate_nonlinear_first_order(a=1.0, b=2.0, c=0.1, t_end=20.0, dt=0.05,
                                    u_type='sine', u_amp=1.0, u_freq=0.5, x0=0.0, **kw) -> Dict:
    """dx/dt = -a*x + b*tanh(u) + c*x^2"""
    if a <= 0:
        raise ValueError("Parameter 'a' must be > 0 for stability")
    t_arr = np.arange(0, t_end + dt * 0.5, dt)
    u_arr = _generate_input(t_arr, u_type, u_amp, u_freq)
    u_interp = lambda t: float(np.interp(t, t_arr, u_arr))

    def dynamics(t, x):
        xi = x[0]
        dx = -a * xi + b * np.tanh(u_interp(t)) + c * (xi ** 2)
        return [np.clip(dx, -1e5, 1e5)]

    sol = solve_ivp(dynamics, [0, t_end], [float(x0)], t_eval=t_arr, method='RK45', max_step=dt * 2)
    return {
        "t": sol.t.tolist(), "u": u_arr.tolist(), "y": sol.y[0].tolist(),
        "states": {"x": sol.y[0].tolist()},
        "state_names": ["x"],
        "description": "Nonlinear first-order dynamic system with hyperbolic tangent input saturation and quadratic state term.",
        "equation": "dx/dt = -a·x + b·tanh(u) + c·x²\ny = x",
    }


def simulate_second_order(alpha=1.0, beta=0.5, gamma=3.0, t_end=20.0, dt=0.05,
                           u_type='sine', u_amp=1.0, u_freq=0.5, x0=None, **kw) -> Dict:
    """Second-order: dx1=x2, dx2=-alpha*x1-beta*x2+gamma*tanh(u)"""
    t_arr = np.arange(0, t_end + dt * 0.5, dt)
    u_arr = _generate_input(t_arr, u_type, u_amp, u_freq)
    u_interp = lambda t: float(np.interp(t, t_arr, u_arr))
    init_state = [float(x) for x in x0] if x0 and isinstance(x0, list) else [0.0, 0.0]

    def dynamics(t, x):
        dx1 = x[1]
        dx2 = -alpha * x[0] - beta * x[1] + gamma * np.tanh(u_interp(t))
        return [np.clip(dx1, -1e5, 1e5), np.clip(dx2, -1e5, 1e5)]

    sol = solve_ivp(dynamics, [0, t_end], init_state, t_eval=t_arr, method='RK45', max_step=dt * 2)
    return {
        "t": sol.t.tolist(), "u": u_arr.tolist(), "y": sol.y[0].tolist(),
        "states": {"x1": sol.y[0].tolist(), "x2": sol.y[1].tolist()},
        "state_names": ["x₁ (position)", "x₂ (velocity)"],
        "description": "Nonlinear second-order damped oscillator with saturation in the input channel.",
        "equation": "dx₁/dt = x₂\ndx₂/dt = -α·x₁ - β·x₂ + γ·tanh(u)\ny = x₁",
    }


def simulate_pendulum(m=1.0, L=1.0, b=0.2, g=9.81, t_end=20.0, dt=0.05,
                      u_type='sine', u_amp=1.0, u_freq=0.5, theta0=0.5, omega0=0.0, **kw) -> Dict:
    """Nonlinear pendulum: dtheta/dt = omega, domega/dt = -(g/L)*sin(theta) - (b/(m*L^2))*omega + u/(m*L^2)"""
    t_arr = np.arange(0, t_end + dt * 0.5, dt)
    u_arr = _generate_input(t_arr, u_type, u_amp, u_freq)
    u_interp = lambda t: float(np.interp(t, t_arr, u_arr))
    inertia = max(m * (L ** 2), 1e-4)

    def dynamics(t, x):
        theta, omega = x[0], x[1]
        dtheta = omega
        domega = -(g / L) * np.sin(theta) - (b / inertia) * omega + (u_interp(t) / inertia)
        return [np.clip(dtheta, -1e4, 1e4), np.clip(domega, -1e4, 1e4)]

    sol = solve_ivp(dynamics, [0, t_end], [float(theta0), float(omega0)], t_eval=t_arr, method='RK45', max_step=dt * 2)
    return {
        "t": sol.t.tolist(), "u": u_arr.tolist(), "y": sol.y[0].tolist(),
        "states": {"theta": sol.y[0].tolist(), "omega": sol.y[1].tolist()},
        "state_names": ["θ (angle, rad)", "ω (angular vel, rad/s)"],
        "description": "Nonlinear pendulum with large-angle sin(θ) nonlinearity, viscous air drag, and torque excitation.",
        "equation": "dθ/dt = ω\ndω/dt = -(g/L)·sin(θ) - [b/(m·L²)]·ω + u/(m·L²)\ny = θ",
    }


def simulate_vanderpol(mu=1.5, omega0=1.0, t_end=25.0, dt=0.05,
                       u_type='sine', u_amp=0.5, u_freq=0.2, x0=0.1, v0=0.0, **kw) -> Dict:
    """Van der Pol oscillator: dx/dt = v, dv/dt = mu*(1 - x^2)*v - omega0^2*x + u"""
    t_arr = np.arange(0, t_end + dt * 0.5, dt)
    u_arr = _generate_input(t_arr, u_type, u_amp, u_freq)
    u_interp = lambda t: float(np.interp(t, t_arr, u_arr))

    def dynamics(t, state):
        x, v = state[0], state[1]
        dx = v
        dv = mu * (1.0 - x ** 2) * v - (omega0 ** 2) * x + u_interp(t)
        return [np.clip(dx, -1e4, 1e4), np.clip(dv, -1e4, 1e4)]

    sol = solve_ivp(dynamics, [0, t_end], [float(x0), float(v0)], t_eval=t_arr, method='RK45', max_step=dt * 2)
    return {
        "t": sol.t.tolist(), "u": u_arr.tolist(), "y": sol.y[0].tolist(),
        "states": {"x": sol.y[0].tolist(), "v": sol.y[1].tolist()},
        "state_names": ["x (displacement)", "v (velocity)"],
        "description": "Van der Pol oscillator featuring non-conservative state-dependent nonlinear damping with limit cycle attractor.",
        "equation": "dx/dt = v\ndv/dt = μ·(1 - x²)·v - ω₀²·x + u\ny = x",
    }


def simulate_duffing(alpha=-1.0, beta=1.0, delta=0.3, t_end=30.0, dt=0.05,
                     u_amp=0.5, u_freq=1.2, x0=0.1, v0=0.0, **kw) -> Dict:
    """Duffing oscillator: dx1=x2, dx2=-delta*x2 - alpha*x1 - beta*x1^3 + u"""
    t_arr = np.arange(0, t_end + dt * 0.5, dt)
    u_arr = u_amp * np.cos(u_freq * t_arr)
    u_interp = lambda t: float(np.interp(t, t_arr, u_arr))

    def dynamics(t, state):
        x1, x2 = state[0], state[1]
        dx1 = x2
        dx2 = -delta * x2 - alpha * x1 - beta * (x1 ** 3) + u_interp(t)
        return [np.clip(dx1, -1e4, 1e4), np.clip(dx2, -1e4, 1e4)]

    sol = solve_ivp(dynamics, [0, t_end], [float(x0), float(v0)], t_eval=t_arr, method='RK45', max_step=dt * 2)
    return {
        "t": sol.t.tolist(), "u": u_arr.tolist(), "y": sol.y[0].tolist(),
        "states": {"x1": sol.y[0].tolist(), "x2": sol.y[1].tolist()},
        "state_names": ["x₁ (displacement)", "x₂ (velocity)"],
        "description": "Duffing oscillator with cubic stiffness nonlinearity, demonstrating subharmonic resonances and chaotic trajectories.",
        "equation": "dx₁/dt = x₂\ndx₂/dt = -δ·x₂ - α·x₁ - β·x₁³ + F·cos(ω·t)\ny = x₁",
    }


def simulate_tank(A=1.0, k_in=1.0, k_out=0.5, t_end=40.0, dt=0.1,
                  u_type='sine', u_amp=0.8, u_freq=0.1, h0=0.5, **kw) -> Dict:
    """Tank level: dh/dt = (k_in*u - k_out*sqrt(max(h,0)))/A"""
    t_arr = np.arange(0, t_end + dt * 0.5, dt)
    raw_u = _generate_input(t_arr, u_type, u_amp, u_freq)
    # Ensure positive inflow
    u_arr = np.clip(np.abs(raw_u), 0.05, 3.0)
    u_interp = lambda t: float(np.interp(t, t_arr, u_arr))

    def dynamics(t, x):
        h = max(x[0], 0.0)
        dh = (k_in * u_interp(t) - k_out * np.sqrt(h)) / max(A, 0.05)
        return [np.clip(dh, -1e3, 1e3)]

    sol = solve_ivp(dynamics, [0, t_end], [float(h0)], t_eval=t_arr, method='RK45', max_step=dt * 2)
    y_clipped = np.clip(sol.y[0], 0.0, None)
    return {
        "t": sol.t.tolist(), "u": u_arr.tolist(), "y": y_clipped.tolist(),
        "states": {"h": y_clipped.tolist()},
        "state_names": ["h (liquid level, m)"],
        "description": "Coupled hydraulic tank process governed by Torricelli's nonlinear square-root gravity discharge.",
        "equation": "dh/dt = (k_in·u - k_out·√h) / A\ny = h",
    }


def simulate_thermal(C=2.0, h_conv=0.8, epsilon=0.5, T_amb=25.0, t_end=40.0, dt=0.1,
                     u_type='step', u_amp=50.0, u_freq=0.05, T0=25.0, **kw) -> Dict:
    """Nonlinear thermal system: C*dT/dt = u - h_conv*(T - T_amb) - sigma_rad*(T^4 - T_amb^4)"""
    t_arr = np.arange(0, t_end + dt * 0.5, dt)
    u_arr = np.clip(_generate_input(t_arr, u_type, u_amp, u_freq), 0.0, None)
    u_interp = lambda t: float(np.interp(t, t_arr, u_arr))
    # Normalized radiation factor
    sigma_eff = float(epsilon) * 1.5e-5

    def dynamics(t, x):
        T = x[0]
        # Convection + nonlinear radiative heat loss
        q_conv = h_conv * (T - T_amb)
        q_rad = sigma_eff * ((T + 273.15) ** 4 - (T_amb + 273.15) ** 4) * 1e-4
        dT = (u_interp(t) - q_conv - q_rad) / max(C, 0.1)
        return [np.clip(dT, -1e3, 1e3)]

    sol = solve_ivp(dynamics, [0, t_end], [float(T0)], t_eval=t_arr, method='RK45', max_step=dt * 2)
    return {
        "t": sol.t.tolist(), "u": u_arr.tolist(), "y": sol.y[0].tolist(),
        "states": {"T": sol.y[0].tolist()},
        "state_names": ["T (temperature, °C)"],
        "description": "Thermal process with Newton convective cooling and nonlinear Stefan-Boltzmann quartic radiative dissipation.",
        "equation": "C·dT/dt = u - h·(T - T_amb) - ε·σ·(T⁴ - T_amb⁴)\ny = T",
    }


def simulate_dc_motor(J=0.01, b_friction=0.1, Kt=0.1, Ke=0.1, R=1.0, L=0.5,
                      t_end=10.0, dt=0.01, u_type='sine', u_amp=12.0, u_freq=0.5, **kw) -> Dict:
    """DC motor: dω/dt=(Kt*i-b*ω-0.1*ω*|ω|)/J, di/dt=(u-Ke*ω-R*i)/L"""
    t_arr = np.arange(0, t_end + dt * 0.5, dt)
    u_arr = _generate_input(t_arr, u_type, u_amp, u_freq)
    u_interp = lambda t: float(np.interp(t, t_arr, u_arr))

    def dynamics(t, x):
        omega, i = x[0], x[1]
        domega = (Kt * i - b_friction * omega - 0.1 * omega * abs(omega)) / max(J, 1e-4)
        di = (u_interp(t) - Ke * omega - R * i) / max(L, 1e-4)
        return [np.clip(domega, -1e4, 1e4), np.clip(di, -1e4, 1e4)]

    sol = solve_ivp(dynamics, [0, t_end], [0.0, 0.0], t_eval=t_arr, method='RK45', max_step=dt * 5)
    return {
        "t": sol.t.tolist(), "u": u_arr.tolist(), "y": sol.y[0].tolist(),
        "states": {"omega": sol.y[0].tolist(), "current": sol.y[1].tolist()},
        "state_names": ["ω (angular vel, rad/s)", "i (armature current, A)"],
        "description": "DC electro-mechanical drive including coupled electrical dynamics and quadratic aerodynamic/Coulomb friction.",
        "equation": "dω/dt = (Kt·i - b·ω - 0.1·ω·|ω|) / J\ndi/dt = (u - Ke·ω - R·i) / L\ny = ω",
    }


def simulate_custom_discrete(a1=0.8, b1=0.4, c1=0.15, t_end=20.0, dt=0.05,
                             u_type='sine', u_amp=1.0, u_freq=0.5, y0=0.0, **kw) -> Dict:
    """Custom discrete-time nonlinear benchmark:
       y(k) = (a1 * y(k-1)) / (1 + y(k-1)^2) + b1 * u(k-1) + c1 * u(k-1)^2
    """
    t_arr = np.arange(0, t_end + dt * 0.5, dt)
    n = len(t_arr)
    u_arr = _generate_input(t_arr, u_type, u_amp, u_freq)
    y_arr = np.zeros(n)
    y_arr[0] = float(y0)

    for k in range(1, n):
        y_prev = y_arr[k - 1]
        u_prev = u_arr[k - 1]
        # Benchmark rational nonlinear difference equation (Narendra-Parthasarathy benchmark)
        y_next = (a1 * y_prev) / (1.0 + (y_prev ** 2)) + b1 * u_prev + c1 * (u_prev ** 2)
        y_arr[k] = np.clip(y_next, -50.0, 50.0)

    return {
        "t": t_arr.tolist(), "u": u_arr.tolist(), "y": y_arr.tolist(),
        "states": {"y": y_arr.tolist()},
        "state_names": ["y(k) (discrete state)"],
        "description": "Narendra-Parthasarathy discrete-time rational nonlinear system identification benchmark.",
        "equation": "y(k) = [a₁·y(k-1)] / [1 + y(k-1)²] + b₁·u(k-1) + c₁·u(k-1)²\ny(k) = state output",
    }


SIMULATORS = {
    "nonlinear_first_order": simulate_nonlinear_first_order,
    "second_order": simulate_second_order,
    "pendulum": simulate_pendulum,
    "vanderpol": simulate_vanderpol,
    "duffing": simulate_duffing,
    "tank": simulate_tank,
    "thermal": simulate_thermal,
    "dc_motor": simulate_dc_motor,
    "custom_discrete": simulate_custom_discrete,
}

SYSTEM_INFO = [
    {
        "id": "pendulum",
        "name": "Nonlinear Pendulum",
        "states": 2,
        "category": "Mechanical / Rotational",
        "equation": "d²θ/dt² = -(g/L)·sin(θ) - [b/(m·L²)]·(dθ/dt) + u/(m·L²)",
        "default_params": {"m": 1.0, "L": 1.0, "b": 0.2, "g": 9.81, "t_end": 20, "dt": 0.05, "u_amp": 1.0, "u_freq": 0.5, "theta0": 0.5, "omega0": 0.0}
    },
    {
        "id": "vanderpol",
        "name": "Van der Pol Oscillator",
        "states": 2,
        "category": "Self-Excited / Limit Cycle",
        "equation": "d²x/dt² - μ·(1 - x²)·(dx/dt) + x = u",
        "default_params": {"mu": 1.5, "omega0": 1.0, "t_end": 25, "dt": 0.05, "u_amp": 0.5, "u_freq": 0.2, "x0": 0.1, "v0": 0.0}
    },
    {
        "id": "duffing",
        "name": "Duffing Oscillator",
        "states": 2,
        "category": "Chaotic / Multi-Well",
        "equation": "d²x/dt² + δ·(dx/dt) + α·x + β·x³ = F·cos(ω·t)",
        "default_params": {"alpha": -1.0, "beta": 1.0, "delta": 0.3, "t_end": 30, "dt": 0.05, "u_amp": 0.5, "u_freq": 1.2, "x0": 0.1, "v0": 0.0}
    },
    {
        "id": "tank",
        "name": "Nonlinear Tank Level",
        "states": 1,
        "category": "Hydraulic / Process",
        "equation": "dh/dt = (k_in·u - k_out·√h) / A",
        "default_params": {"A": 1.0, "k_in": 1.0, "k_out": 0.5, "t_end": 40, "dt": 0.1, "u_amp": 0.8, "u_freq": 0.1, "h0": 0.5}
    },
    {
        "id": "thermal",
        "name": "Nonlinear Thermal System",
        "states": 1,
        "category": "Thermal / Heat Transfer",
        "equation": "C·dT/dt = u - h·(T - T_amb) - ε·σ·(T⁴ - T_amb⁴)",
        "default_params": {"C": 2.0, "h_conv": 0.8, "epsilon": 0.5, "T_amb": 25.0, "t_end": 40, "dt": 0.1, "u_amp": 50.0, "u_freq": 0.05, "T0": 25.0}
    },
    {
        "id": "custom_discrete",
        "name": "Custom Discrete-Time System",
        "states": 1,
        "category": "Digital / Discrete Benchmark",
        "equation": "y(k) = [a₁·y(k-1)] / [1 + y(k-1)²] + b₁·u(k-1) + c₁·u(k-1)²",
        "default_params": {"a1": 0.8, "b1": 0.4, "c1": 0.15, "t_end": 20, "dt": 0.05, "u_amp": 1.0, "u_freq": 0.5, "y0": 0.0}
    },
    {
        "id": "nonlinear_first_order",
        "name": "Nonlinear First-Order",
        "states": 1,
        "category": "Benchmark / Polynomial",
        "equation": "dx/dt = -a·x + b·tanh(u) + c·x²",
        "default_params": {"a": 1.0, "b": 2.0, "c": 0.1, "t_end": 20, "dt": 0.05, "u_amp": 1.0, "u_freq": 0.5, "x0": 0.0}
    },
    {
        "id": "second_order",
        "name": "Nonlinear Second-Order",
        "states": 2,
        "category": "Oscillatory / Dynamic",
        "equation": "dx₁/dt = x₂; dx₂/dt = -α·x₁ - β·x₂ + γ·tanh(u)",
        "default_params": {"alpha": 1.0, "beta": 0.5, "gamma": 3.0, "t_end": 20, "dt": 0.05, "u_amp": 1.0, "u_freq": 0.5}
    },
    {
        "id": "dc_motor",
        "name": "DC Motor (Nonlinear Friction)",
        "states": 2,
        "category": "Electromechanical",
        "equation": "dω/dt = (Kt·i - b·ω - 0.1·ω·|ω|) / J; di/dt = (u - Ke·ω - R·i) / L",
        "default_params": {"J": 0.01, "b_friction": 0.1, "Kt": 0.1, "Ke": 0.1, "R": 1.0, "L": 0.5, "t_end": 10, "dt": 0.01, "u_amp": 12.0, "u_freq": 0.5}
    },
]
