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

// Auth API
export const authAPI = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me')
}

// Cases API
export const casesAPI = {
  getAll: (params?: any) => api.get('/cases', { params }),
  getOne: (id: number) => api.get(`/cases/${id}`),
  create: (data: any) => api.post('/cases', data),
  update: (id: number, data: any) => api.put(`/cases/${id}`, data),
  delete: (id: number) => api.delete(`/cases/${id}`),
  
  // Versiones
  getVersions: (caseId: number) => api.get(`/cases/${caseId}/versions`),
  getVersionDetail: (caseId: number, versionId: number) => 
    api.get(`/cases/${caseId}/versions/${versionId}`),
  createVersion: (caseId: number, data: any) => 
    api.post(`/cases/${caseId}/versions`, data),
  
  // Documentos
  getDocuments: (caseId: number, params?: any) => 
    api.get(`/cases/${caseId}/documents`, { params }),
  uploadDocument: (caseId: number, formData: FormData) => 
    api.post(`/cases/${caseId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  deleteDocument: (caseId: number, documentId: number) => 
    api.delete(`/cases/${caseId}/documents/${documentId}`),
  downloadDocument: (caseId: number, documentId: number) => 
    api.get(`/cases/${caseId}/documents/${documentId}/download`, {
      responseType: 'blob'
    })
}

// Users API
export const usersAPI = {
  getAll: (params?: any) => api.get('/users', { params }),
  getOne: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  toggleActive: (id: number) => api.patch(`/users/${id}/toggle-active`),
  updateS3Permission: (id: number, canManage: boolean) => 
    api.patch(`/users/${id}/s3-permission`, { puede_gestionar_s3: canManage })
}

// S3 Manager API
export const s3API = {
  // Carpetas
  getFolders: (params?: any) => api.get('/s3/folders', { params }),
  getFolder: (id: number) => api.get(`/s3/folders/${id}`),
  createFolder: (data: any) => api.post('/s3/folders', data),
  deleteFolder: (id: number) => api.delete(`/s3/folders/${id}`),
  
  // Archivos
  getFiles: (params?: any) => api.get('/s3/files', { params }),
  uploadFile: (formData: FormData) => 
    api.post('/s3/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  deleteFile: (id: number) => api.delete(`/s3/files/${id}`),
  downloadFile: (id: number) => 
    api.get(`/s3/files/${id}/download`, { responseType: 'blob' }),
  
  // Estructura
  getTreeStructure: () => api.get('/s3/tree')
}

// Stats API
export const statsAPI = {
  getCasesStats: () => api.get('/stats/cases'),
  getUserStats: (userId?: number) => 
    api.get('/stats/user', { params: { userId } })
}
