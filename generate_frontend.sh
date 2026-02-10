#!/bin/bash

cd frontend/src

# Create types
mkdir -p types
cat > types/index.ts << 'EOF'
export enum UserRole {
  ADMIN = 'ADMIN',
  CONTABLE = 'CONTABLE',
  JURIDICO = 'JURIDICO'
}

export enum CaseStatus {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADO = 'COMPLETADO',
  RECHAZADO = 'RECHAZADO'
}

export interface User {
  id: number
  email: string
  nombre_completo: string
  role: UserRole
  activo: boolean
}

export interface Case {
  id: number
  numero_caso: string
  categoria: string
  cliente: string
  descripcion: string
  estado: CaseStatus
  monto: number
  fecha_creacion: string
  creado_por_nombre?: string
}

export interface CaseStats {
  total: number
  pendientes: number
  en_proceso: number
  completados: number
  rechazados: number
}
EOF

# Create auth store
mkdir -p store
cat > store/authStore.ts << 'EOF'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: any | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: any, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false })
    }),
    { name: 'auth-storage' }
  )
)
EOF

# Create API service
mkdir -p services
cat > services/api.ts << 'EOF'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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
EOF

# Create basic pages
mkdir -p pages
cat > pages/LoginPage.tsx << 'EOF'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore(state => state.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { data } = await authAPI.login({ email, password })
      setAuth(data.data.user, data.data.token)
      toast.success('Login successful!')
      navigate('/')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sistema de Gestión Legal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inicia sesión para continuar
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
EOF

cat > pages/DashboardPage.tsx << 'EOF'
import { useQuery } from '@tanstack/react-query'
import { statsAPI, casesAPI } from '../services/api'

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsAPI.getCasesStats().then(res => res.data.data)
  })

  const { data: recentCases } = useQuery({
    queryKey: ['cases', 'recent'],
    queryFn: () => casesAPI.getAll({ limit: 5 }).then(res => res.data.data)
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-3xl">📊</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Casos</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats?.total || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-3xl">⏳</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pendientes</dt>
                  <dd className="text-2xl font-semibold text-yellow-600">{stats?.pendientes || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-3xl">⚙️</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">En Proceso</dt>
                  <dd className="text-2xl font-semibold text-blue-600">{stats?.en_proceso || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-3xl">✅</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completados</dt>
                  <dd className="text-2xl font-semibold text-green-600">{stats?.completados || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Casos Recientes</h2>
        <div className="space-y-3">
          {recentCases?.map((caso: any) => (
            <div key={caso.id} className="border-b pb-3 last:border-b-0">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{caso.numero_caso}</p>
                  <p className="text-sm text-gray-600">{caso.cliente}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  caso.estado === 'COMPLETADO' ? 'bg-green-100 text-green-800' :
                  caso.estado === 'EN_PROCESO' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {caso.estado}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
EOF

# Create stub pages
echo 'export default function CasesPage() { return <div>Cases Page</div> }' > pages/CasesPage.tsx
echo 'export default function DocumentsPage() { return <div>Documents Page</div> }' > pages/DocumentsPage.tsx
echo 'export default function UsersPage() { return <div>Users Page</div> }' > pages/UsersPage.tsx
echo 'export default function ProfilePage() { return <div>Profile Page</div> }' > pages/ProfilePage.tsx

# Create Layout component
mkdir -p components
cat > components/Layout.tsx << 'EOF'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-primary">Sistema Legal</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link to="/" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Dashboard
                </Link>
                <Link to="/cases" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Casos
                </Link>
                <Link to="/documents" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Documentos
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link to="/users" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Usuarios
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">{user?.nombre_completo}</span>
              <button
                onClick={handleLogout}
                className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
EOF

echo "Frontend files generated successfully!"
