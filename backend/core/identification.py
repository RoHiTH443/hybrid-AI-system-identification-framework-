import torch
import torch.nn as nn
from torchdiffeq import odeint
import time

class SystemIdentifier:
    """
    Handles the training loop for the hybrid system identification.
    """
    def __init__(self, model: nn.Module, lr: float = 1e-3, method='dopri5'):
        self.model = model
        self.optimizer = torch.optim.Adam(model.parameters(), lr=lr)
        self.loss_fn = nn.MSELoss()
        self.method = method
        
    def train_step(self, t: torch.Tensor, batch_y0: torch.Tensor, batch_t: torch.Tensor, batch_y: torch.Tensor):
        self.optimizer.zero_grad()
        
        # Predict the trajectory
        pred_y = odeint(self.model, batch_y0, batch_t, method=self.method)
        
        # Compute loss
        loss = self.loss_fn(pred_y, batch_y)
        
        loss.backward()
        self.optimizer.step()
        
        return loss.item()
        
    def fit(self, t: torch.Tensor, y: torch.Tensor, epochs: int, batch_time: int = 10, batch_size: int = 20):
        """
        Trains the model using short time-series batches.
        t: shape (seq_len,)
        y: shape (seq_len, batch_size, state_dim) or (seq_len, state_dim)
        """
        if y.dim() == 2:
            y = y.unsqueeze(1) # Add batch dimension
            
        seq_len = t.size(0)
        
        for epoch in range(1, epochs + 1):
            start_time = time.time()
            
            # Create a random batch of short sequences
            starts = torch.randint(0, seq_len - batch_time, (batch_size,))
            
            batch_y0 = y[starts, 0, :] # Shape: (batch_size, state_dim)
            
            batch_t = t[:batch_time] 
            
            # Create batch_y
            batch_y = torch.stack([y[s:s+batch_time, 0, :] for s in starts], dim=1) # (batch_time, batch_size, state_dim)
            
            loss = self.train_step(t, batch_y0, batch_t, batch_y)
            
            if epoch % 100 == 0 or epoch == 1:
                end_time = time.time()
                print(f"Epoch {epoch:04d} | Loss: {loss:.6f} | Time: {end_time - start_time:.4f}s")
