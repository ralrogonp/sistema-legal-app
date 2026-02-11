import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PlusIcon, FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { casesAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { Case, CaseType, CaseStatus } from '../types'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import CaseFormModal from '../components/CaseFormModal'

export default function CasesPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<CaseType | 'ALL'>('ALL')
  const [filterStatus, setFilterStatus] = useState<CaseStatus | 'ALL'>('ALL')

  // Query para obtener casos
  const { data: cases, isLoading } = useQuery({
    queryKey: ['cases', filterType, filterStatus],
    queryFn: () => casesAPI.getAll({ 
      tipo_caso: filterType !== 'ALL' ? filterType : undefined,
      estado: filterStatus !== 'ALL' ? filterStatus : undefined
    }).then(res => res.data.data)
  })

  // Mutation para eliminar caso
  const deleteMutation = useMutation({
    mutationFn: (id: number) => casesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      toast.success('Caso eliminado correctamente')
    },
    onError: () => {
      toast.error('Error al eliminar el caso')
    }
  })

  // Filtrar casos por búsqueda
  const filteredCases = cases?.filter((caso: Case) => 
    caso.numero_caso.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caso.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caso.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este caso?')) {
      deleteMutation.mutate(id)
    }
  }

  const canCreateCase = user?.role === 'ADMIN'
  const canEditCase = (caso: Case) => {
    if (user?.role === 'ADMIN') return true
    return caso.asignado_a === user?.id && caso.tipo_caso === user?.role
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Casos</h1>
          <p className="text-gray-600 mt-1">Gestiona los casos contables y jurídicos</p>
        </div>
        {canCreateCase && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Nuevo Caso
          </button>
        )}
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número, título o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro por tipo */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as CaseType | 'ALL')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Todos los tipos</option>
              <option value="CONTABLE">📊 Contable</option>
              <option value="JURIDICO">⚖️ Jurídico</option>
            </select>
          </div>

          {/* Filtro por estado */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as CaseStatus | 'ALL')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Todos los estados</option>
              <option value="ABIERTO">🔵 Abierto</option>
              <option value="EN_PROCESO">⏳ En Proceso</option>
              <option value="CERRADO">✅ Cerrado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de casos */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Cargando casos...</p>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">No se encontraron casos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCases.map((caso: Case) => (
            <div
              key={caso.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 cursor-pointer"
              onClick={() => navigate(`/cases/${caso.id}`)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {caso.numero_caso}
                    </h3>
                    <Badge variant={caso.tipo_caso}>{caso.tipo_caso}</Badge>
                    <Badge variant={caso.estado}>{caso.estado.replace('_', ' ')}</Badge>
                  </div>
                  
                  <h4 className="text-md font-medium text-gray-700 mb-2">
                    {caso.titulo}
                  </h4>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {caso.descripcion}
                  </p>
                  
                  <div className="flex gap-6 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Cliente:</span> {caso.cliente_nombre}
                    </div>
                    {caso.asignado_a_nombre && (
                      <div>
                        <span className="font-medium">Asignado a:</span> {caso.asignado_a_nombre}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Versión:</span> v{caso.version_actual}
                    </div>
                  </div>
                </div>

                {user?.role === 'ADMIN' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(caso.id)
                    }}
                    className="text-red-600 hover:text-red-800 transition-colors px-3 py-1 text-sm"
                  >
                    Eliminar
                  </button>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-xs text-gray-500">
                <span>Creado: {new Date(caso.fecha_creacion).toLocaleDateString()}</span>
                <span>Actualizado: {new Date(caso.fecha_actualizacion).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de crear caso */}
      {showCreateModal && (
        <CaseFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}
