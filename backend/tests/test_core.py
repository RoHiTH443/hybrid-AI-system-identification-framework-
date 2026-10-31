import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
import pytest
from core.models import HybridNeuralODE

def test_hybrid_model():
    def mechanistic(t, x):
        return -x
        
    model = HybridNeuralODE(mechanistic, state_dim=2, hidden_dim=8, num_layers=2)
    
    x = torch.tensor([[1.0, 2.0], [3.0, 4.0]])
    t = torch.tensor(0.0)
    
    out = model(t, x)
    assert out.shape == x.shape
    
    # Check that output is not just the mechanistic part
    out_mech = mechanistic(t, x)
    assert not torch.allclose(out, out_mech)
