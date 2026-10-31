import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from './components/Sidebar'
import { LandingPage } from './pages/LandingPage'
import { ResearchDashboard } from './pages/ResearchDashboard'
import { SystemPlayground } from './pages/SystemPlayground'
import { DatasetManager } from './pages/DatasetManager'
import { ModelBuilder } from './pages/ModelBuilder'
import { TrainingStudio } from './pages/TrainingStudio'
import { SimulationLab } from './pages/SimulationLab'
import { ForecastingStudio } from './pages/ForecastingStudio'
import { OutputAnalysis } from './pages/OutputAnalysis'
import { ComparisonStudio } from './pages/ComparisonStudio'
import { ExperimentManager } from './pages/ExperimentManager'
import { ReportGenerator } from './pages/ReportGenerator'
import { SettingsProfile } from './pages/SettingsProfile'
import { useAppStore } from './store/appStore'
import { LoginPage } from './pages/auth/LoginPage'
import { useAuthStore } from './store/authStore'
import { LogoutButton } from './components/auth/LogoutButton'
import { ToastContainer } from './components/Toast'
import { Loader2, Sparkles, Layers } from 'lucide-react'

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.14 } },
}

const LoadingSpinner = () => (
  <div className="min-h-screen bg-[#020617] flex items-center justify-center">
    <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
  </div>
)

function App() {
  const { isAuthenticated, setAuth, clearAuth } = useAuthStore()
  const { activePage, setActivePage, sidebarCollapsed, theme } = useAppStore()
  const [showLanding, setShowLanding] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    // Check if user already has active session or persistent token
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
    const userStr = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user')
    const rememberedEmail = localStorage.getItem('remembered_email') || ''

    if (token) {
      try {
        const cachedUser = userStr ? JSON.parse(userStr) : null
        if (cachedUser) {
          setAuth(cachedUser, token)
        } else {
          setAuth({
            id: 1,
            email: rememberedEmail,
            name: rememberedEmail.split('@')[0].replace('.', ' ').replace(/^\w/, (c: string) => c.toUpperCase()),
            role: 'Research Fellow'
          }, token)
        }
      } catch {
        setAuth({ id: 1, email: rememberedEmail, name: 'Researcher', role: 'Research Fellow' }, token)
      }
    }
    setAuthChecked(true)
  }, [setAuth])

  const navigate = (page: string) => {
    if (page === 'dashboard' || page !== 'landing') setShowLanding(false)
    setActivePage(page)
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <ResearchDashboard />
      case 'laboratory':
      case 'playground':
        return <SystemPlayground />
      case 'dataset':
        return <DatasetManager />
      case 'model-builder':
        return <ModelBuilder />
      case 'training':
        return <TrainingStudio />
      case 'simulation':
        return <SimulationLab />
      case 'forecasting':
        return <ForecastingStudio />
      case 'analytics':
      case 'analysis':
        return <OutputAnalysis />
      case 'experiments':
        return <ExperimentManager />
      case 'comparison':
        return <ComparisonStudio />
      case 'report':
        return <ReportGenerator />
      case 'settings':
        return <SettingsProfile />
      default:
        return <ResearchDashboard />
    }
  }

  if (!authChecked) return <LoadingSpinner />

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onLoginSuccess={() => { /* auth store updated */ }} />
        <ToastContainer />
      </>
    )
  }

  if (showLanding) {
    return (
      <div className={`min-h-screen ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#020617] text-slate-100'}`}>
        <nav className={`fixed top-0 left-0 right-0 z-50 px-6 py-3.5 flex items-center justify-between border-b backdrop-blur-md ${theme === 'light' ? 'border-slate-300 bg-white/80' : 'border-slate-800/80 bg-slate-950/80'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-sm font-mono tracking-wider">HYBRID AI · SysID</span>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={() => { setShowLanding(false); setActivePage('laboratory') }} className="px-3 py-1.5 text-xs text-slate-300 hover:text-white">Nonlinear Lab</button>
            <button onClick={() => { setShowLanding(false); setActivePage('dashboard') }} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-xl shadow-md">Launch Studio</button>
            <div className="w-px h-5 bg-slate-700 mx-1" />
            <LogoutButton />
          </div>
        </nav>
        <div className="pt-16">
          <LandingPage onNavigate={(page) => { setShowLanding(false); setActivePage(page) }} />
        </div>
        <ToastContainer />
      </div>
    )
  }

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#020617] text-slate-100'}`}>
      <Sidebar onNavigate={navigate} />
      <div
        className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? 68 : 256 }}
      >
        {/* Top Header Bar */}
        <header className={`h-14 border-b px-6 flex items-center justify-between flex-shrink-0 z-10 backdrop-blur ${
          theme === 'light' ? 'border-slate-200 bg-white/70' : 'border-slate-800/80 bg-slate-950/70'
        }`}>
          <div className="flex items-center gap-2.5 text-xs">
            <span className="text-slate-500 uppercase tracking-widest font-mono">Workspace</span>
            <span className="text-slate-600">/</span>
            <span className="font-semibold text-cyan-400 capitalize font-mono">
              {activePage.replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>RK45 Engine Ready</span>
            </div>
            <div className="w-px h-4 bg-slate-800" />
            <LogoutButton />
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}

export default App
