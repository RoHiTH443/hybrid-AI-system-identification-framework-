import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach token if present in session or local storage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// System endpoints
export const systemApi = {
  getSystems: () => api.get('/system/systems'),
  simulate: (system: string, params: Record<string, unknown>) =>
    api.post('/system/simulate', { system, params }).then(res => res.data),
  optimize: (payload: Record<string, unknown>) =>
    api.post('/system/optimize', payload).then(res => res.data),
  getInputTypes: () => api.get('/system/input-types'),
}

// Dataset endpoints
export const datasetApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/dataset/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  generate: (system: string, params: Record<string, unknown>, addNoise = false, noiseLevel = 0.01) =>
    api.post('/dataset/generate', { system, params, add_noise: addNoise, noise_level: noiseLevel }),
  preprocess: (payload: Record<string, unknown>) => api.post('/dataset/preprocess', payload),
}

// Training endpoints
export const trainingApi = {
  getModels: () => api.get('/training/models'),
  start: (payload: Record<string, unknown>) => api.post('/training/start', payload),
  status: (jobId: string) => api.get(`/training/status/${jobId}`),
  cancel: (jobId: string) => api.post(`/training/cancel/${jobId}`),
  predict: (jobId: string) => api.get(`/training/predict/${jobId}`),
  forecast: (payload: { job_id: string; u_future: number[]; y_seed: number[]; horizon: number }) =>
    api.post('/training/forecast', payload).then(res => res.data),
  stressTest: (jobId: string, noiseLevels?: number[]) =>
    api.post(`/training/stress-test/${jobId}`, { noise_levels: noiseLevels }).then(res => res.data),
}

// Experiments endpoints
export const experimentsApi = {
  list: () => api.get('/experiments/'),
  create: (data: Record<string, unknown>) => api.post('/experiments/', data),
  get: (id: number) => api.get(`/experiments/${id}`),
  update: (id: number, data: Record<string, unknown>) => api.put(`/experiments/${id}`, data),
  delete: (id: number) => api.delete(`/experiments/${id}`),
  export: (id: number) => api.post(`/experiments/export/${id}`),
}

export const apiObject = {
  ...api,
  system: systemApi,
  dataset: datasetApi,
  training: trainingApi,
  experiments: experimentsApi,
}

export { apiObject as api }
export default api
