import React, { useState } from 'react'
import { Cpu, Activity, Plus, ArrowRight, Info, CheckCircle2, Layers } from 'lucide-react'

export const BlockDiagramEditor: React.FC = () => {
  const [selectedBlock, setSelectedBlock] = useState<'input' | 'physics' | 'residual' | 'sum' | 'output'>('physics')

  const blockDetails = {
    input: {
      title: 'Input Excitation Signal u(t)',
      type: 'Source Node',
      desc: 'Generates control inputs (sinusoidal, step, chirp, PRBS, or user-drawn waveform) applied to the dynamic system.',
      equation: 'u(t) = A·sin(2πf·t) + Noise',
      probe: 'Amplitude: 1.0 V | Freq: 0.5 Hz | SNR: 32 dB',
    },
    physics: {
      title: 'First-Principles Physics Model',
      type: 'Mechanistic Core',
      desc: 'Baseline ODE differential equations derived from physical laws (Newton, Torricelli, Kirchhoff, Euler-Lagrange).',
      equation: 'dx/dt = -a·x + b·tanh(u) + c·x²',
      probe: 'State x(t) solved via RK45 4th-order Runge-Kutta solver.',
    },
    residual: {
      title: 'Residual Neural Network (MLP / ANFIS)',
      type: 'Data-Driven AI Core',
      desc: 'Deep neural network or fuzzy inference system trained on unmodeled dynamics (residual error e = y_actual - y_physics).',
      equation: 'e_nn(k) = MLP(u(k-1..k-p), y(k-1..k-p))',
      probe: 'Hidden Layers: [32, 32] | Loss: 1.42e-4 | Epochs: 200',
    },
    sum: {
      title: 'Hybrid Physics-AI Integrator (+)',
      type: 'Additive Fusion',
      desc: 'Superimposes physical baseline prediction with AI residual correction to produce physics-bounded output.',
      equation: 'ŷ(k) = y_physics(k) + e_residual(k)',
      probe: 'Physics Weight: 1.00 | AI Correction Weight: 1.00',
    },
    output: {
      title: 'Predicted System Response ŷ(t)',
      type: 'Target Output',
      desc: 'Final high-fidelity predicted trajectory matching ground-truth experimental data across operating bounds.',
      equation: 'Test RMSE: 0.0215 | R² Score: 0.9924',
      probe: 'Held-out test set accuracy: 96.8% fit percentage.',
    },
  }

  const active = blockDetails[selectedBlock]

  return (
    <div className="card p-6 space-y-6 border border-navy-700 bg-navy-900">
      <div className="flex justify-between items-center border-b border-navy-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Interactive Hybrid AI Architecture & Signal Probes
          </h2>
          <p className="text-xs text-slate-400">
            Click any block component to inspect signal flow, equations, and active feature maps.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
          Interactive Probe Mode
        </span>
      </div>

      {/* Block Diagram Flow Graph */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center py-4 px-2 bg-navy-950 rounded-xl border border-navy-800 relative overflow-hidden">
        {/* Input Block */}
        <button
          onClick={() => setSelectedBlock('input')}
          className={`p-4 rounded-lg border text-left transition-all ${
            selectedBlock === 'input'
              ? 'border-cyan-400 bg-cyan-500/15 shadow-lg shadow-cyan-500/10'
              : 'border-navy-700 bg-navy-900 hover:border-slate-600'
          }`}
        >
          <div className="text-xs font-mono text-cyan-400">NODE 1</div>
          <div className="text-sm font-bold text-slate-100">Input u(t)</div>
          <div className="text-[10px] text-slate-400 mt-1">Excitation Signal</div>
        </button>

        {/* Physics Block */}
        <button
          onClick={() => setSelectedBlock('physics')}
          className={`p-4 rounded-lg border text-left transition-all ${
            selectedBlock === 'physics'
              ? 'border-teal-400 bg-teal-500/15 shadow-lg shadow-teal-500/10'
              : 'border-navy-700 bg-navy-900 hover:border-slate-600'
          }`}
        >
          <div className="text-xs font-mono text-teal-400">NODE 2</div>
          <div className="text-sm font-bold text-slate-100">Physics ODE</div>
          <div className="text-[10px] text-slate-400 mt-1">First Principles</div>
        </button>

        {/* Residual Block */}
        <button
          onClick={() => setSelectedBlock('residual')}
          className={`p-4 rounded-lg border text-left transition-all ${
            selectedBlock === 'residual'
              ? 'border-violet-400 bg-violet-500/15 shadow-lg shadow-violet-500/10'
              : 'border-navy-700 bg-navy-900 hover:border-slate-600'
          }`}
        >
          <div className="text-xs font-mono text-violet-400">NODE 3</div>
          <div className="text-sm font-bold text-slate-100">AI Residual</div>
          <div className="text-[10px] text-slate-400 mt-1">Neural Predictor</div>
        </button>

        {/* Sum Block */}
        <button
          onClick={() => setSelectedBlock('sum')}
          className={`p-4 rounded-lg border text-left transition-all ${
            selectedBlock === 'sum'
              ? 'border-amber-400 bg-amber-500/15 shadow-lg shadow-amber-500/10'
              : 'border-navy-700 bg-navy-900 hover:border-slate-600'
          }`}
        >
          <div className="text-xs font-mono text-amber-400">NODE 4</div>
          <div className="text-sm font-bold text-slate-100">Summation (+)</div>
          <div className="text-[10px] text-slate-400 mt-1">Hybrid Integrator</div>
        </button>

        {/* Output Block */}
        <button
          onClick={() => setSelectedBlock('output')}
          className={`p-4 rounded-lg border text-left transition-all ${
            selectedBlock === 'output'
              ? 'border-emerald-400 bg-emerald-500/15 shadow-lg shadow-emerald-500/10'
              : 'border-navy-700 bg-navy-900 hover:border-slate-600'
          }`}
        >
          <div className="text-xs font-mono text-emerald-400">NODE 5</div>
          <div className="text-sm font-bold text-slate-100">Predicted ŷ(t)</div>
          <div className="text-[10px] text-slate-400 mt-1">Final Trajectory</div>
        </button>
      </div>

      {/* Selected Node Inspection Panel */}
      <div className="p-4 rounded-lg bg-navy-950 border border-navy-800 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">{active.type}</span>
            <h3 className="text-base font-bold text-cyan-300">{active.title}</h3>
          </div>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Signal Active
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">{active.desc}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-navy-900 rounded border border-navy-800 font-mono text-xs text-cyan-400">
            <div className="text-[10px] text-slate-500 mb-1">Mathematical Relation</div>
            {active.equation}
          </div>
          <div className="p-3 bg-navy-900 rounded border border-navy-800 font-mono text-xs text-violet-400">
            <div className="text-[10px] text-slate-500 mb-1">Active Probe Data</div>
            {active.probe}
          </div>
        </div>
      </div>
    </div>
  )
}
