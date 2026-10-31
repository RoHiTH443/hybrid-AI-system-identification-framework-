import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Settings, User, Shield, Sun, Moon, Database, Cpu, CheckCircle2,
  AlertCircle, RefreshCw, Server, Key, Save, Sparkles
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useAppStore } from '../store/appStore'
import { updateProfile } from '../api/authApi'

export const SettingsProfile: React.FC = () => {
  const { user, token, setAuth } = useAuthStore()
  const { theme, setTheme, userSettings, setUserSettings } = useAppStore()

  const [name, setName] = useState(user?.name || 'Dr. Researcher')
  const [role, setRole] = useState(user?.role || 'Principal Investigator')
  const [email] = useState(user?.email || 'demo.researcher@antigravity.ai')

  const [solver, setSolver] = useState<'RK45' | 'Euler' | 'RK4'>(userSettings.solver || 'RK45')
  const [defaultDuration, setDefaultDuration] = useState<number>(userSettings.defaultDuration || 20)
  const [apiUrl, setApiUrl] = useState<string>(userSettings.apiUrl || '/api')

  const [backendHealth, setBackendHealth] = useState<{ status: string; service: string } | null>(null)
  const [healthChecking, setHealthChecking] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkHealth = async () => {
    setHealthChecking(true)
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setBackendHealth(data)
    } catch (_) {
      setBackendHealth(null)
    } finally {
      setHealthChecking(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaveSuccess(false)
    try {
      if (token) {
        await updateProfile(name, role, token)
      }
      if (user) {
        setAuth({ ...user, name, role }, token || '')
      }
      setUserSettings({ solver, defaultDuration, apiUrl })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to update user profile.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-cyan-400" />
            Settings and User Profile
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure laboratory computational preferences, ODE integration solvers, profile credentials, and diagnostics.
          </p>
        </div>

        {saveSuccess && (
          <div className="px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Preferences Saved Successfully</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: User Profile Information */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-cyan-950/40">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{name}</h3>
                <span className="text-xs text-cyan-400 font-mono">{role}</span>
                <div className="text-[11px] text-slate-400 mt-0.5">{email}</div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 pt-3 border-t border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Institutional Role</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Primary Email Address (Immutable)</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800/60 rounded-xl text-xs text-slate-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile Updates</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Laboratory Engine Configuration & Health Check */}
        <div className="lg:col-span-7 space-y-4">

          {/* Engine Parameters */}
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Computational Engine & Solver Configuration</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Numerical ODE Integration Solver</label>
                <select
                  value={solver}
                  onChange={(e) => setSolver(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-cyan-300 focus:outline-none focus:border-cyan-400"
                >
                  <option value="RK45">Runge-Kutta 4(5) Dormand-Prince (Adaptive)</option>
                  <option value="RK4">Classic 4th-Order Runge-Kutta (Fixed)</option>
                  <option value="Euler">Explicit Forward Euler (Fast)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">Controls SciPy ivp solver integration precision.</p>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Default Horizon Duration (s)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">Default simulation time span across all presets.</p>
              </div>
            </div>

            {/* Interface Theme Switcher */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-200 font-medium">Interface Visual Theme</span>
                <p className="text-[11px] text-slate-500">Toggle between high-contrast scientific dark and light lab styles.</p>
              </div>
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center gap-1.5"
              >
                {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-cyan-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
                <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              </button>
            </div>
          </div>

          {/* Diagnostics & Health Check */}
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Backend Diagnostic Health Status</span>
              </div>
              <button
                onClick={checkHealth}
                disabled={healthChecking}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${healthChecking ? 'animate-spin' : ''}`} />
                <span>Re-check</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 font-mono text-xs text-center">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase">FastAPI Backend</span>
                <div className={`font-bold mt-1 ${backendHealth?.status === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {backendHealth?.status === 'ok' ? 'Online 🟢' : 'Offline 🔴'}
                </div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase">Database Engine</span>
                <div className="font-bold text-cyan-300 mt-1">SQLite Local 🟢</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase">PyTorch Backend</span>
                <div className="font-bold text-violet-300 mt-1">v2.8.0 Active 🟢</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
