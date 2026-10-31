import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Download, Settings2, Sliders, Activity, Info, Sparkles, FlaskConical } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { systemApi } from '../api/client'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

export const SYSTEMS = [
  {
    id: 'pendulum',
    name: 'Nonlinear Pendulum',
    category: 'Mechanical / Rotational',
    equation: 'd²θ/dt² = -(g/L)·sin(θ) - [b/(m·L²)]·(dθ/dt) + u/(m·L²)\ny = θ',
    description: 'A rigid pendulum oscillating under gravity with large-angle sin(θ) restoring torque, viscous damping, and torque excitation.',
    interpretation: 'Classic benchmark demonstrating subharmonic bifurcation and strong geometric nonlinearity as oscillation angle exceeds the small-angle linear range.',
    stateNames: ['θ (angle, rad)', 'ω (angular velocity, rad/s)'],
    params: {
      m: { default: 1.0, min: 0.1, max: 5.0, step: 0.1, label: 'Pendulum Mass m (kg)' },
      L: { default: 1.0, min: 0.2, max: 3.0, step: 0.1, label: 'Rod Length L (m)' },
      b: { default: 0.2, min: 0.01, max: 2.0, step: 0.05, label: 'Viscous Friction b (N·s/m)' },
      g: { default: 9.81, min: 1.62, max: 24.8, step: 0.1, label: 'Gravity Acceleration g (m/s²)' },
      theta0: { default: 0.6, min: -3.14, max: 3.14, step: 0.1, label: 'Initial Angle θ₀ (rad)' },
      omega0: { default: 0.0, min: -5.0, max: 5.0, step: 0.2, label: 'Initial Angular Vel ω₀ (rad/s)' },
      t_end: { default: 20, min: 5, max: 60, step: 5, label: 'Simulation Duration (s)' },
      dt: { default: 0.05, min: 0.01, max: 0.1, step: 0.01, label: 'Time Step Δt (s)' },
      u_amp: { default: 0.8, min: 0.0, max: 5.0, step: 0.1, label: 'Input Torque Amp (N·m)' },
      u_freq: { default: 0.5, min: 0.1, max: 3.0, step: 0.1, label: 'Excitation Frequency (Hz)' },
    }
  },
  {
    id: 'vanderpol',
    name: 'Van der Pol Oscillator',
    category: 'Self-Excited / Limit Cycle',
    equation: 'd²x/dt² - μ·(1 - x²)·(dx/dt) + ω₀²·x = u\ny = x',
    description: 'Nonlinear relaxation oscillator with negative damping at small amplitudes and positive dissipation at large excursions.',
    interpretation: 'Models self-sustained oscillations, limit cycle attractors, and biological rhythms (heart action potentials, circadian oscillators).',
    stateNames: ['x (displacement)', 'v (velocity)'],
    params: {
      mu: { default: 1.5, min: 0.1, max: 5.0, step: 0.1, label: 'Nonlinearity Parameter μ' },
      omega0: { default: 1.0, min: 0.2, max: 3.0, step: 0.1, label: 'Natural Frequency ω₀ (rad/s)' },
      x0: { default: 0.2, min: -3.0, max: 3.0, step: 0.1, label: 'Initial Position x₀' },
      v0: { default: 0.0, min: -3.0, max: 3.0, step: 0.1, label: 'Initial Velocity v₀' },
      t_end: { default: 25, min: 5, max: 60, step: 5, label: 'Simulation Duration (s)' },
      dt: { default: 0.05, min: 0.01, max: 0.1, step: 0.01, label: 'Time Step Δt (s)' },
      u_amp: { default: 0.5, min: 0.0, max: 3.0, step: 0.1, label: 'Input Forcing Amp' },
      u_freq: { default: 0.25, min: 0.05, max: 2.0, step: 0.05, label: 'Excitation Frequency (Hz)' },
    }
  },
  {
    id: 'duffing',
    name: 'Duffing Oscillator',
    category: 'Chaotic / Multi-Well Potential',
    equation: 'd²x/dt² + δ·(dx/dt) + α·x + β·x³ = F·cos(ω·t)\ny = x',
    description: 'Damped non-linear oscillator with cubic restorative stiffness exhibiting hysteresis, jump phenomena, and deterministic chaos.',
    interpretation: 'Represents buckled elastic beams, plasma oscillations, and nonlinear mechanical resonance with hard/soft spring behaviors.',
    stateNames: ['x₁ (displacement)', 'x₂ (velocity)'],
    params: {
      alpha: { default: -1.0, min: -3.0, max: 3.0, step: 0.1, label: 'Linear Stiffness α' },
      beta: { default: 1.0, min: 0.1, max: 4.0, step: 0.1, label: 'Nonlinear Cubic Stiffness β' },
      delta: { default: 0.3, min: 0.01, max: 1.5, step: 0.05, label: 'Damping Coefficient δ' },
      x0: { default: 0.2, min: -2.0, max: 2.0, step: 0.1, label: 'Initial Condition x₀' },
      v0: { default: 0.0, min: -2.0, max: 2.0, step: 0.1, label: 'Initial Condition v₀' },
      t_end: { default: 30, min: 5, max: 80, step: 5, label: 'Simulation Duration (s)' },
      dt: { default: 0.05, min: 0.01, max: 0.1, step: 0.01, label: 'Time Step Δt (s)' },
      u_amp: { default: 0.5, min: 0.0, max: 2.0, step: 0.05, label: 'Forcing Amplitude F' },
      u_freq: { default: 1.2, min: 0.1, max: 3.0, step: 0.1, label: 'Forcing Frequency ω (rad/s)' },
    }
  },
  {
    id: 'tank',
    name: 'Nonlinear Tank-Level System',
    category: 'Hydraulic / Process Control',
    equation: 'dh/dt = [k_in·u - k_out·√h] / A\ny = h',
    description: 'Single-tank liquid reservoir with gravity-driven Torricelli discharge through an orifice showing square-root nonlinearity.',
    interpretation: 'Fundamental chemical process control system where effective system gain and time constant vary inversely with height √h.',
    stateNames: ['h (water level, m)'],
    params: {
      A: { default: 1.0, min: 0.2, max: 5.0, step: 0.1, label: 'Cross-Section Area A (m²)' },
      k_in: { default: 1.0, min: 0.2, max: 3.0, step: 0.1, label: 'Inflow Coefficient k_in' },
      k_out: { default: 0.5, min: 0.1, max: 2.0, step: 0.05, label: 'Outflow Orifice k_out' },
      h0: { default: 0.5, min: 0.05, max: 3.0, step: 0.1, label: 'Initial Liquid Level h₀ (m)' },
      t_end: { default: 35, min: 10, max: 100, step: 5, label: 'Simulation Duration (s)' },
      dt: { default: 0.1, min: 0.02, max: 0.2, step: 0.02, label: 'Time Step Δt (s)' },
      u_amp: { default: 0.8, min: 0.1, max: 2.5, step: 0.1, label: 'Pump Inflow Amplitude u' },
      u_freq: { default: 0.1, min: 0.02, max: 1.0, step: 0.02, label: 'Input Frequency (Hz)' },
    }
  },
  {
    id: 'thermal',
    name: 'Nonlinear Thermal System',
    category: 'Thermal / Heat Transfer',
    equation: 'C·dT/dt = u - h·(T - T_amb) - ε·σ·(T⁴ - T_amb⁴)\ny = T',
    description: 'Thermal furnace or heated rod combining linear Newton convective cooling and quartic (T⁴) Stefan-Boltzmann thermal radiation.',
    interpretation: 'Demonstrates radiation dominance at elevated temperatures where linear thermal transfer approximations completely fail.',
    stateNames: ['T (temperature, °C)'],
    params: {
      C: { default: 2.0, min: 0.5, max: 10.0, step: 0.5, label: 'Thermal Capacitance C (J/K)' },
      h_conv: { default: 0.8, min: 0.1, max: 3.0, step: 0.1, label: 'Convective Heat Coeff h' },
      epsilon: { default: 0.6, min: 0.1, max: 1.0, step: 0.05, label: 'Surface Emissivity ε' },
      T_amb: { default: 25.0, min: 0.0, max: 50.0, step: 5.0, label: 'Ambient Temp T_amb (°C)' },
      T0: { default: 30.0, min: 10.0, max: 100.0, step: 5.0, label: 'Initial Temp T₀ (°C)' },
      t_end: { default: 35, min: 10, max: 100, step: 5, label: 'Simulation Duration (s)' },
      dt: { default: 0.1, min: 0.02, max: 0.2, step: 0.02, label: 'Time Step Δt (s)' },
      u_amp: { default: 45.0, min: 5.0, max: 120.0, step: 5.0, label: 'Heater Power Input u (W)' },
      u_freq: { default: 0.06, min: 0.01, max: 0.5, step: 0.01, label: 'Heating Cycle Freq (Hz)' },
    }
  },
  {
    id: 'custom_discrete',
    name: 'Custom Discrete-Time System',
    category: 'Digital / Narendra Benchmark',
    equation: 'y(k) = [a₁·y(k-1)] / [1 + y(k-1)²] + b₁·u(k-1) + c₁·u(k-1)²\ny = output',
    description: 'Narendra-Parthasarathy benchmark rational difference equation used widely in nonlinear digital system identification literature.',
    interpretation: 'Exhibits amplitude-dependent saturation and quadratic harmonic generation in discrete time domains.',
    stateNames: ['y(k) (discrete state)'],
    params: {
      a1: { default: 0.8, min: 0.1, max: 1.5, step: 0.05, label: 'State Feedback Gain a₁' },
      b1: { default: 0.4, min: 0.05, max: 1.2, step: 0.05, label: 'Linear Input Gain b₁' },
      c1: { default: 0.15, min: 0.0, max: 0.8, step: 0.05, label: 'Quadratic Input Gain c₁' },
      y0: { default: 0.0, min: -2.0, max: 2.0, step: 0.1, label: 'Initial State y(0)' },
      t_end: { default: 20, min: 5, max: 60, step: 5, label: 'Simulation Duration (s)' },
      dt: { default: 0.05, min: 0.01, max: 0.1, step: 0.01, label: 'Sample Period Δt (s)' },
      u_amp: { default: 1.0, min: 0.1, max: 3.0, step: 0.1, label: 'Excitation Amplitude' },
      u_freq: { default: 0.5, min: 0.1, max: 2.0, step: 0.1, label: 'Excitation Frequency (Hz)' },
    }
  },
  {
    id: 'nonlinear_first_order',
    name: 'Nonlinear First-Order System',
    category: 'Polynomial / Input Saturation',
    equation: 'dx/dt = -a·x + b·tanh(u) + c·x²\ny = x',
    description: 'Single-state continuous system with smooth hyperbolic tangent input saturation and quadratic state nonlinearity.',
    interpretation: 'Models saturated actuator dynamics coupled with quadratic aerodynamic drag or chemical reaction rate.',
    stateNames: ['x (state)'],
    params: {
      a: { default: 1.0, min: 0.2, max: 4.0, step: 0.1, label: 'Linear Damping a' },
      b: { default: 2.0, min: 0.2, max: 5.0, step: 0.1, label: 'Actuator Gain b' },
      c: { default: 0.1, min: -0.4, max: 0.4, step: 0.05, label: 'Quadratic Term c' },
      x0: { default: 0.0, min: -2.0, max: 2.0, step: 0.1, label: 'Initial State x₀' },
      t_end: { default: 20, min: 5, max: 60, step: 5, label: 'Simulation Duration (s)' },
      dt: { default: 0.05, min: 0.01, max: 0.1, step: 0.01, label: 'Time Step Δt (s)' },
      u_amp: { default: 1.2, min: 0.1, max: 4.0, step: 0.1, label: 'Input Amplitude' },
      u_freq: { default: 0.5, min: 0.1, max: 2.0, step: 0.1, label: 'Input Frequency (Hz)' },
    }
  },
  {
    id: 'second_order',
    name: 'Nonlinear Second-Order Dynamic',
    category: 'Oscillatory / Bounded',
    equation: 'dx₁/dt = x₂; dx₂/dt = -α·x₁ - β·x₂ + γ·tanh(u)\ny = x₁',
    description: 'Second-order mass-spring-damper assembly subjected to actuator saturation forcing.',
    interpretation: 'Fundamental building block for servomechanisms, robotic joint positioning, and aerospace control surfaces.',
    stateNames: ['x₁ (position)', 'x₂ (velocity)'],
    params: {
      alpha: { default: 1.0, min: 0.2, max: 5.0, step: 0.1, label: 'Stiffness Parameter α' },
      beta: { default: 0.5, min: 0.05, max: 3.0, step: 0.05, label: 'Damping Parameter β' },
      gamma: { default: 3.0, min: 0.5, max: 8.0, step: 0.5, label: 'Gain Parameter γ' },
      t_end: { default: 20, min: 5, max: 60, step: 5, label: 'Simulation Duration (s)' },
      dt: { default: 0.05, min: 0.01, max: 0.1, step: 0.01, label: 'Time Step Δt (s)' },
      u_amp: { default: 1.0, min: 0.1, max: 4.0, step: 0.1, label: 'Input Amplitude' },
      u_freq: { default: 0.5, min: 0.1, max: 2.0, step: 0.1, label: 'Input Frequency (Hz)' },
    }
  },
  {
    id: 'dc_motor',
    name: 'DC Motor (Nonlinear Friction)',
    category: 'Electromechanical / Friction',
    equation: 'dω/dt = (Kt·i - b·ω - 0.1·ω·|ω|) / J\ndi/dt = (u - Ke·ω - R·i) / L\ny = ω',
    description: 'Armature-controlled direct current motor exhibiting electrical inductance and quadratic aerodynamic friction.',
    interpretation: 'Demonstrates coupled electrical-mechanical state dynamics with non-smooth friction characteristics.',
    stateNames: ['ω (angular vel, rad/s)', 'i (current, A)'],
    params: {
      J: { default: 0.01, min: 0.002, max: 0.05, step: 0.002, label: 'Rotor Inertia J (kg·m²)' },
      b_friction: { default: 0.1, min: 0.01, max: 0.5, step: 0.02, label: 'Linear Friction b' },
      Kt: { default: 0.1, min: 0.02, max: 0.3, step: 0.02, label: 'Torque Constant Kt (N·m/A)' },
      Ke: { default: 0.1, min: 0.02, max: 0.3, step: 0.02, label: 'Back-EMF Ke (V·s/rad)' },
      R: { default: 1.0, min: 0.2, max: 5.0, step: 0.2, label: 'Armature Resistance R (Ω)' },
      L: { default: 0.5, min: 0.05, max: 2.0, step: 0.05, label: 'Armature Inductance L (H)' },
      t_end: { default: 10, min: 3, max: 30, step: 2, label: 'Simulation Duration (s)' },
      dt: { default: 0.01, min: 0.005, max: 0.05, step: 0.005, label: 'Time Step Δt (s)' },
      u_amp: { default: 12.0, min: 2.0, max: 24.0, step: 1.0, label: 'Supply Voltage u (V)' },
      u_freq: { default: 0.5, min: 0.1, max: 2.0, step: 0.1, label: 'Voltage Frequency (Hz)' },
    }
  },
]

const INPUT_TYPES = [
  { id: 'sine', label: 'Sinusoidal Wave' },
  { id: 'step', label: 'Step Input' },
  { id: 'chirp', label: 'Frequency Sweep (Chirp)' },
  { id: 'prbs', label: 'PRBS (Pseudo-Random Binary)' },
  { id: 'multisine', label: 'Multisine Harmonic' },
  { id: 'square', label: 'Square Wave' },
]

export const SystemPlayground: React.FC = () => {
  const { selectedSystem, setSelectedSystem, simulationData, setSimulationData, systemParams, setSystemParams } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputType, setInputType] = useState('sine')
  const [addNoise, setAddNoise] = useState(false)
  const [noiseLevel, setNoiseLevel] = useState(0.02)
  const [activeTab, setActiveTab] = useState<'response' | 'phase'>('response')
  const [isPaused, setIsPaused] = useState(false)

  const currentSys = SYSTEMS.find(s => s.id === selectedSystem) || SYSTEMS[0]

  const getCurrentParamValues = () => {
    const vals: Record<string, number> = {}
    Object.entries(currentSys.params).forEach(([k, def]) => {
      vals[k] = systemParams[k] ?? def.default
    })
    vals.u_type = inputType as any
    if (addNoise) {
      vals.add_noise = 1
      vals.noise_level = noiseLevel
    }
    return vals
  }

  const runSimulation = async () => {
    setLoading(true)
    setError(null)
    setIsPaused(false)
    try {
      const params = getCurrentParamValues()
      const data = await systemApi.simulate(selectedSystem, params)
      setSimulationData(data)
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Numerical simulation failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runSimulation()
  }, [selectedSystem, inputType])

  const handleParamChange = (key: string, value: number) => {
    setSystemParams({ ...systemParams, [key]: value })
  }

  const handleResetParams = () => {
    const defaults: Record<string, number> = {}
    Object.entries(currentSys.params).forEach(([k, def]) => {
      defaults[k] = def.default
    })
    setSystemParams(defaults)
  }

  const exportCSV = () => {
    if (!simulationData) return
    const rows = simulationData.t.map((t, i) => `${t},${simulationData.u[i]},${simulationData.y[i]}`)
    const csvContent = `time,input_u,output_y\n${rows.join('\n')}`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedSystem}_simulation_data.csv`
    a.click()
  }

  // Build chart dataset
  const chartData = simulationData?.t ? simulationData.t.map((ti, i) => ({
    time: parseFloat(ti.toFixed(3)),
    input: parseFloat((simulationData.u[i] ?? 0).toFixed(4)),
    output: parseFloat((simulationData.y[i] ?? 0).toFixed(4)),
  })) : []

  // Build phase portrait dataset if states exist
  const phaseData = (simulationData?.states && Object.keys(simulationData.states).length >= 2)
    ? (() => {
        const keys = Object.keys(simulationData.states)
        const s1 = simulationData.states[keys[0]]
        const s2 = simulationData.states[keys[1]]
        return s1.map((x, i) => ({
          x1: parseFloat((x ?? 0).toFixed(4)),
          x2: parseFloat((s2[i] ?? 0).toFixed(4)),
        }))
      })()
    : []

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-cyan-400" />
              Nonlinear System Laboratory
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Runge-Kutta RK45 Solver
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate, perturb, and visualize continuous and discrete nonlinear systems governed by ordinary differential equations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runSimulation}
            disabled={loading}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{loading ? 'Solving ODE...' : 'Run Simulation'}</span>
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            disabled={!simulationData}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
          <button
            onClick={handleResetParams}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={exportCSV}
            disabled={!simulationData}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Preset Selector */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
          Select Dynamical System Model Preset
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {SYSTEMS.map(sys => {
            const isSelected = selectedSystem === sys.id
            return (
              <button
                key={sys.id}
                onClick={() => setSelectedSystem(sys.id)}
                className={`p-3 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-950/40'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-semibold truncate">{sys.name}</div>
                <div className="text-[10px] text-cyan-400/80 mt-0.5 truncate">{sys.category}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Grid: Left Controls, Right Dynamic Plots */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Controls Column */}
        <div className="lg:col-span-5 space-y-4">

          {/* Governing Equation Card */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Governing Differential Equation</span>
              <span className="text-[10px] text-slate-500 font-mono">{currentSys.category}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 whitespace-pre-wrap leading-relaxed">
              {currentSys.equation}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pt-1">
              {currentSys.description}
            </p>
          </div>

          {/* Physical Interpretation Card */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
              <Info className="w-4 h-4 text-violet-400" />
              <span>Physical & Engineering Interpretation</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {currentSys.interpretation}
            </p>
          </div>

          {/* Interactive Parameter Sliders */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Physical System Parameters</span>
              </div>
              <button onClick={runSimulation} className="text-[11px] text-cyan-400 hover:text-cyan-300">
                Apply & Solve
              </button>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
              {Object.entries(currentSys.params).map(([key, def]) => {
                const val = systemParams[key] ?? def.default
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{def.label}</span>
                      <span className="font-mono text-cyan-300">{val}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={def.min}
                        max={def.max}
                        step={def.step}
                        value={val}
                        onChange={(e) => handleParamChange(key, parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                      />
                      <input
                        type="number"
                        min={def.min}
                        max={def.max}
                        step={def.step}
                        value={val}
                        onChange={(e) => handleParamChange(key, parseFloat(e.target.value))}
                        className="w-16 px-1.5 py-0.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded text-right text-slate-200"
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Input Signal & Noise Disturbances */}
            <div className="border-t border-slate-800 pt-3 space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Input Excitation Signal Type u(t)</label>
                <select
                  value={inputType}
                  onChange={(e) => setInputType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  {INPUT_TYPES.map(it => (
                    <option key={it.id} value={it.id}>{it.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={addNoise}
                    onChange={(e) => setAddNoise(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-cyan-500"
                  />
                  <span>Add Sensor Measurement Noise</span>
                </label>
                {addNoise && (
                  <span className="font-mono text-xs text-amber-400">
                    {(noiseLevel * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              {addNoise && (
                <input
                  type="range"
                  min={0.005}
                  max={0.15}
                  step={0.005}
                  value={noiseLevel}
                  onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                />
              )}
            </div>

          </div>

        </div>

        {/* Right Dynamic Visualization Charts Column */}
        <div className="lg:col-span-7 space-y-4">

          {/* Chart View Switcher */}
          <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-2 rounded-2xl">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('response')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'response'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Time-Domain Response (u & y)
              </button>
              <button
                onClick={() => setActiveTab('phase')}
                disabled={phaseData.length === 0}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'phase'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 disabled:opacity-40'
                }`}
              >
                Phase Portrait (State 1 vs State 2)
              </button>
            </div>

            <div className="text-[11px] text-slate-400 pr-2">
              Samples: <span className="font-mono text-cyan-300">{chartData.length}</span>
            </div>
          </div>

          {/* Response Chart */}
          {activeTab === 'response' && (
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">System Dynamics Trajectory</span>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Output y(t)
                  </span>
                  <span className="flex items-center gap-1.5 text-violet-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-400" /> Input u(t)
                  </span>
                </div>
              </div>

              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                    <XAxis
                      dataKey="time"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      unit="s"
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#020617',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="output"
                      name="Output y(t)"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="input"
                      name="Input u(t)"
                      stroke="#a855f7"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Phase Portrait Chart */}
          {activeTab === 'phase' && (
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  State-Space Phase Trajectory: {currentSys.stateNames.join(' vs ')}
                </span>
                <span className="text-xs text-slate-500 font-mono">Limit Cycle & Attractor Analysis</span>
              </div>

              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={phaseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                    <XAxis
                      dataKey="x1"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      name="State x1"
                    />
                    <YAxis
                      dataKey="x2"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      name="State x2"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#020617',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="x2"
                      stroke="#06b6d4"
                      strokeWidth={1.8}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* System Numerical States Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-center">
              <div className="text-[10px] text-slate-400 uppercase">Max Output Amplitude</div>
              <div className="text-base font-mono font-bold text-cyan-300 mt-0.5">
                {simulationData?.y ? Math.max(...simulationData.y).toFixed(3) : '—'}
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-center">
              <div className="text-[10px] text-slate-400 uppercase">Min Output Amplitude</div>
              <div className="text-base font-mono font-bold text-violet-300 mt-0.5">
                {simulationData?.y ? Math.min(...simulationData.y).toFixed(3) : '—'}
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-center">
              <div className="text-[10px] text-slate-400 uppercase">RMS Energy Value</div>
              <div className="text-base font-mono font-bold text-emerald-300 mt-0.5">
                {simulationData?.y ? Math.sqrt(simulationData.y.reduce((a, b) => a + b * b, 0) / simulationData.y.length).toFixed(3) : '—'}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
