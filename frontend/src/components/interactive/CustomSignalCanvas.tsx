import React, { useRef, useState, useEffect } from 'react'
import { Pencil, RotateCcw, Zap } from 'lucide-react'

interface CustomSignalCanvasProps {
  onSignalChange: (uSignal: number[]) => void
  length?: number
}

export const CustomSignalCanvas: React.FC<CustomSignalCanvasProps> = ({
  onSignalChange,
  length = 200,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [signal, setSignal] = useState<number[]>(
    Array.from({ length }, (_, i) => Math.sin((i / length) * Math.PI * 4))
  )

  useEffect(() => {
    drawCanvas()
    onSignalChange(signal)
  }, [signal])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // Background grid
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x < w; x += 40) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let y = 0; y < h; y += 30) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()

    // Zero axis
    ctx.strokeStyle = '#475569'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Signal path
    ctx.strokeStyle = '#22d3ee'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let i = 0; i < signal.length; i++) {
      const x = (i / (signal.length - 1)) * w
      const y = h / 2 - (signal[i] * (h / 2 - 15))
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.buttons !== 1) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const index = Math.min(
      signal.length - 1,
      Math.max(0, Math.floor((x / canvas.width) * signal.length))
    )
    // Convert Y position to normalized signal [-1.5, 1.5]
    const val = Math.min(1.5, Math.max(-1.5, ((canvas.height / 2 - y) / (canvas.height / 2 - 15))))

    const nextSignal = [...signal]
    nextSignal[index] = val
    // Smooth adjacent points slightly for natural drawing curve
    if (index > 0) nextSignal[index - 1] = 0.5 * nextSignal[index - 1] + 0.5 * val
    if (index < signal.length - 1) nextSignal[index + 1] = 0.5 * nextSignal[index + 1] + 0.5 * val

    setSignal(nextSignal)
  }

  const resetSignal = () => {
    const defaultSignal = Array.from({ length }, (_, i) => Math.sin((i / length) * Math.PI * 4))
    setSignal(defaultSignal)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span className="flex items-center gap-1 font-semibold text-cyan-400">
          <Pencil className="w-3.5 h-3.5" /> Draw Custom Excitation Waveform u(t) with Mouse/Touch
        </span>
        <button
          onClick={resetSignal}
          className="text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Reset Sine Wave
        </button>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-cyan-500/30 bg-navy-950 shadow-inner">
        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          onPointerDown={(e) => { setIsDrawing(true); handlePointerMove(e) }}
          onPointerUp={() => setIsDrawing(false)}
          onPointerLeave={() => setIsDrawing(false)}
          onPointerMove={handlePointerMove}
          className="w-full h-40 cursor-crosshair touch-none"
        />
        <div className="absolute bottom-2 right-3 text-[10px] text-slate-500 pointer-events-none select-none">
          Click & Drag to Sculpt Signal
        </div>
      </div>
    </div>
  )
}
