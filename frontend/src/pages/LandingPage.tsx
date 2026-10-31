import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Play, BookOpen, Zap, Brain, TrendingUp, BarChart2, Settings, ChevronRight, Activity } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { BlockDiagramEditor } from '../components/interactive/BlockDiagramEditor'


const AnimatedSignal: React.FC<{ delay?: number; color: string; amplitude: number }> = ({ delay = 0, color, amplitude }) => {
  const points = Array.from({ length: 60 }, (_, i) => {
    const x = (i / 59) * 100
    const y = 50 + amplitude * Math.sin((i / 59) * 4 * Math.PI + delay)
    return `${x},${y}`
  }).join(' ')

  return (
    <motion.polyline
      points={points}
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeOpacity="0.8"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.8 }}
      transition={{ duration: 2, delay, ease: 'easeInOut' }}
    />
  )
}

const BlockDiagram: React.FC = () => {
  const blocks = [
    { label: 'Input Signal', color: '#2dd4bf', icon: '∿' },
    { label: 'Nonlinear\nSystem', color: '#22d3ee', icon: 'f(x)' },
    { label: 'Hybrid AI\nModel', color: '#a78bfa', icon: '⟁' },
    { label: 'Predicted\nOutput', color: '#34d399', icon: 'ŷ' },
  ]

  return (
    <div className="flex items-center gap-2 justify-center py-6 flex-wrap">
      {blocks.map((block, i) => (
        <React.Fragment key={block.label}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.2 + 0.5 }}
            className="flex flex-col items-center"
          >
            <div
              className="w-24 h-16 rounded-lg border flex flex-col items-center justify-center text-xs font-medium relative overflow-hidden"
              style={{ borderColor: block.color + '40', backgroundColor: block.color + '10' }}
            >
              <div className="text-lg" style={{ color: block.color }}>{block.icon}</div>
              <div className="text-slate-300 text-center leading-tight mt-0.5" style={{ fontSize: '10px' }}>
                {block.label.split('\n').map((l, li) => <div key={li}>{l}</div>)}
              </div>
              {/* Animated glow */}
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{ backgroundColor: block.color }}
                animate={{ opacity: [0, 0.05, 0] }}
                transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
              />
            </div>
          </motion.div>
          {i < blocks.length - 1 && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: i * 0.2 + 0.8 }}
              className="flex items-center gap-1"
            >
              <div className="w-8 h-0.5 bg-gradient-to-r from-slate-600 to-cyan-500/60 relative overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 w-3 bg-cyan-400"
                  animate={{ x: ['-100%', '400%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: i * 0.3 }}
                />
              </div>
              <ArrowRight className="w-3 h-3 text-cyan-500/60" />
            </motion.div>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

const features = [
  { icon: Activity, title: 'Nonlinear System Modeling', desc: 'Simulate 5 different nonlinear dynamic systems with adjustable physical parameters and initial conditions.' },
  { icon: Brain, title: 'Hybrid AI Learning', desc: 'Physics-informed residual learning. A known model provides the baseline; the AI corrects the unmodeled dynamics.' },
  { icon: Zap, title: 'Real-Time Simulation', desc: 'Interactive simulation lab with step, sine, chirp, and PRBS excitation signals. Adjust parameters on the fly.' },
  { icon: BarChart2, title: 'Model Accuracy Analysis', desc: 'RMSE, MAE, R², and Fit % calculated exclusively from held-out test data. Never from training data.' },
  { icon: Settings, title: 'Parameter Optimization', desc: 'Estimate unknown system parameters using bounded optimization. Compare initial vs. optimized predictions.' },
  { icon: BookOpen, title: 'Research Report Generation', desc: 'Export comprehensive PDF reports with equations, metrics, plots, and model comparison tables.' },
]

interface LandingPageProps {
  onNavigate: (page: string) => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [signalOffset, setSignalOffset] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setSignalOffset(o => o + 0.05), 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
        {/* Background signal decoration */}
        <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
          <svg className="absolute bottom-0 w-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
            <AnimatedSignal color="#22d3ee" amplitude={30} delay={0} />
            <AnimatedSignal color="#a78bfa" amplitude={20} delay={0.5} />
            <AnimatedSignal color="#2dd4bf" amplitude={15} delay={1} />
          </svg>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto relative z-10"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-8"
          >
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Research Platform · v1.0 · Hybrid AI System Identification
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-none"
          >
            <span className="text-white">Understand the</span>
            <br />
            <span className="text-gradient-cyan">Dynamics.</span>
            <br />
            <span className="text-white">Learn the </span>
            <span className="text-gradient-violet">System.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            An intelligent hybrid AI framework for modeling, identifying, and predicting complex nonlinear systems from data — combining physical equations with learned residuals.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap gap-4 justify-center mb-16"
          >
            <button onClick={() => onNavigate('dashboard')} className="btn-primary flex items-center gap-2 text-base px-8 py-3">
              Launch Research Studio <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => onNavigate('playground')} className="btn-secondary flex items-center gap-2 text-base px-8 py-3">
              <Play className="w-4 h-4" /> Run a Sample Simulation
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="btn-ghost flex items-center gap-2 text-base px-6 py-3">
              Explore the Framework <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Block Diagram */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8"
          >
            <BlockDiagramEditor />
          </motion.div>

        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-navy-900/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gradient-cyan mb-3">Framework Capabilities</h2>
            <p className="text-slate-400 max-w-xl mx-auto">A complete engineering workflow from raw data to validated hybrid AI model</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="panel p-5 hover:border-cyan-500/30 transition-colors duration-300 group"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 group-hover:border-cyan-500/40 transition-colors">
                  <feat.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="font-semibold text-slate-100 mb-2">{feat.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Hybrid explanation */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="panel p-8"
          >
            <h2 className="text-2xl font-bold text-gradient-violet mb-4">Why Hybrid AI for Nonlinear Systems?</h2>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-400 leading-relaxed">
              <div>
                <div className="text-slate-200 font-medium mb-2">The Challenge</div>
                Nonlinear dynamic systems are difficult to model accurately using purely analytical equations. Friction, aerodynamics, chemical kinetics, and biological processes involve behaviors that resist closed-form descriptions.
              </div>
              <div>
                <div className="text-slate-200 font-medium mb-2">The Solution</div>
                A hybrid approach leverages what we <em>do know</em> (physics equations) and uses a neural network to learn what we <em>don't know</em> (the residual dynamics). This improves accuracy while maintaining physical interpretability.
              </div>
            </div>
            <div className="mt-6 equation-block">
              ŷ(t) = f_physics(x(t), u(t), θ) + f_neural(x(t), u(t), W, b)
              <div className="text-slate-600 text-xs mt-2">
                where θ are physical parameters (estimated via optimization) and (W,b) are neural network weights (learned via backpropagation)
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 text-center bg-gradient-to-b from-transparent to-navy-900/80">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start?</h2>
          <p className="text-slate-400 mb-8">Open the Research Dashboard to begin your system identification experiment.</p>
          <button onClick={() => onNavigate('dashboard')} className="btn-primary text-base px-10 py-3 flex items-center gap-2 mx-auto">
            Open Research Studio <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </section>
    </div>
  )
}
