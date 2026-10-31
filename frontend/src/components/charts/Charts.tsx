import React, { useCallback, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ReferenceLine, BarChart, Bar } from 'recharts'

const COLORS = {
  actual: '#22d3ee',
  predicted: '#a78bfa',
  error: '#f87171',
  train: '#34d399',
  val: '#fbbf24',
  input: '#2dd4bf',
  residual: '#fb923c',
}

interface TimeSeriesProps {
  t: number[]
  series: { name: string; data: number[]; color?: string }[]
  title?: string
  height?: number
  xLabel?: string
  yLabel?: string
}

export const TimeSeriesChart: React.FC<TimeSeriesProps> = ({
  t, series, title, height = 280, xLabel = 'Time (s)', yLabel = 'Value'
}) => {
  const data = t.map((time, i) => {
    const point: Record<string, number> = { t: parseFloat(time.toFixed(3)) }
    series.forEach(s => { point[s.name] = s.data[i] !== undefined ? parseFloat(s.data[i].toFixed(4)) : 0 })
    return point
  })

  const decimated = data.length > 2000 ? data.filter((_, i) => i % Math.ceil(data.length / 2000) === 0) : data

  return (
    <div>
      {title && <div className="text-sm font-semibold text-slate-300 mb-3">{title}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={decimated} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: xLabel, position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0a1f3d', border: '1px solid rgba(34,211,238,0.2)', borderRadius: '8px', fontSize: '12px' }}
            labelStyle={{ color: '#94a3b8' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
          {series.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={s.color || Object.values(COLORS)[i % Object.values(COLORS).length]}
              dot={false}
              strokeWidth={1.5}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface LossChartProps {
  epochs: number[]
  trainLoss: number[]
  valLoss: number[]
  height?: number
}

export const LossChart: React.FC<LossChartProps> = ({ epochs, trainLoss, valLoss, height = 220 }) => {
  const data = epochs.map((e, i) => ({
    epoch: e,
    'Train Loss': parseFloat((trainLoss[i] || 0).toExponential(4)),
    'Val Loss': parseFloat((valLoss[i] || 0).toExponential(4)),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="epoch" tick={{ fill: '#64748b', fontSize: 11 }} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} scale="log" domain={['auto', 'auto']} />

        <Tooltip
          contentStyle={{ backgroundColor: '#0a1f3d', border: '1px solid rgba(34,211,238,0.2)', borderRadius: '8px', fontSize: '12px' }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
        <Line type="monotone" dataKey="Train Loss" stroke={COLORS.train} dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="Val Loss" stroke={COLORS.val} dot={false} strokeWidth={2} strokeDasharray="5 5" />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface ScatterProps {
  yActual: number[]
  yPredicted: number[]
  height?: number
}

export const ScatterPlot: React.FC<ScatterProps> = ({ yActual, yPredicted, height = 280 }) => {
  const data = yActual.map((a, i) => ({ actual: parseFloat(a.toFixed(4)), predicted: parseFloat((yPredicted[i] || 0).toFixed(4)) }))
  const minVal = Math.min(...yActual, ...yPredicted)
  const maxVal = Math.max(...yActual, ...yPredicted)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="actual" name="Actual" type="number" domain={[minVal, maxVal]} tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'Actual', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }} />
        <YAxis dataKey="predicted" name="Predicted" type="number" domain={[minVal, maxVal]} tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'Predicted', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
        <Tooltip contentStyle={{ backgroundColor: '#0a1f3d', border: '1px solid rgba(34,211,238,0.2)', borderRadius: '8px', fontSize: '12px' }} />
        <ReferenceLine segment={[{ x: minVal, y: minVal }, { x: maxVal, y: maxVal }]} stroke="#22d3ee" strokeDasharray="6 3" strokeOpacity={0.5} />
        <Scatter data={data} fill="#a78bfa" fillOpacity={0.6} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

interface MetricBarChartProps {
  models: string[]
  metrics: Record<string, Record<string, number>>
  metric: string
  height?: number
}

export const MetricBarChart: React.FC<MetricBarChartProps> = ({ models, metrics, metric, height = 220 }) => {
  const data = models.map(m => ({
    model: m.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: parseFloat((metrics[m]?.[metric] || 0).toFixed(4)),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="model" tick={{ fill: '#64748b', fontSize: 10 }} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
        <Tooltip contentStyle={{ backgroundColor: '#0a1f3d', border: '1px solid rgba(34,211,238,0.2)', borderRadius: '8px', fontSize: '12px' }} />
        <Bar dataKey="value" fill="#22d3ee" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
