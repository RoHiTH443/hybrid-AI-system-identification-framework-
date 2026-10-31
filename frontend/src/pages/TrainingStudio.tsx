import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Play, Pause, X, RotateCcw, Sliders, CheckCircle2, AlertCircle,
  Clock, TrendingUp, Cpu, Database, Award, ArrowRight, ShieldAlert,
  Loader2, Terminal, PlaySquare, Activity
} from 'lucide-react'
import { useAppStore, type TrainingJob } from '../store/appStore'
import { trainingApi } from '../api/client'
import { MODEL_CATALOG } from './ModelBuilder'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

export const TrainingStudio: React.FC = () => {
  const { processedDataset, trainingJobs, upsertTrainingJob, activeJobId, setActiveJobId, setActivePage } = useAppStore()

  const [selectedModel, setSelectedModel] = useState<string>('hybrid_physics_ai')
  const [lagOrder, setLagOrder] = useState<number>(3)
  const [epochs, setEpochs] = useState<number>(150)
  const [learningRate, setLearningRate] = useState<number>(0.001)
  const [hiddenDim, setHiddenDim] = useState<number>(32)
  const [weightDecay, setWeightDecay] = useState<number>(0.0001)

  const [currentJobId, setCurrentJobId] = useState<string | null>(activeJobId)
  const [trainingLogs, setTrainingLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const currentJob = currentJobId ? trainingJobs[currentJobId] : null

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [trainingLogs])

  // Polling for live status while running
  useEffect(() => {
    if (!currentJobId) return
    const job = trainingJobs[currentJobId]
    if (!job || job.status === 'complete' || job.status === 'failed' || job.status === 'cancelled') {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      return
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await trainingApi.status(currentJobId)
        const updated = res.data
        upsertTrainingJob({
          ...(job || {}),
          ...updated,
        })

        if (updated.epoch !== undefined && updated.train_loss !== undefined) {
          const logLine = `[Epoch ${updated.epoch}/${updated.total_epochs}] Train Loss: ${updated.train_loss.toFixed(6)} | Val Loss: ${updated.val_loss.toFixed(6)} (${updated.elapsed.toFixed(1)}s)`
          setTrainingLogs(prev => {
            if (prev.length > 0 && prev[prev.length - 1].startsWith(`[Epoch ${updated.epoch}/`)) {
              return prev
            }
            return [...prev.slice(-80), logLine]
          })
        }

        if (updated.status === 'complete') {
          setTrainingLogs(prev => [...prev, `[COMPLETE] Training successfully finished. Test RMSE: ${updated.metrics?.rmse?.toFixed(4) || 'N/A'}`])
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        } else if (updated.status === 'failed') {
          setTrainingLogs(prev => [...prev, `[FAILED] Training failed: ${updated.error || 'Unknown error'}`])
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        }
      } catch (err) {
        // silently ignore brief network glitch
      }
    }, 600)

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [currentJobId, currentJob?.status])

  const handleStartTraining = async () => {
    if (!processedDataset) {
      setError('No preprocessed dataset loaded. Please visit the Dataset Explorer to partition your training samples.')
      return
    }
    setError(null)
    setIsStarting(true)
    const newJobId = `${selectedModel}_${Date.now()}`
    setCurrentJobId(newJobId)
    setActiveJobId(newJobId)
    setTrainingLogs([
      `[INIT] Initializing ${selectedModel.toUpperCase()} architecture...`,
      `[DATA] Train samples: ${processedDataset.X_train.length}, Val samples: ${processedDataset.X_val.length}, Test samples: ${processedDataset.X_test.length}`,
      `[HYPERPARAMS] Lag: ${lagOrder}, Epochs: ${epochs}, LR: ${learningRate}, Hidden: [${hiddenDim}, ${hiddenDim}]`,
      `[START] Dispatching optimization job to PyTorch backend...`
    ])

    try {
      await trainingApi.start({
        model_type: selectedModel,
        X_train: processedDataset.X_train,
        y_train: processedDataset.y_train,
        X_val: processedDataset.X_val,
        y_val: processedDataset.y_val,
        X_test: processedDataset.X_test,
        y_test: processedDataset.y_test,
        config: {
          job_id: newJobId,
          lag_order: lagOrder,
          epochs,
          lr: learningRate,
          hidden_dims: [hiddenDim, hiddenDim],
          weight_decay: weightDecay,
          seed: 42,
        }
      })

      upsertTrainingJob({
        job_id: newJobId,
        model_type: selectedModel,
        status: 'running',
        epoch: 0,
        total_epochs: epochs,
        train_loss: 0,
        val_loss: 0,
        elapsed: 0,
      })
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to start training process.')
      setTrainingLogs(prev => [...prev, `[ERROR] Failed to start training: ${e.message}`])
    } finally {
      setIsStarting(false)
    }
  }

  const handleCancelTraining = async () => {
    if (!currentJobId) return
    try {
      await trainingApi.cancel(currentJobId)
      if (currentJob) {
        upsertTrainingJob({ ...currentJob, status: 'cancelled' })
      }
      setTrainingLogs(prev => [...prev, `[CANCELLED] Job cancelled by user.`])
    } catch (_) {}
  }

  // Build Loss Curve Data
  const lossData = (currentJob?.history?.epochs && currentJob.history.epochs.length > 0)
    ? currentJob.history.epochs.map((ep, i) => ({
        epoch: ep,
        train_loss: parseFloat((currentJob.history?.train_loss[i] ?? 0).toFixed(6)),
        val_loss: parseFloat((currentJob.history?.val_loss[i] ?? 0).toFixed(6)),
      }))
    : []

  const progressPercent = currentJob
    ? Math.min(100, Math.round((currentJob.epoch / Math.max(1, currentJob.total_epochs)) * 100))
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <PlaySquare className="w-6 h-6 text-cyan-400" />
            Model Training Studio
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time model training workspace with dynamic loss curves, early stopping checkpoints, and live console logging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentJob?.status === 'running' ? (
            <button
              onClick={handleCancelTraining}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel Training</span>
            </button>
          ) : (
            <button
              onClick={handleStartTraining}
              disabled={isStarting}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              {isStarting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isStarting ? 'Launching...' : 'Start Training Model'}</span>
            </button>
          )}

          {currentJob?.status === 'complete' && (
            <button
              onClick={() => setActivePage('forecasting')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <span>Test Forecasting</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Dataset Warning if Not Preprocessed */}
      {!processedDataset && (
        <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-300">No Preprocessed Data Detected</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Please generate or upload a dataset in the Dataset Explorer and partition into Train/Val/Test.</div>
          </div>
          <button
            onClick={() => setActivePage('dataset')}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl"
          >
            Go to Dataset Explorer
          </button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Hyperparameters & Setup */}
        <div className="lg:col-span-4 space-y-4">

          {/* Model Architecture Selection */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Target Model Architecture</span>
            </div>

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={currentJob?.status === 'running'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              {MODEL_CATALOG.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.family})</option>
              ))}
            </select>
          </div>

          {/* Hyperparameter Settings */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-3.5">
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Training Hyperparameters</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Lag Order p</span>
                <span className="font-mono text-cyan-300">{lagOrder}</span>
              </div>
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={lagOrder}
                onChange={(e) => setLagOrder(parseInt(e.target.value))}
                disabled={currentJob?.status === 'running'}
                className="w-full accent-cyan-500 h-1.5"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Training Epochs</span>
                <span className="font-mono text-cyan-300">{epochs}</span>
              </div>
              <input
                type="range"
                min={20}
                max={400}
                step={10}
                value={epochs}
                onChange={(e) => setEpochs(parseInt(e.target.value))}
                disabled={currentJob?.status === 'running'}
                className="w-full accent-cyan-500 h-1.5"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Learning Rate η</span>
                <span className="font-mono text-cyan-300">{learningRate}</span>
              </div>
              <input
                type="range"
                min={0.0002}
                max={0.01}
                step={0.0002}
                value={learningRate}
                onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                disabled={currentJob?.status === 'running'}
                className="w-full accent-cyan-500 h-1.5"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Hidden Units per Layer</span>
                <span className="font-mono text-cyan-300">{hiddenDim}</span>
              </div>
              <input
                type="range"
                min={16}
                max={128}
                step={16}
                value={hiddenDim}
                onChange={(e) => setHiddenDim(parseInt(e.target.value))}
                disabled={currentJob?.status === 'running'}
                className="w-full accent-cyan-500 h-1.5"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Weight Decay Regularization</span>
                <span className="font-mono text-cyan-300">{weightDecay}</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.005}
                step={0.0001}
                value={weightDecay}
                onChange={(e) => setWeightDecay(parseFloat(e.target.value))}
                disabled={currentJob?.status === 'running'}
                className="w-full accent-cyan-500 h-1.5"
              />
            </div>
          </div>

          {/* Dataset Status Summary */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-2 text-xs">
            <span className="font-semibold text-slate-300 uppercase tracking-wider">Partition Status</span>
            <div className="font-mono text-slate-400 space-y-1 pt-1">
              <div className="flex justify-between">
                <span>Training Samples:</span>
                <span className="text-cyan-300">{processedDataset?.X_train.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Validation Samples:</span>
                <span className="text-violet-300">{processedDataset?.X_val.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Held-Out Test Samples:</span>
                <span className="text-emerald-300">{processedDataset?.X_test.length ?? 0}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Live Training Loss Charts & Console */}
        <div className="lg:col-span-8 space-y-4">

          {/* Status & Progress Bar */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  currentJob?.status === 'running' ? 'bg-amber-400 animate-pulse' :
                  currentJob?.status === 'complete' ? 'bg-emerald-400' :
                  currentJob?.status === 'failed' ? 'bg-rose-400' : 'bg-slate-600'
                }`} />
                <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Status: {currentJob ? currentJob.status.toUpperCase() : 'IDLE'}
                </span>
              </div>
              <span className="text-xs font-mono text-cyan-400">
                {currentJob ? `Epoch ${currentJob.epoch} / ${currentJob.total_epochs} (${progressPercent}%)` : 'Ready'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Real-time Loss Curves Chart */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Loss Trajectory (MSE vs Epoch)</span>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Train Loss
                </span>
                <span className="flex items-center gap-1.5 text-violet-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-400" /> Validation Loss
                </span>
              </div>
            </div>

            <div className="h-[280px] w-full">
              {lossData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lossData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                    <XAxis dataKey="epoch" stroke="#64748b" fontSize={11} tickLine={false} unit="ep" />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#020617',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Line type="monotone" dataKey="train_loss" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="val_loss" stroke="#a855f7" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-2 border border-dashed border-slate-800 rounded-xl">
                  <Activity className="w-8 h-8 opacity-40 text-cyan-400" />
                  <span>Start training to stream live epoch MSE loss dynamics</span>
                </div>
              )}
            </div>
          </div>

          {/* Metrics Results Banner when complete */}
          {currentJob?.metrics && (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase">Test RMSE</span>
                <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">
                  {currentJob.metrics.rmse.toFixed(4)}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase">Test MAE</span>
                <div className="text-lg font-bold font-mono text-violet-300 mt-0.5">
                  {currentJob.metrics.mae.toFixed(4)}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase">R² Determination</span>
                <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5">
                  {currentJob.metrics.r2.toFixed(4)}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase">Normalized Fit %</span>
                <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
                  {currentJob.metrics.fit_percent.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* Terminal Console Logs */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs space-y-2 shadow-inner">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-2">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Optimization Engine Logs</span>
              </span>
              <span className="text-[10px] text-slate-500">FastAPI & PyTorch Worker</span>
            </div>

            <div className="max-h-44 overflow-y-auto space-y-1 text-slate-300 scrollbar-thin text-[11px]">
              {trainingLogs.length === 0 ? (
                <div className="text-slate-600 italic">No active logs. Click "Start Training Model" to launch optimizer.</div>
              ) : (
                trainingLogs.map((log, i) => (
                  <div key={i} className="leading-relaxed">
                    {log.startsWith('[Epoch') ? (
                      <span className="text-cyan-300">{log}</span>
                    ) : log.startsWith('[COMPLETE]') ? (
                      <span className="text-emerald-400 font-bold">{log}</span>
                    ) : log.startsWith('[ERROR]') || log.startsWith('[FAILED]') ? (
                      <span className="text-rose-400 font-bold">{log}</span>
                    ) : (
                      <span className="text-slate-400">{log}</span>
                    )}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
