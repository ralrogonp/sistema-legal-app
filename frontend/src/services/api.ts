import axios from 'axios'


const API_URL = import.meta.env.VITE_API_URL || 'http://34.219.15.108:3000/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage')
  if (token) {
    const parsed = JSON.parse(token)
    if (parsed?.state?.token) {
      config.headers.Authorization = `Bearer ${parsed.state.token}`
    }
  }
  return config
})

export const authAPI = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me')
}

export const casesAPI = {
  getAll: (params?: any) => api.get('/cases', { params }),
  getOne: (id: number) => api.get(`/cases/${id}`),
  create: (data: any) => api.post('/cases', data),
  update: (id: number, data: any) => api.put(`/cases/${id}`, data),
  delete: (id: number) => api.delete(`/cases/${id}`)
}

export const statsAPI = {
  getCasesStats: () => api.get('/stats/cases')
}
