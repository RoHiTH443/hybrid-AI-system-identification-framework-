import React from 'react'
import { motion } from 'framer-motion'

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  color?: 'cyan' | 'violet' | 'green' | 'amber' | 'red' | 'slate'
  icon?: React.ReactNode
  trend?: number
  subtitle?: string
}

const colorMap = {
  cyan: 'text-sky-400',
  violet: 'text-indigo-400',
  green: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-rose-400',
  slate: 'text-slate-100',
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label, value, unit, color = 'cyan', icon, trend, subtitle
}) => (
  <div className="metric-card">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      {icon && <span className="text-slate-500">{icon}</span>}
    </div>
    <div className="flex items-baseline gap-1 my-1">
      <span className={`text-xl font-bold font-mono tracking-tight truncate ${colorMap[color]}`}>
        {value}
      </span>
      {unit && <span className="text-xs font-normal text-slate-400">{unit}</span>}
    </div>
    {subtitle && <p className="text-[11px] text-slate-500 truncate mt-0.5">{subtitle}</p>}
    {trend !== undefined && (
      <div className={`text-[11px] font-mono mt-1 ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(2)}%
      </div>
    )}
  </div>
)

interface StatusBadgeProps {
  status: 'idle' | 'running' | 'complete' | 'error' | 'pending' | 'cancelled'
  label?: string
}

const statusConfig = {
  idle: { dot: 'idle', text: 'Idle', color: 'text-slate-400' },
  pending: { dot: 'training', text: 'Pending', color: 'text-amber-400' },
  running: { dot: 'training', text: 'Training', color: 'text-amber-400' },
  complete: { dot: 'active', text: 'Complete', color: 'text-green-400' },
  error: { dot: 'error', text: 'Error', color: 'text-red-400' },
  cancelled: { dot: 'idle', text: 'Cancelled', color: 'text-slate-400' },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const cfg = statusConfig[status] || statusConfig.idle
  return (
    <div className="flex items-center gap-2">
      <div className={`status-dot ${cfg.dot}`} />
      <span className={`text-xs font-medium ${cfg.color}`}>{label || cfg.text}</span>
    </div>
  )
}

interface ProgressBarProps {
  value: number
  max: number
  color?: string
  showLabel?: boolean
  height?: number
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, color = '#22d3ee', showLabel = true, height = 6 }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1.5" style={{ display: showLabel ? 'flex' : 'none' }}>
        <span className="text-xs text-slate-500">Progress</span>
        <span className="text-xs text-slate-400 font-mono">{value}/{max} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="w-full bg-navy-900 rounded-full overflow-hidden" style={{ height }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  )
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  unit?: string
  description?: string
}

export const ParamSlider: React.FC<SliderProps> = ({ label, value, min, max, step, onChange, unit, description }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <label className="label mb-0">{label}</label>
      <span className="text-xs font-mono text-cyan-400 bg-navy-900 px-2 py-0.5 rounded">
        {value.toFixed(step < 0.01 ? 4 : step < 0.1 ? 3 : step < 1 ? 2 : 0)}{unit || ''}
      </span>
    </div>
    <input
      type="range"
      min={min} max={max} step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-full"
    />
    <div className="flex justify-between text-xs text-slate-700">
      <span>{min}{unit}</span>
      <span>{max}{unit}</span>
    </div>
    {description && <p className="text-xs text-slate-600">{description}</p>}
  </div>
)

interface SectionHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  icon?: React.ReactNode
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, actions, icon }) => (
  <div className="flex items-start justify-between mb-5">
    <div>
      <h2 className="section-title">
        {icon && <span className="text-cyan-400">{icon}</span>}
        {title}
      </h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
)

interface AlertProps {
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
  details?: string
}

const alertConfig = {
  info: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
  error: 'bg-red-500/10 border-red-500/20 text-red-300',
  success: 'bg-green-500/10 border-green-500/20 text-green-300',
}

export const Alert: React.FC<AlertProps> = ({ type, message, details }) => (
  <div className={`border rounded-lg p-3 ${alertConfig[type]}`}>
    <div className="text-sm font-medium">{message}</div>
    {details && <div className="text-xs mt-1 opacity-80">{details}</div>}
  </div>
)
