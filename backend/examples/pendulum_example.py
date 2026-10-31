import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
import torch.nn as nn
import matplotlib.pyplot as plt
import numpy as np
from core.models import HybridNeuralODE
from core.identification import SystemIdentifier
from data.simulators import PendulumSimulator
from torchdiffeq import odeint

# 1. Define the known mechanistic model (e.g., rigid body pendulum without friction)
class KnownPendulumDynamics(nn.Module):
    def __init__(self, g=9.81, L=1.0):
        super().__init__()
        self.g = g
        self.L = L
        
    def forward(self, t, x):
        theta = x[..., 0]
        omega = x[..., 1]
        
        dtheta = omega
        domega = -(self.g / self.L) * torch.sin(theta)
        
        return torch.stack([dtheta, domega], dim=-1)

# 2. Generate training data using the true nonlinear system
print("Generating data...")
simulator = PendulumSimulator(g=9.81, L=1.0, c_v=0.1, c_nl=0.05)
t, y = simulator.generate_data(t_span=(0, 20), dt=0.05, y0=[np.pi/4, 0.0])

# 3. Setup the hybrid model
mechanistic_model = KnownPendulumDynamics(g=9.81, L=1.0)
model = HybridNeuralODE(mechanistic_model, state_dim=2, hidden_dim=32, num_layers=3)

# 4. Train the model
print("Training model...")
identifier = SystemIdentifier(model, lr=1e-3)
# 400 epochs, sequence batch length 20 (1 second), batch size 32
identifier.fit(t, y, epochs=400, batch_time=20, batch_size=32)

# 5. Validate the model by simulating forward
print("Simulating learned model...")
with torch.no_grad():
    y_pred = odeint(model, y[0], t, method='dopri5')
    
# Plot results
fig, axs = plt.subplots(2, 1, figsize=(10, 8))

axs[0].plot(t.numpy(), y[:, 0].numpy(), label='True Theta', color='black')
axs[0].plot(t.numpy(), y_pred[:, 0].numpy(), '--', label='Predicted Theta', color='red')
axs[0].set_ylabel('Angle (rad)')
axs[0].legend()

axs[1].plot(t.numpy(), y[:, 1].numpy(), label='True Omega', color='black')
axs[1].plot(t.numpy(), y_pred[:, 1].numpy(), '--', label='Predicted Omega', color='blue')
axs[1].set_ylabel('Angular Velocity (rad/s)')
axs[1].set_xlabel('Time (s)')
axs[1].legend()

plt.tight_layout()
plt.savefig('pendulum_results.png')
print("Saved results to pendulum_results.png")
