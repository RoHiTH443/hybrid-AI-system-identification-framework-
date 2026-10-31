# Hybrid AI System Identification Framework for Nonlinear Systems

An advanced engineering simulation, system identification, and research laboratory platform designed for the modeling, training, simulation, and forecasting of complex nonlinear dynamic systems using hybrid physics-informed artificial intelligence techniques.

---

## 🔬 System Overview & Inductive Bias

In dynamic system identification, pure black-box machine learning models (MLPs, random forests, deep regressors) frequently suffer from overfitting on high-frequency measurement noise and catastrophic divergence when recursively forecasting over long prediction horizons. Classical linear approaches (Linear ARX), while computationally instantaneous and stable, fail to capture essential nonlinear dynamics such as limit cycles, chaotic bifurcations, and state-dependent saturations.

This laboratory platform implements a **Hybrid AI Architecture**:

$$\hat{y}(t) = y_{\text{physics}}(t) + f_{\theta}(\mathbf{x}_t)$$

where:
1. **$y_{\text{physics}}(t)$**: Represents the baseline first-principles physical dynamical response (derived from conservation laws, torque balances, or Ordinary Differential Equations).
2. **$f_{\theta}(\mathbf{x}_t)$**: Represents an artificial neural network trained explicitly on the physical error residual $e(t) = y(t) - y_{\text{physics}}(t)$, learning unmodeled nonlinear friction, aerodynamic drag, or non-ideal actuator dynamics.

---

## 🏛️ Platform Architecture & 12 Functional Modules

The laboratory is structured into 12 fully interactive engineering modules:

1. **Overview Dashboard**: Live research status, system stability checks (BIBO stability, eigenvalue analysis), current best RMSE/MAE/$R^2$/Fit%, training progress, and interactive sparkline dynamics.
2. **Nonlinear System Laboratory**: Numerical solver workspace (Runge-Kutta RK45 Dormand-Prince integration) covering 9 dynamical system presets with phase portraits, real-time parameter tuning, input excitation types, noise injection, and CSV export.
3. **Dataset Explorer**: Experimental sensor CSV upload or synthetic data generation, searchable data tables, automated data quality validation (missing values, sampling rates, duplicate timestamps), Pearson correlation heatmaps, feature normalization, and interactive Train/Val/Test partitioning.
4. **Hybrid AI Model Builder**: Visual pipeline editor with connected blocks (Telemetry $\to$ Hankel Lag Embedding $\to$ Physics Prior $\to$ Residual Neural Engine $\to$ Prediction $\to$ Metrics) covering Classical, Machine Learning, and Hybrid AI families.
5. **Model Training Studio**: Dedicated training workspace featuring model selection, hyperparameter tuning (lag orders $p$, epochs, learning rate $\eta$, hidden units, weight decay), live epoch loss curve streams (MSE vs. Epoch), best checkpoint tracking, and optimization terminal logs.
6. **Live System Simulation**: Synchronized real-time streaming comparison charts displaying actual physical plant output $y(t)$, identified model output $\hat{y}(t)$, real-time error $e(t)$, excitation input $u(t)$, and live dynamic phase portraits with speed regulation (0.5x, 1x, 2x, 4x).
7. **Prediction & Forecasting**: Multi-step recursive forecasting interface ($H = 10 \dots 150$ steps) featuring Bayesian residual uncertainty tubes ($95\%$ confidence bounds $\pm 1.96 \sigma(k)$), reference ground-truth overlays, and CSV export.
8. **Performance Analytics**: Rigorous mathematical identification error diagnostics: RMSE, MAE, MSE, $R^2$, Normalized RMSE (NRMSE), and Normalized Fit Percentage ($\text{Fit}\% = \max(0, 100(1 - \|e\|_2 / \|y - \bar{y}\|_2))$) with actual vs. predicted scatter (45° line) and residual error histograms.
9. **Experiment History**: Persistent SQLite log of all research runs with duplicate, rename, delete, compare, and reopen capabilities.
10. **Model Comparison Arena**: Standardized held-out test leaderboard benchmarking Classical, Machine Learning, and Hybrid AI models side-by-side with noise robustness stress testing ($0\%$ to $20\%$ noise).
11. **Reports & Export**: Publication-ready research documentation with mathematical formulations, printable PDF layout, and structured JSON/CSV export.
12. **Settings and User Profile**: Scientific solver tolerances, default horizon durations, user credentials, theme toggle, and live FastAPI/PyTorch health diagnostics.

---

## 📐 Mathematical Governing Equations of Presets

### 1. Nonlinear Pendulum
$$\frac{d^2\theta}{dt^2} = -\frac{g}{L}\sin(\theta) - \frac{b}{mL^2}\frac{d\theta}{dt} + \frac{u}{mL^2}, \quad y = \theta$$

### 2. Van der Pol Oscillator (Limit Cycle)
$$\frac{d^2x}{dt^2} - \mu(1 - x^2)\frac{dx}{dt} + \omega_0^2 x = u, \quad y = x$$

### 3. Duffing Oscillator (Bifurcation & Chaos)
$$\frac{d^2x}{dt^2} + \delta \frac{dx}{dt} + \alpha x + \beta x^3 = F\cos(\omega t), \quad y = x$$

### 4. Nonlinear Tank-Level System (Torricelli Gravity Outflow)
$$\frac{dh}{dt} = \frac{k_{\text{in}} u - k_{\text{out}}\sqrt{h}}{A}, \quad y = h$$

### 5. Nonlinear Thermal System (Newtonian Convection + Stefan-Boltzmann Radiation)
$$C \frac{dT}{dt} = u - h(T - T_{\text{amb}}) - \varepsilon \sigma (T^4 - T_{\text{amb}}^4), \quad y = T$$

### 6. Custom Discrete-Time Benchmark (Narendra-Parthasarathy)
$$y(k) = \frac{a_1 y(k-1)}{1 + y(k-1)^2} + b_1 u(k-1) + c_1 u(k-1)^2$$

### 7. Nonlinear First-Order System (Hyperbolic Tangent Saturation)
$$\frac{dx}{dt} = -a x + b \tanh(u) + c x^2, \quad y = x$$

### 8. Nonlinear Second-Order Damped Dynamic
$$\frac{dx_1}{dt} = x_2, \quad \frac{dx_2}{dt} = -\alpha x_1 - \beta x_2 + \gamma \tanh(u), \quad y = x_1$$

### 9. DC Motor with Quadratic Friction
$$\frac{d\omega}{dt} = \frac{K_t i - b \omega - 0.1 \omega |\omega|}{J}, \quad \frac{di}{dt} = \frac{u - K_e \omega - R i}{L}, \quad y = \omega$$

---

## 🚀 Quickstart & Installation Instructions

### Prerequisites
- Python 3.9+ with virtual environment
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt   # or torch scikit-learn scipy fastapi uvicorn sqlalchemy
python main.py
```
The FastAPI backend starts on `http://127.0.0.1:8000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The Vite development server runs on `http://localhost:5173` with automatic API proxying.

Alternatively, building the frontend via `npm run build` serves the production application directly from `http://127.0.0.1:8000`.

### 3. Authentication & Instant Demo Access
Upon opening the application, you can:
- Click **"Enter Demo Mode (One-Click Instant Access)"** to enter the fully configured laboratory immediately without credentials.
- Or sign in with email/password, or use 6-digit OTP verification.

---

## 🧪 Automated Testing
Run the backend test suite:
```bash
PYTHONPATH=backend ./backend/venv/bin/pytest backend/tests
```
All tests verify numerical ODE simulation integrity, mathematical metric definitions, and PyTorch model convergence.

---

## 📄 License & Attribution
Designed by Google DeepMind Advanced Agentic Coding for Electronics & Instrumentation Engineering System Identification Research.
