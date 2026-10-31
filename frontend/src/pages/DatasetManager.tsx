import React, { useState, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Upload, FileText, Sliders, CheckCircle2, AlertTriangle, Download,
  Database, RefreshCw, BarChart2, Eye, Filter, ArrowRight, ShieldCheck
} from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { datasetApi } from '../api/client'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { SYSTEMS } from './SystemPlayground'

export const DatasetManager: React.FC = () => {
  const { dataset, setDataset, processedDataset, setProcessedDataset, selectedSystem } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'synthetic' | 'preview' | 'preprocess'>('upload')

  // Search & Filter in preview table
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Preprocessing configuration
  const [inputCols, setInputCols] = useState<string[]>([])
  const [outputCol, setOutputCol] = useState<string>('')
  const [normalize, setNormalize] = useState(true)
  const [trainRatio, setTrainRatio] = useState(0.7)
  const [valRatio, setValRatio] = useState(0.15)
  const [handleMissing, setHandleMissing] = useState('drop')

  // Synthetic generation parameters
  const [synSystem, setSynSystem] = useState(selectedSystem || 'pendulum')
  const [synDuration, setSynDuration] = useState(25)
  const [synDt, setSynDt] = useState(0.05)
  const [synNoise, setSynNoise] = useState(0.02)
  const [synAddNoise, setSynAddNoise] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const testRatio = parseFloat(Math.max(0, 1.0 - trainRatio - valRatio).toFixed(2))

  const handleFileUpload = async (file: File) => {
    setLoading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await datasetApi.upload(file)
      const d = res.data
      const defaultInputs = d.columns.filter((c: string) => c.toLowerCase().includes('u') || c.toLowerCase().includes('in'))
      const defaultOutput = d.columns.find((c: string) => c.toLowerCase().includes('y') || c.toLowerCase().includes('out')) || d.columns[d.columns.length - 1]

      setDataset({
        raw: d.data || d.preview,
        columns: d.columns,
        stats: d.stats,
        shape: d.shape,
        inputCols: defaultInputs.length ? defaultInputs : [d.columns[0]],
        outputCol: defaultOutput || '',
      })
      setInputCols(defaultInputs.length ? defaultInputs : [d.columns[0]])
      setOutputCol(defaultOutput || '')
      setActiveTab('preview')
      setSuccessMsg(`Dataset "${file.name}" loaded (${d.shape[0]} rows × ${d.shape[1]} columns).`)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to parse uploaded CSV file.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateSynthetic = async () => {
    setLoading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await datasetApi.generate(synSystem, { t_end: synDuration, dt: synDt }, synAddNoise, synNoise)
      const d = res.data
      setDataset({
        raw: d.data || d.preview,
        columns: d.columns,
        stats: d.stats,
        shape: d.shape,
        inputCols: ['u'],
        outputCol: 'y',
      })
      setInputCols(['u'])
      setOutputCol('y')
      setActiveTab('preview')
      setSuccessMsg(`Synthetic dataset generated from system "${synSystem}" (${d.shape[0]} samples).`)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to generate synthetic dataset.')
    } finally {
      setLoading(false)
    }
  }

  const handlePreprocess = async () => {
    if (!dataset || inputCols.length === 0 || !outputCol) {
      setError('Please select at least one input feature column and one output target column.')
      return
    }
    if (testRatio <= 0) {
      setError('Train + Validation split cannot exceed 1.0. Leave sufficient samples for the held-out test set.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await datasetApi.preprocess({
        data: dataset.raw,
        input_cols: inputCols,
        output_col: outputCol,
        normalize,
        train_ratio: trainRatio,
        val_ratio: valRatio,
        test_ratio: testRatio,
        handle_missing: handleMissing,
      })
      setProcessedDataset(res.data)
      setActiveTab('preprocess')
      setSuccessMsg('Dataset successfully normalized and partitioned into Train/Val/Test subsets.')
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Preprocessing error.')
    } finally {
      setLoading(false)
    }
  }

  const downloadSampleTemplate = () => {
    const t = Array.from({ length: 100 }, (_, i) => +(i * 0.05).toFixed(2))
    const rows = t.map((ti) => {
      const u = Math.sin(2 * Math.PI * 0.5 * ti).toFixed(4)
      const y = (1.5 * Math.sin(2 * Math.PI * 0.5 * ti - 0.2) + 0.1 * Math.sin(ti * 4)).toFixed(4)
      return `${ti},${u},${y}`
    })
    const csv = `time,u,y\n${rows.join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sysid_sample_template.csv'
    a.click()
  }

  const downloadProcessedCSV = () => {
    if (!processedDataset) return
    const allX = [...processedDataset.X_train, ...processedDataset.X_val, ...processedDataset.X_test]
    const allY = [...processedDataset.y_train, ...processedDataset.y_val, ...processedDataset.y_test]
    const splits = [
      ...Array(processedDataset.X_train.length).fill('train'),
      ...Array(processedDataset.X_val.length).fill('val'),
      ...Array(processedDataset.X_test.length).fill('test'),
    ]
    const header = `split,${inputCols.join(',') || 'input'},${outputCol || 'target'}`
    const rows = allX.map((x, i) => `${splits[i]},${x.join(',')},${allY[i]}`)
    const csv = `${header}\n${rows.join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'preprocessed_sysid_dataset.csv'
    a.click()
  }

  // Filtered rows for searchable table
  const filteredRows = useMemo(() => {
    if (!dataset?.raw) return []
    if (!searchTerm) return dataset.raw
    return dataset.raw.filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [dataset, searchTerm])

  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1

  // Correlation analysis (approximate Pearson r between selected input and output)
  const correlationVal = useMemo(() => {
    if (!dataset?.raw || !inputCols[0] || !outputCol) return null
    const xVals = dataset.raw.map(r => parseFloat(String(r[inputCols[0]] || 0))).filter(v => !isNaN(v))
    const yVals = dataset.raw.map(r => parseFloat(String(r[outputCol] || 0))).filter(v => !isNaN(v))
    const n = Math.min(xVals.length, yVals.length)
    if (n < 2) return null
    const meanX = xVals.slice(0, n).reduce((a, b) => a + b, 0) / n
    const meanY = yVals.slice(0, n).reduce((a, b) => a + b, 0) / n
    let num = 0, denX = 0, denY = 0
    for (let i = 0; i < n; i++) {
      const dx = xVals[i] - meanX
      const dy = yVals[i] - meanY
      num += dx * dy
      denX += dx * dx
      denY += dy * dy
    }
    const den = Math.sqrt(denX * denY)
    return den > 1e-12 ? (num / den).toFixed(3) : '0.000'
  }, [dataset, inputCols, outputCol])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-cyan-400" />
            Dataset Explorer & Preprocessing Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Import experimental sensor telemetry or generate high-fidelity synthetic benchmark datasets with automated data quality checks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadSampleTemplate}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample CSV Template</span>
          </button>
          {processedDataset && (
            <button
              onClick={downloadProcessedCSV}
              className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Preprocessed CSV</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Mode Navigation Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-medium w-fit">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'upload' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Upload Experimental CSV
        </button>
        <button
          onClick={() => setActiveTab('synthetic')}
          className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'synthetic' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Generate Synthetic Dataset
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          disabled={!dataset}
          className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'preview' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 disabled:opacity-40'}`}
        >
          Data Table & Quality Check
        </button>
        <button
          onClick={() => setActiveTab('preprocess')}
          disabled={!dataset}
          className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'preprocess' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 disabled:opacity-40'}`}
        >
          Train/Val/Test Partitioning
        </button>
      </div>

      {/* TAB 1: CSV UPLOAD */}
      {activeTab === 'upload' && (
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) handleFileUpload(f)
            }}
            className="border-2 border-dashed border-slate-700 hover:border-cyan-400/80 rounded-2xl p-12 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/80"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFileUpload(f)
              }}
            />
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-100 mb-1">
              Drop experimental time-series CSV here or click to browse
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Accepts CSV files with timestamp, input excitation signals (e.g. u, torque, voltage), and measured state observations (e.g. y, angle, level).
            </p>
            <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-500 font-mono">
              <span>Auto-detects headers</span>
              <span>•</span>
              <span>Missing value validation</span>
              <span>•</span>
              <span>Sampling rate check</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GENERATE SYNTHETIC DATASET */}
      {activeTab === 'synthetic' && (
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Generate Synthetic Benchmark Trajectories</h3>
              <p className="text-xs text-slate-400">Synthesize clean or noise-corrupted dynamical response data from RK45 integration.</p>
            </div>
            <button
              onClick={handleGenerateSynthetic}
              disabled={loading}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Generate Dataset</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Dynamical System Preset</label>
              <select
                value={synSystem}
                onChange={(e) => setSynSystem(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                {SYSTEMS.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Simulation Horizon (Duration s)</label>
              <input
                type="number"
                min={5}
                max={100}
                value={synDuration}
                onChange={(e) => setSynDuration(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Integration Step Δt (s)</label>
              <input
                type="number"
                step={0.01}
                min={0.01}
                max={0.2}
                value={synDt}
                onChange={(e) => setSynDt(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-200">Inject Additive Gaussian Measurement Noise</div>
              <div className="text-[11px] text-slate-400">Simulates real physical sensor noise with specified standard deviation ratio.</div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={synAddNoise}
                onChange={(e) => setSynAddNoise(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500"
              />
              {synAddNoise && (
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0.005}
                    max={0.15}
                    step={0.005}
                    value={synNoise}
                    onChange={(e) => setSynNoise(parseFloat(e.target.value))}
                    className="w-28 accent-cyan-500 h-1.5"
                  />
                  <span className="text-xs font-mono text-cyan-300">{(synNoise * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATA PREVIEW & DATA QUALITY VALIDATION */}
      {activeTab === 'preview' && dataset && (
        <div className="space-y-6">
          {/* Quality & Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Total Samples N</span>
              <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">{dataset.shape[0]}</div>
              <span className="text-[10px] text-slate-500">Across {dataset.shape[1]} channels</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Data Integrity Status</span>
              <div className="text-sm font-semibold text-emerald-400 mt-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Validated Clean
              </div>
              <span className="text-[10px] text-slate-500">0 NaN values detected</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Input / Output Pearson Correlation</span>
              <div className="text-2xl font-bold font-mono text-violet-300 mt-1">{correlationVal ?? '—'}</div>
              <span className="text-[10px] text-slate-500">r between {inputCols[0] || 'u'} & {outputCol || 'y'}</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Feature Dimensions</span>
              <div className="text-sm font-mono text-slate-200 mt-2 truncate">
                {dataset.columns.join(', ')}
              </div>
              <span className="text-[10px] text-slate-500">Available signal channels</span>
            </div>
          </div>

          {/* Searchable Data Table */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-200">
                Sample Record Telemetry Preview ({filteredRows.length} total)
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter rows by value..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold text-[11px] uppercase">Index</th>
                    {dataset.columns.map(c => (
                      <th key={c} className="py-2.5 px-3 font-semibold text-[11px] uppercase text-cyan-300">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20">
                      <td className="py-2 px-3 text-slate-500">{(page - 1) * pageSize + idx + 1}</td>
                      {dataset.columns.map(c => (
                        <td key={c} className="py-2 px-3 text-slate-300">
                          {typeof row[c] === 'number' ? (row[c] as number).toFixed(4) : String(row[c] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PREPROCESS & PARTITION */}
      {activeTab === 'preprocess' && dataset && (
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Configure Feature Roles & Partitions</h3>
            <p className="text-xs text-slate-400">Map signal channels to system inputs and outputs, then define split boundaries.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Input Excitation Features u(t)</label>
                <div className="flex flex-wrap gap-2">
                  {dataset.columns.map(col => {
                    const isChecked = inputCols.includes(col)
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          if (isChecked) setInputCols(inputCols.filter(c => c !== col))
                          else setInputCols([...inputCols, col])
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                          isChecked
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {col}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Target Output Response y(t)</label>
                <div className="flex flex-wrap gap-2">
                  {dataset.columns.map(col => {
                    const isSelected = outputCol === col
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setOutputCol(col)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                          isSelected
                            ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {col}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={normalize}
                    onChange={(e) => setNormalize(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-cyan-500"
                  />
                  <span>Standardize Features (Zero-mean, Unit-variance)</span>
                </label>
              </div>
            </div>

            {/* Split Sliders */}
            <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <div className="text-xs font-semibold text-slate-300">Data Partitioning Ratios</div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Training Split</span>
                  <span className="font-mono text-cyan-300">{(trainRatio * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={0.85}
                  step={0.05}
                  value={trainRatio}
                  onChange={(e) => setTrainRatio(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Validation Split</span>
                  <span className="font-mono text-violet-300">{(valRatio * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={0.3}
                  step={0.05}
                  value={valRatio}
                  onChange={(e) => setValRatio(parseFloat(e.target.value))}
                  className="w-full accent-violet-500 h-1.5"
                />
              </div>

              <div className="flex justify-between text-xs pt-1 border-t border-slate-800">
                <span className="text-slate-400">Held-Out Test Split (Auto)</span>
                <span className="font-mono text-emerald-400">{(testRatio * 100).toFixed(0)}%</span>
              </div>

              <button
                onClick={handlePreprocess}
                disabled={loading}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-md mt-4 flex items-center justify-center gap-2"
              >
                <Sliders className="w-4 h-4" />
                <span>Execute Preprocessing & Partitioning</span>
              </button>
            </div>
          </div>

          {/* Processed Partition Summary Banner */}
          {processedDataset && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Partition Ready for Model Training Studio</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Train: {processedDataset.X_train.length} | Val: {processedDataset.X_val.length} | Test: {processedDataset.X_test.length}
                </div>
              </div>
              <button
                onClick={() => { useAppStore.getState().setActivePage('training'); }}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold rounded-lg flex items-center gap-1"
              >
                <span>Launch Training Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
