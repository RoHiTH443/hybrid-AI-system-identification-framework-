import React, { useRef, useState, useEffect } from 'react'
import { Target, RefreshCw } from 'lucide-react'

interface PhasePortraitCanvasProps {
  alpha?: number
  beta?: number
  gamma?: number
}

export const PhasePortraitCanvas: React.FC<PhasePortraitCanvasProps> = ({
  alpha = 1.0,
  beta = 0.5,
  gamma = 3.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [trajectories, setTrajectories] = useState<{ x1: number[]; x2: number[] }[]>([])
  const [clickedIC, setClickedIC] = useState<{ x1: number; x2: number }>({ x1: 1.5, x2: 1.0 })

  useEffect(() => {
    simulateTrajectory(clickedIC.x1, clickedIC.x2)
  }, [clickedIC, alpha, beta, gamma])

  const simulateTrajectory = (x1_0: number, x2_0: number) => {
    const dt = 0.02
    const steps = 600
    const x1_arr = [x1_0]
    const x2_arr = [x2_0]

    let x1 = x1_0
    let x2 = x2_0

    for (let i = 0; i < steps; i++) {
      const u = Math.sin(0.5 * i * dt)
      const dx1 = x2
      const dx2 = -alpha * x1 - beta * x2 + gamma * Math.tanh(u)

      x1 += dx1 * dt
      x2 += dx2 * dt
      x1_arr.push(x1)
      x2_arr.push(x2)
    }

    setTrajectories((prev) => [...prev.slice(-4), { x1: x1_arr, x2: x2_arr }])
  }

  useEffect(() => {
    drawPhaseSpace()
  }, [trajectories])

  const drawPhaseSpace = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // Axes
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.moveTo(w / 2, 0)
    ctx.lineTo(w / 2, h)
    ctx.stroke()

    // Grid Vector Field Arrows
    ctx.strokeStyle = '#1e293b'
    ctx.fillStyle = '#475569'
    const scale = 50
    for (let x1 = -3; x1 <= 3; x1 += 0.6) {
      for (let x2 = -3; x2 <= 3; x2 += 0.6) {
        const cx = w / 2 + x1 * scale
        const cy = h / 2 - x2 * scale
        const dx1 = x2
        const dx2 = -alpha * x1 - beta * x2
        const len = Math.sqrt(dx1 * dx1 + dx2 * dx2) + 1e-5
        const vx = (dx1 / len) * 8
        const vy = -(dx2 / len) * 8

        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + vx, cy + vy)
        ctx.stroke()
      }
    }

    // Trajectories
    trajectories.forEach((traj, idx) => {
      const isLatest = idx === trajectories.length - 1
      ctx.strokeStyle = isLatest ? '#a855f7' : '#38bdf8'
      ctx.lineWidth = isLatest ? 2.5 : 1.2
      ctx.globalAlpha = isLatest ? 1.0 : 0.4

      ctx.beginPath()
      for (let i = 0; i < traj.x1.length; i++) {
        const px = w / 2 + traj.x1[i] * scale
        const py = h / 2 - traj.x2[i] * scale
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
      ctx.globalAlpha = 1.0
    })

    // IC marker
    const ic_x = w / 2 + clickedIC.x1 * scale
    const ic_y = h / 2 - clickedIC.x2 * scale
    ctx.fillStyle = '#f43f5e'
    ctx.beginPath()
    ctx.arc(ic_x, ic_y, 5, 0, 2 * Math.PI)
    ctx.fill()
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const scale = 50

    const x1_0 = (x - canvas.width / 2) / scale
    const x2_0 = (canvas.height / 2 - y) / scale
    setClickedIC({ x1: x1_0, x2: x2_0 })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span className="flex items-center gap-1 font-semibold text-violet-400">
          <Target className="w-3.5 h-3.5" /> Dynamic Phase Portrait Trajectory (State x₁ vs. x₂)
        </span>
        <button
          onClick={() => setTrajectories([])}
          className="text-slate-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Clear Traces
        </button>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-violet-500/30 bg-navy-950 shadow-inner">
        <canvas
          ref={canvasRef}
          width={400}
          height={220}
          onClick={handleCanvasClick}
          className="w-full h-52 cursor-pointer"
        />
        <div className="absolute bottom-2 left-3 text-[10px] text-slate-400 pointer-events-none select-none">
          Click anywhere to inject Initial Conditions x₁(0), x₂(0)
        </div>
      </div>
    </div>
  )
}
