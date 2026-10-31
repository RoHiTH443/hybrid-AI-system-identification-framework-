import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Cpu, ArrowRight, Layers, Sliders, CheckCircle2, Info, Sparkles,
  Zap, GitBranch, Database, Activity, PlaySquare
} from 'lucide-react'
import { useAppStore } from '../store/appStore'

export interface ModelArchDefinition {
  id: string
  name: string
  family: 'Classical' | 'Machine Learning' | 'Hybrid AI'
  badge: string
  description: string
  formula: string
  explanation: string
  components: string[]
  hyperparameters: {
    key: string
    label: string
    type: 'number' | 'select' | 'array'
    default: any
    options?: any[]
    min?: number
    max?: number
    step?: number
    desc: string
  }[]
}

export const MODEL_CATALOG: ModelArchDefinition[] = [
  {
    id: 'hybrid_physics_ai',
    name: 'Physics + Residual AI Hybrid',
    family: 'Hybrid AI',
    badge: 'Dual-Channel Hybrid',
    description: 'First-principles linear physical estimator coupled with a deep neural residual compensator.',
    formula: 'ŷ(t) = y_physics(t) + f_θ(u_t, y_t)',
    explanation: 'The physical model estimates baseline dynamics from analytical Newton/Euler laws or least-squares estimation. The deep AI model is trained specifically on the physics error residual (y_actual - y_physics), ensuring physical consistency and rapid generalization.',
    components: ['Physical ODE Baseline', 'Lagged Feature Extractor', 'Residual MLP Network', 'Additive Recombiner'],
    hyperparameters: [
      { key: 'lag_order', label: 'Autoregressive Lag Order p', type: 'number', default: 3, min: 1, max: 8, step: 1, desc: 'Number of past time-steps used for residual learning' },
      { key: 'epochs', label: 'Maximum Training Epochs', type: 'number', default: 150, min: 20, max: 500, step: 10, desc: 'Epoch iterations for residual network optimization' },
      { key: 'lr', label: 'Learning Rate η', type: 'number', default: 0.001, min: 0.0001, max: 0.05, step: 0.0005, desc: 'Adam optimizer step size' },
      { key: 'weight_decay', label: 'L2 Weight Regularization', type: 'number', default: 0.0001, min: 0.0, max: 0.01, step: 0.0001, desc: 'Prevents overfitting on residual noise' },
    ]
  },
  {
    id: 'pinn_inspired',
    name: 'Physics-Informed Neural Net (PINN)',
    family: 'Hybrid AI',
    badge: 'Soft-Constrained PINN',
    description: 'Deep neural network trained with a combined loss penalizing data error and ODE physical derivative violations.',
    formula: 'Loss = MSE_data + λ_phys · ||dŷ/dt - f_ODE(ŷ, u)||²',
    explanation: 'Incorporates dynamic governing laws directly into the neural backpropagation objective. Unphysical predictions or non-conservative accelerations are penalized even in regions with sparse measurements.',
    components: ['Time-Lag Embedder', 'Deep Neural Predictor', 'Automatic Derivative Regularizer', 'Physics Loss Penalty'],
    hyperparameters: [
      { key: 'lag_order', label: 'Lag Order p', type: 'number', default: 3, min: 1, max: 8, step: 1, desc: 'Lag window size' },
      { key: 'pinn_lambda', label: 'Physics Penalty Weight λ', type: 'number', default: 0.08, min: 0.01, max: 0.5, step: 0.01, desc: 'Tradeoff between empirical MSE and physical derivative consistency' },
      { key: 'epochs', label: 'Training Epochs', type: 'number', default: 200, min: 30, max: 500, step: 10, desc: 'Iterations for gradient descent' },
      { key: 'lr', label: 'Learning Rate', type: 'number', default: 0.001, min: 0.0001, max: 0.01, step: 0.0005, desc: 'Optimizer learning rate' },
    ]
  },
  {
    id: 'fuzzy_neural',
    name: 'Takagi-Sugeno Fuzzy-Neural (ANFIS)',
    family: 'Hybrid AI',
    badge: 'Neuro-Fuzzy',
    description: 'Interpretable adaptive neuro-fuzzy inference system with Gaussian membership functions and linear consequent hyperplanes.',
    formula: 'ŷ = Σ [w_i(x) · (a_i^T x + b_i)] / Σ w_i(x)',
    explanation: 'Combines transparent linguistic IF-THEN rules with neural gradient backpropagation. Each fuzzy partition approximates local linear dynamic operating points.',
    components: ['Fuzzification Layer', 'Gaussian Membership Functions', 'Rule Firing Normalizer', 'Takagi-Sugeno Consequents'],
    hyperparameters: [
      { key: 'lag_order', label: 'Lag Order p', type: 'number', default: 3, min: 1, max: 6, step: 1, desc: 'Input lag order' },
      { key: 'num_rules', label: 'Number of Fuzzy Rules R', type: 'number', default: 4, min: 2, max: 12, step: 1, desc: 'Number of operating region clusters' },
      { key: 'epochs', label: 'Training Epochs', type: 'number', default: 150, min: 20, max: 400, step: 10, desc: 'Epochs' },
      { key: 'lr', label: 'Learning Rate', type: 'number', default: 0.01, min: 0.001, max: 0.05, step: 0.002, desc: 'Rule center and consequent gradient step' },
    ]
  },
  {
    id: 'narx',
    name: 'Nonlinear ARX (NARX)',
    family: 'Classical',
    badge: 'Classical Non-Linear',
    description: 'Autoregressive model utilizing past inputs and past observed states within a nonlinear mapping function.',
    formula: 'ŷ(k) = F(y(k-1), ..., y(k-p), u(k-1), ..., u(k-m))',
    explanation: 'Standard baseline benchmark for dynamic system identification. Excels in one-step-ahead prediction when true feedback measurements are continuously available.',
    components: ['Input Lag Buffer', 'State Lag Buffer', 'Nonlinear Neural Map', 'Recursive Predictor'],
    hyperparameters: [
      { key: 'lag_order', label: 'Autoregressive Order p', type: 'number', default: 3, min: 1, max: 8, step: 1, desc: 'Number of lagged output and input terms' },
      { key: 'epochs', label: 'Training Epochs', type: 'number', default: 150, min: 20, max: 400, step: 10, desc: 'Epoch iterations' },
      { key: 'lr', label: 'Learning Rate', type: 'number', default: 0.001, min: 0.0001, max: 0.02, step: 0.0005, desc: 'Learning rate' },
    ]
  },
  {
    id: 'linear_arx',
    name: 'Linear ARX Baseline',
    family: 'Classical',
    badge: 'Linear Least Squares',
    description: 'Classical linear regression baseline with Ridge regularization over lagged input-output state history.',
    formula: 'A(q) y(t) = B(q) u(t) + e(t)',
    explanation: 'Essential scientific baseline to assess whether nonlinear modeling complexity is mathematically justified over simple linear regression.',
    components: ['Lagged Hankel Feature Matrix', 'Ridge L2 Regularizer', 'Closed-Form OLS Solver'],
    hyperparameters: [
      { key: 'lag_order', label: 'ARX Model Order p', type: 'number', default: 3, min: 1, max: 10, step: 1, desc: 'Polynomial degree' },
      { key: 'alpha', label: 'Ridge Regularization α', type: 'number', default: 1.0, min: 0.01, max: 20.0, step: 0.1, desc: 'Shrinkage parameter' },
    ]
  },
  {
    id: 'neural_network',
    name: 'Multilayer Perceptron (MLP)',
    family: 'Machine Learning',
    badge: 'Pure Deep Learning',
    description: 'Black-box deep multilayer feedforward network with hyperbolic tangent activations.',
    formula: 'ŷ = W_3 · tanh(W_2 · tanh(W_1 · x + b_1) + b_2) + b_3',
    explanation: 'Standard unconstrained deep learning approach. Highly flexible but lacks physical inductive biases and can diverge under out-of-distribution extrapolation.',
    components: ['Input Layer', 'Hidden Layer 1 (Tanh)', 'Hidden Layer 2 (Tanh)', 'Linear Regression Readout'],
    hyperparameters: [
      { key: 'lag_order', label: 'Input Lag Order', type: 'number', default: 3, min: 1, max: 8, step: 1, desc: 'Lags' },
      { key: 'epochs', label: 'Epochs', type: 'number', default: 180, min: 20, max: 400, step: 10, desc: 'Training epochs' },
      { key: 'lr', label: 'Learning Rate', type: 'number', default: 0.001, min: 0.0001, max: 0.01, step: 0.0005, desc: 'Learning rate' },
    ]
  },
  {
    id: 'random_forest',
    name: 'Random Forest Regressor',
    family: 'Machine Learning',
    badge: 'Ensemble Trees',
    description: 'Ensemble of bootstrapped decision trees averaging nonlinear piece-wise approximations.',
    formula: 'ŷ = (1/B) · Σ T_b(x_lagged)',
    explanation: 'Non-parametric ensemble method that captures non-linear thresholds and feature interactions without gradient backpropagation.',
    components: ['Lagged Feature Builder', 'Bootstrap Aggregation', 'Randomized Feature Splitting', 'Ensemble Averager'],
    hyperparameters: [
      { key: 'lag_order', label: 'Lag Order', type: 'number', default: 3, min: 1, max: 8, step: 1, desc: 'Lag order' },
      { key: 'n_estimators', label: 'Number of Estimator Trees', type: 'number', default: 50, min: 10, max: 150, step: 10, desc: 'Forest size' },
    ]
  },
  {
    id: 'svr',
    name: 'Support Vector Regression (SVR)',
    family: 'Machine Learning',
    badge: 'Kernel Method',
    description: 'Maximum margin regression using nonlinear Radial Basis Function (RBF) kernel mapping.',
    formula: 'ŷ = Σ (α_i - α_i*) · K(x, x_i) + b',
    explanation: 'Constructs an ε-insensitive loss tube that ignores errors smaller than ε, providing robustness against minor sensor noise.',
    components: ['Lagged State Extractor', 'RBF Kernel Transform', 'Quadratic Margin Optimizer'],
    hyperparameters: [
      { key: 'lag_order', label: 'Lag Order', type: 'number', default: 3, min: 1, max: 8, step: 1, desc: 'Lags' },
      { key: 'C', label: 'Regularization Parameter C', type: 'number', default: 5.0, min: 0.5, max: 50.0, step: 1.0, desc: 'Tradeoff penalty' },
    ]
  },
  {
    id: 'lstm_sequence',
    name: 'LSTM Sequence Network',
    family: 'Hybrid AI',
    badge: 'Recurrent Memory',
    description: 'Recurrent neural architecture with gating mechanisms (input, forget, output gates) for multi-step temporal state tracking.',
    formula: 'h_t = LSTM(u_t, y_t-1, h_t-1, c_t-1)',
    explanation: 'Maintains an internal cell state vector c_t that preserves long-term dynamical memory and state delays over multi-period horizons.',
    components: ['Sliding Window Sequence Slicer', 'Input & Forget Gates', 'Hidden Recurrent State', 'Dense Projection Output'],
    hyperparameters: [
      { key: 'lag_order', label: 'Sequence Window Length L', type: 'number', default: 5, min: 2, max: 15, step: 1, desc: 'Temporal window' },
      { key: 'epochs', label: 'Training Epochs', type: 'number', default: 150, min: 30, max: 400, step: 10, desc: 'Epochs' },
      { key: 'lr', label: 'Learning Rate', type: 'number', default: 0.002, min: 0.0002, max: 0.01, step: 0.0005, desc: 'Step size' },
    ]
  },
]

export const ModelBuilder: React.FC = () => {
  const { setActivePage } = useAppStore()
  const [selectedModelId, setSelectedModelId] = useState<string>('hybrid_physics_ai')
  const [activeFamily, setActiveFamily] = useState<'All' | 'Hybrid AI' | 'Machine Learning' | 'Classical'>('All')
  const [selectedPipelineStep, setSelectedPipelineStep] = useState<number>(3)

  const activeModel = MODEL_CATALOG.find(m => m.id === selectedModelId) || MODEL_CATALOG[0]

  const filteredCatalog = MODEL_CATALOG.filter(m => activeFamily === 'All' || m.family === activeFamily)

  // Visual Pipeline Stages
  const pipelineStages = [
    { id: 0, title: 'Input Telemetry', desc: 'u(t), y(t) observation vectors', icon: Database, color: 'text-cyan-400' },
    { id: 1, title: 'Preprocessing & Lag', desc: 'Standardization & Hankel lags p', icon: Sliders, color: 'text-violet-400' },
    { id: 2, title: 'Physical Baseline', desc: 'First-principles ODE prior y_phys', icon: Activity, color: 'text-emerald-400' },
    { id: 3, title: 'AI Residual Engine', desc: 'Learns e = y_true - y_phys', icon: Cpu, color: 'text-amber-400' },
    { id: 4, title: 'Output Prediction', desc: 'ŷ = y_phys + f_residual', icon: GitBranch, color: 'text-cyan-400' },
    { id: 5, title: 'Evaluation Metrics', desc: 'RMSE, MAE, R², Fit %', icon: Sparkles, color: 'text-rose-400' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-cyan-400" />
            Hybrid AI Model Builder & Pipeline Studio
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure, inspect, and architect hybrid physics-informed neural network pipelines alongside classical identification baselines.
          </p>
        </div>

        <button
          onClick={() => setActivePage('training')}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-2"
        >
          <PlaySquare className="w-4 h-4 fill-current" />
          <span>Launch Training Studio with Selected Architecture</span>
        </button>
      </div>

      {/* Visual Pipeline Editor Architecture */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span>End-to-End Hybrid Identification Pipeline</span>
          </div>
          <span className="text-[11px] text-slate-400">Click a stage to inspect pipeline dataflow</span>
        </div>

        {/* Connected Pipeline Blocks */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2">
          {pipelineStages.map((stg, i) => {
            const isSelected = selectedPipelineStep === stg.id
            const Icon = stg.icon
            return (
              <div
                key={stg.id}
                onClick={() => setSelectedPipelineStep(stg.id)}
                className={`relative p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-950/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-lg bg-slate-900 ${stg.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Stage {stg.id + 1}</span>
                </div>
                <div className="text-xs font-semibold truncate text-slate-100">{stg.title}</div>
                <div className="text-[10px] text-slate-400 mt-1 leading-tight">{stg.desc}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Model Family Filter Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-medium w-fit">
        {(['All', 'Hybrid AI', 'Machine Learning', 'Classical'] as const).map(fam => (
          <button
            key={fam}
            onClick={() => setActiveFamily(fam)}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeFamily === fam ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {fam}
          </button>
        ))}
      </div>

      {/* Model Catalog Grid & Selected Architecture Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Model Catalog List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Available Model Architectures ({filteredCatalog.length})
          </div>
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredCatalog.map(model => {
              const isSelected = selectedModelId === model.id
              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-100">{model.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-cyan-300">
                      {model.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {model.description}
                  </p>
                  <div className="mt-2 text-[11px] font-mono text-cyan-400/90 truncate">
                    {model.formula}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Selected Architecture Deep Dive */}
        <div className="lg:col-span-7 space-y-4">

          {/* Model Specification Banner */}
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-cyan-400 font-mono uppercase tracking-wider">{activeModel.family}</span>
                <h2 className="text-xl font-bold text-white mt-1">{activeModel.name}</h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                {activeModel.badge}
              </span>
            </div>

            {/* Formula Presentation */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-sm text-cyan-300 leading-relaxed shadow-inner">
              <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">Mathematical Formulation</div>
              <div>{activeModel.formula}</div>
            </div>

            {/* Scientific Explanation */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-violet-400" />
                <span>Theoretical Inductive Bias</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {activeModel.explanation}
              </p>
            </div>

            {/* Architecture Components */}
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-2">Modular Pipeline Blocks</div>
              <div className="grid grid-cols-2 gap-2">
                {activeModel.components.map((comp, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{comp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Configurable Hyperparameters */}
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Configurable Hyperparameters</span>
            </div>

            <div className="space-y-3">
              {activeModel.hyperparameters.map((hp) => (
                <div key={hp.key} className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-200">{hp.label}</span>
                    <span className="font-mono text-cyan-300">{hp.default}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{hp.desc}</p>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActivePage('training')}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Proceed to Training Studio with {activeModel.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
