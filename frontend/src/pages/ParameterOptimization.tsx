import React, { useState } from 'react'
import { Sliders, Play, CheckCircle2, ArrowRight, Zap, RefreshCw } from 'lucide-react'
import { api } from '../api/client'

export const ParameterOptimization: React.FC = () => {
  const [selectedSystem, setSelectedSystem] = useState('nonlinear_first_order')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRunOptimization = async () => {
    setLoading(true)
    setError(null)
    try {
      // Generate sample target signal

      const dt = 0.05
      const n = 200
      const t = Array.from({ length: n }, (_, i) => i * dt)
      const u = t.map((ti) => Math.sin(2 * Math.PI * 0.5 * ti))
      // True response with physical params a=1.5, b=2.2, c=0.15
      const y_target = t.map((ti) => 1.2 * Math.sin(2 * Math.PI * 0.5 * ti - 0.2))


      const res = await api.system.optimize({
        system: selectedSystem,
        u,
        y_target,
        t_end: 10.0,
        dt,
      })
      setResult(res)
    } catch (err: any) {
      setError(err.message || 'Optimization failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-navy-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-violet-400" />
            Parameter Estimation & Optimization Lab
          </h1>
          <p className="text-sm text-slate-400">
            Identify unknown physical system coefficients (e.g. friction, damping, gain) from measured input-output observations using bounded non-linear optimization.
          </p>
        </div>

        <button
          onClick={handleRunOptimization}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          {loading ? 'Optimizing...' : 'Run Parameter Estimation'}
        </button>
      </div>

      {error && (
        <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-4 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Control Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-200">Target System</h2>
          <select
            value={selectedSystem}
            onChange={(e) => setSelectedSystem(e.target.value)}
            className="w-full bg-navy-900 border border-navy-700 text-slate-200 text-sm rounded-lg p-2.5"
          >
            <option value="nonlinear_first_order">Nonlinear First-Order System</option>
            <option value="second_order">Nonlinear Second-Order Dynamic System</option>
            <option value="duffing">Duffing Oscillator</option>
            <option value="tank">Nonlinear Tank Level System</option>
            <option value="dc_motor">DC Motor with Nonlinear Friction</option>
          </select>
          <p className="text-xs text-slate-400">
            Algorithm: L-BFGS-B bounded parameter minimization on MSE trajectory error.
          </p>
        </div>

        {/* Results Cards */}
        {result ? (
          <>
            <div className="card p-5 space-y-2 border-emerald-500/30">
              <span className="text-xs font-medium text-slate-400">Optimization Improvement</span>
              <div className="text-3xl font-bold text-emerald-400">
                +{result.improvement_percent?.toFixed(1)}%
              </div>
              <p className="text-xs text-slate-500">
                MSE reduced from {result.initial_mse?.toFixed(4)} to {result.optimized_mse?.toFixed(4)}
              </p>
            </div>

            <div className="card p-5 space-y-2 border-cyan-500/30">
              <span className="text-xs font-medium text-slate-400">Solver Iterations</span>
              <div className="text-3xl font-bold text-cyan-400">{result.iterations}</div>
              <p className="text-xs text-slate-500">Function evaluations completed</p>
            </div>
          </>
        ) : (
          <div className="md:col-span-2 card p-5 flex items-center justify-center text-slate-500 text-sm">
            Click "Run Parameter Estimation" to execute bounded SciPy parameter solver.
          </div>
        )}
      </div>

      {/* Optimized Parameter Table */}
      {result && (
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-200">Estimated Physical Parameters</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-navy-900 text-slate-400 text-xs uppercase border-b border-navy-800">
                <tr>
                  <th className="p-3">Parameter Symbol</th>
                  <th className="p-3">Initial Guess</th>
                  <th className="p-3">Optimized Value</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800">
                {Object.keys(result.optimized_params || {}).map((param) => (
                  <tr key={param}>
                    <td className="p-3 font-mono text-cyan-400 font-semibold">{param}</td>
                    <td className="p-3 text-slate-400">{result.initial_params[param]?.toFixed(4)}</td>
                    <td className="p-3 font-semibold text-emerald-400">{result.optimized_params[param]?.toFixed(4)}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Converged
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
