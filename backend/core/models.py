import torch
import torch.nn as nn
from typing import Callable

class HybridNeuralODE(nn.Module):
    """
    A hybrid neural ODE model combining a known mechanistic component 
    with an unknown neural network component.
    
    dx/dt = f_known(t, x) + f_nn(t, x, weights)
    """
    def __init__(self, 
                 mechanistic_model: Callable, 
                 state_dim: int, 
                 hidden_dim: int = 64,
                 num_layers: int = 3):
        super().__init__()
        self.mechanistic_model = mechanistic_model
        self.state_dim = state_dim
        
        # Multilayer perceptron for the unknown dynamics
        layers = []
        layers.append(nn.Linear(state_dim + 1, hidden_dim)) # +1 for time t
        layers.append(nn.Tanh())
        for _ in range(num_layers - 2):
            layers.append(nn.Linear(hidden_dim, hidden_dim))
            layers.append(nn.Tanh())
        layers.append(nn.Linear(hidden_dim, state_dim))
        
        self.nn_model = nn.Sequential(*layers)
        
    def forward(self, t, x):
        """
        Forward pass for the ODE solver.
        t: scalar time or tensor of shape (1,)
        x: state tensor of shape (batch_size, state_dim) or (state_dim,)
        """
        if x.dim() == 1:
            x_batched = x.unsqueeze(0)
        else:
            x_batched = x
            
        t_batched = t.expand(x_batched.size(0), 1) if t.dim() == 0 else t.view(-1, 1).expand(x_batched.size(0), 1)
        
        # Ensure t is the same dtype as x
        t_batched = t_batched.to(x.dtype)
        
        # Concatenate state and time for NN input
        nn_input = torch.cat([x_batched, t_batched], dim=-1)
        
        # Known dynamics
        dx_known = self.mechanistic_model(t, x)
        
        # Unknown dynamics
        dx_unknown = self.nn_model(nn_input)
        
        if x.dim() == 1:
            dx_unknown = dx_unknown.squeeze(0)
            
        return dx_known + dx_unknown
