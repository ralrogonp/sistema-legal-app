import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';
import { casesAPI } from '../services/api';
import CreateCaseModal from '../components/CreateCaseModal';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function CasesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Query para obtener casos
  const { data: cases, isLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => casesAPI.getAll().then(res => res.data.data)
  });

  // Mutation para crear caso con documentos
  const createCaseMutation = useMutation({
    mutationFn: async ({ caseData, files }: { caseData: any; files: File[] }) => {
      // 1. Crear el caso
      const caseResponse = await casesAPI.create(caseData);
      const createdCase = caseResponse.data.data;

      // 2. Si hay archivos, subirlos
      if (files.length > 0) {
        const uploadPromises = files.map(file => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('caso_id', createdCase.id.toString());
          
          return axios.post(`${API_URL}/documents`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
        });

        await Promise.all(uploadPromises);
      }

      return createdCase;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      const filesCount = variables.files.length;
      toast.success(
        `Caso creado exitosamente${filesCount > 0 ? ` con ${filesCount} documento(s)` : ''}`
      );
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al crear caso');
    }
  });

  const deleteCaseMutation = useMutation({
    mutationFn: (id: number) => casesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.success('Caso eliminado');
    },
    onError: () => toast.error('Error al eliminar caso')
  });

  const handleCreateCase = (data: any, files: File[]) => {
    createCaseMutation.mutate({ caseData: data, files });
  };

  const handleDeleteCase = (id: number, numeroCaso: string) => {
    if (confirm(`¿Eliminar el caso ${numeroCaso}?`)) {
      deleteCaseMutation.mutate(id);
    }
  };

  // Filtrado de casos
  const filteredCases = cases?.filter((caso: any) => {
    const matchesSearch = 
      caso.numero_caso?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caso.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caso.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || caso.tipo_caso === filterType;
    const matchesStatus = filterStatus === 'ALL' || caso.estado === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (estado: string) => {
    const badges: any = {
      'ABIERTO': 'bg-yellow-100 text-yellow-800',
      'EN_PROCESO': 'bg-blue-100 text-blue-800',
      'CERRADO': 'bg-green-100 text-green-800'
    };
    return badges[estado] || 'bg-gray-100 text-gray-800';
  };

  const getTypeBadge = (tipo: string) => {
    return tipo === 'CONTABLE' 
      ? 'bg-purple-100 text-purple-800' 
      : 'bg-indigo-100 text-indigo-800';
  };

  const isAdmin = user?.role === 'ADMIN';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando casos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Casos</h1>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <PlusIcon className="w-5 h-5" />
            Nuevo Caso
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número, título o cliente..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtro por Tipo */}
          <select
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">Todos los tipos</option>
            <option value="CONTABLE">CONTABLE</option>
            <option value="JURIDICO">JURIDICO</option>
          </select>

          {/* Filtro por Estado */}
          <select
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">Todos los estados</option>
            <option value="ABIERTO">ABIERTO</option>
            <option value="EN_PROCESO">EN PROCESO</option>
            <option value="CERRADO">CERRADO</option>
          </select>
        </div>
      </div>

      {/* Lista de Casos */}
      {filteredCases?.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No se encontraron casos</p>
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Crear primer caso
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases?.map((caso: any) => (
            <div
              key={caso.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-5"
            >
              {/* Header del Card */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs text-gray-500 font-medium">
                    {caso.numero_caso}
                  </p>
                  <h3 className="font-bold text-lg mt-1 line-clamp-2">
                    {caso.titulo || caso.descripcion?.substring(0, 50)}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeBadge(caso.tipo_caso)}`}>
                    {caso.tipo_caso}
                  </span>
                </div>
              </div>

              {/* Cliente */}
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Cliente:</span> {caso.cliente_nombre}
                </p>
                {caso.cliente_rfc && (
                  <p className="text-xs text-gray-500 mt-1">
                    RFC: {caso.cliente_rfc}
                  </p>
                )}
              </div>

              {/* Descripción */}
              <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                {caso.descripcion}
              </p>

              {/* Footer del Card */}
              <div className="flex justify-between items-center pt-3 border-t">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(caso.estado)}`}>
                  {caso.estado}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.location.href = `/cases/${caso.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ver detalle
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteCase(caso.id, caso.numero_caso)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>

              {/* Info adicional */}
              <div className="mt-3 pt-3 border-t text-xs text-gray-500 flex justify-between">
                <span>Versión {caso.version_actual || 1}</span>
                <span>{new Date(caso.fecha_creacion).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación */}
      <CreateCaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateCase}
        isSubmitting={createCaseMutation.isPending}
      />
    </div>
  );
}
