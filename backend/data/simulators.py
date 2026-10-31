import torch
import numpy as np
from scipy.integrate import solve_ivp

class PendulumSimulator:
    """
    Simulates a nonlinear pendulum with complex friction.
    True dynamics:
    d(theta)/dt = omega
    d(omega)/dt = -(g/L) * sin(theta) - c_v * omega - c_nl * omega * |omega|
    """
    def __init__(self, g=9.81, L=1.0, c_v=0.1, c_nl=0.05):
        self.g = g
        self.L = L
        self.c_v = c_v
        self.c_nl = c_nl
        
    def _dynamics(self, t, y):
        theta, omega = y
        dtheta = omega
        domega = -(self.g / self.L) * np.sin(theta) - self.c_v * omega - self.c_nl * omega * np.abs(omega)
        return [dtheta, domega]
        
    def generate_data(self, t_span, dt, y0):
        t_eval = np.arange(t_span[0], t_span[1], dt)
        sol = solve_ivp(self._dynamics, t_span, y0, t_eval=t_eval, method='RK45')
        
        t = torch.tensor(sol.t, dtype=torch.float32)
        y = torch.tensor(sol.y.T, dtype=torch.float32) # (seq_len, 2)
        return t, y
