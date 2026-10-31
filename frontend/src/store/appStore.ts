import { create } from 'zustand'

export interface SimulationData {
  t: number[]
  u: number[]
  y: number[]
  states?: Record<string, number[]>
  state_names?: string[]
  description?: string
  equation?: string
}

export interface DatasetInfo {
  raw: Record<string, unknown>[]
  columns: string[]
  stats: Record<string, Record<string, number>>
  shape: [number, number]
  inputCols: string[]
  outputCol: string
}

export interface ProcessedDataset {
  X_train: number[][]
  y_train: number[]
  X_val: number[][]
  y_val: number[]
  X_test: number[][]
  y_test: number[]
  scaler_params: Record<string, unknown>
}

export interface TrainingJob {
  job_id: string
  model_type: string
  status: 'pending' | 'running' | 'complete' | 'failed' | 'cancelled'
  epoch: number
  total_epochs: number
  train_loss: number
  val_loss: number
  elapsed: number
  metrics?: Record<string, number>
  y_pred?: number[]
  y_test?: number[]
  history?: { epochs: number[]; train_loss: number[]; val_loss: number[] }
  error?: string
}

export interface Experiment {
  id: number
  name: string
  system_name: string
  dataset_config: string
  model_config: string
  training_params: string
  test_metrics: string
  simulation_settings: string
  created_at: string
  updated_at: string
}

export interface UserSettings {
  solver: 'RK45' | 'Euler' | 'RK4'
  defaultDuration: number
  apiUrl: string
  theme: 'dark' | 'light'
}

interface AppState {
  theme: 'dark' | 'light'
  sidebarCollapsed: boolean
  activePage: string
  simulationData: SimulationData | null
  selectedSystem: string
  systemParams: Record<string, number>
  dataset: DatasetInfo | null
  processedDataset: ProcessedDataset | null
  trainingJobs: Record<string, TrainingJob>
  activeJobId: string | null
  experiments: Experiment[]
  comparisonJobIds: string[]
  userSettings: UserSettings

  setTheme: (t: 'dark' | 'light') => void
  toggleSidebar: () => void
  setActivePage: (page: string) => void
  setSimulationData: (data: SimulationData | null) => void
  setSelectedSystem: (s: string) => void
  setSystemParams: (p: Record<string, number>) => void
  setDataset: (d: DatasetInfo | null) => void
  setProcessedDataset: (d: ProcessedDataset | null) => void
  upsertTrainingJob: (job: TrainingJob) => void
  setActiveJobId: (id: string | null) => void
  setExperiments: (exps: Experiment[]) => void
  addExperiment: (exp: Experiment) => void
  removeExperiment: (id: number) => void
  toggleComparisonJob: (jobId: string) => void
  setUserSettings: (settings: Partial<UserSettings>) => void
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  sidebarCollapsed: false,
  activePage: 'dashboard',
  simulationData: null,
  selectedSystem: 'pendulum',
  systemParams: {},
  dataset: null,
  processedDataset: null,
  trainingJobs: {},
  activeJobId: null,
  experiments: [],
  comparisonJobIds: [],
  userSettings: {
    solver: 'RK45',
    defaultDuration: 20,
    apiUrl: '/api',
    theme: 'dark',
  },

  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActivePage: (activePage) => set({ activePage }),
  setSimulationData: (simulationData) => set({ simulationData }),
  setSelectedSystem: (selectedSystem) => set({ selectedSystem }),
  setSystemParams: (systemParams) => set({ systemParams }),
  setDataset: (dataset) => set({ dataset }),
  setProcessedDataset: (processedDataset) => set({ processedDataset }),
  upsertTrainingJob: (job) => set((s) => ({
    trainingJobs: { ...s.trainingJobs, [job.job_id]: job }
  })),
  setActiveJobId: (activeJobId) => set({ activeJobId }),
  setExperiments: (experiments) => set({ experiments }),
  addExperiment: (exp) => set((s) => ({ experiments: [...s.experiments, exp] })),
  removeExperiment: (id) => set((s) => ({ experiments: s.experiments.filter(e => e.id !== id) })),
  toggleComparisonJob: (jobId) => set((s) => ({
    comparisonJobIds: s.comparisonJobIds.includes(jobId)
      ? s.comparisonJobIds.filter(j => j !== jobId)
      : [...s.comparisonJobIds, jobId]
  })),
  setUserSettings: (newSettings) => set((s) => ({
    userSettings: { ...s.userSettings, ...newSettings }
  })),
}))
