import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/appStore'
import {
  LayoutDashboard, FlaskConical, Database, Cpu, PlaySquare,
  Activity, TrendingUp, BarChart3, Beaker, GitCompare, FileText,
  Settings, ChevronLeft, ChevronRight, Sun, Moon, Sparkles
} from 'lucide-react'

export const navItems = [
  { id: 'dashboard', label: '1. Overview Dashboard', shortLabel: 'Overview', icon: LayoutDashboard },
  { id: 'laboratory', label: '2. Nonlinear System Lab', shortLabel: 'System Lab', icon: FlaskConical },
  { id: 'dataset', label: '3. Dataset Explorer', shortLabel: 'Datasets', icon: Database },
  { id: 'model-builder', label: '4. Hybrid AI Builder', shortLabel: 'Model Builder', icon: Cpu },
  { id: 'training', label: '5. Training Studio', shortLabel: 'Training', icon: PlaySquare },
  { id: 'simulation', label: '6. Live Simulation', shortLabel: 'Live Sim', icon: Activity },
  { id: 'forecasting', label: '7. Prediction & Forecast', shortLabel: 'Forecasting', icon: TrendingUp },
  { id: 'analytics', label: '8. Performance Analytics', shortLabel: 'Analytics', icon: BarChart3 },
  { id: 'experiments', label: '9. Experiment History', shortLabel: 'Experiments', icon: Beaker },
  { id: 'comparison', label: '10. Model Comparison', shortLabel: 'Comparison', icon: GitCompare },
  { id: 'report', label: '11. Reports & Export', shortLabel: 'Reports', icon: FileText },
  { id: 'settings', label: '12. Settings & Profile', shortLabel: 'Settings', icon: Settings },
]

interface SidebarProps {
  onNavigate: (page: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const { sidebarCollapsed, toggleSidebar, activePage, theme, setTheme } = useAppStore()

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 68 : 256 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={`flex flex-col h-screen fixed left-0 top-0 z-40 overflow-hidden border-r transition-colors ${
        theme === 'light'
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-[#030816] border-slate-800 text-slate-200'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 py-3 h-14 border-b border-slate-800/80 flex-shrink-0">
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center font-bold text-slate-950 shadow-md shadow-cyan-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="text-xs font-bold text-white tracking-wider uppercase font-mono">
                Hybrid AI <span className="text-cyan-400">SysID</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">Engineering Research Lab</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin">
        {navItems.map(({ id, label, shortLabel, icon: Icon }) => {
          const isActive = activePage === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 border border-transparent'
              } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="truncate text-left"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )
        })}
      </nav>

      {/* Bottom controls */}
      <div className="border-t border-slate-800/80 p-2 space-y-1 flex-shrink-0">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 transition-all ${
            sidebarCollapsed ? 'justify-center px-0' : ''
          }`}
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400 flex-shrink-0" /> : <Moon className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={toggleSidebar}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 transition-all ${
            sidebarCollapsed ? 'justify-center px-0' : ''
          }`}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4 flex-shrink-0" /> : <ChevronLeft className="w-4 h-4 flex-shrink-0" />}
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Collapse View
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}
