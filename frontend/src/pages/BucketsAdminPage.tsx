import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CircleStackIcon,
  PlusIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const bucketsAPI = {
  list: () => axios.get(`${API_URL}/buckets`),
  create: (data: any) => axios.post(`${API_URL}/buckets`, data)
};

export default function BucketsAdminPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    region: 'us-east-1',
    descripcion: ''
  });

  // Query
  const { data: bucketsData, isLoading } = useQuery({
    queryKey: ['buckets'],
    queryFn: () => bucketsAPI.list().then(res => res.data.data)
  });

  // Mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => bucketsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      toast.success('Bucket creado exitosamente');
      setShowCreateModal(false);
      setFormData({ nombre: '', region: 'us-east-1', descripcion: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al crear bucket');
    }
  });

  const handleCreate = () => {
    if (!formData.nombre) {
      toast.error('El nombre del bucket es obligatorio');
      return;
    }

    // Validar nombre de bucket (solo lowercase, números, guiones)
    const bucketNameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (!bucketNameRegex.test(formData.nombre)) {
      toast.error('Nombre inválido. Solo minúsculas, números y guiones');
      return;
    }

    createMutation.mutate(formData);
  };

  const awsBuckets = bucketsData?.aws_buckets || [];
  const registeredBuckets = bucketsData?.registered_buckets || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Buckets S3</h1>
          <p className="text-gray-600 mt-1">
            Administra los buckets de almacenamiento del sistema
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5" />
          Crear Bucket
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CircleStackIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total AWS</p>
              <p className="text-2xl font-bold">{awsBuckets.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Registrados</p>
              <p className="text-2xl font-bold">{registeredBuckets.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <CircleStackIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-2xl font-bold">
                {registeredBuckets.filter((b: any) => b.activo).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Buckets Registrados */}
      <div>
        <h2 className="text-xl font-bold mb-4">Buckets Registrados en el Sistema</h2>
        <div className="bg-white rounded-lg shadow">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              Cargando buckets...
            </div>
          ) : registeredBuckets.length === 0 ? (
            <div className="p-12 text-center">
              <CircleStackIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No hay buckets registrados</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Crear primer bucket
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Región
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha Creación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {registeredBuckets.map((bucket: any) => (
                    <tr key={bucket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CircleStackIcon className="w-5 h-5 text-blue-500" />
                          <span className="font-medium text-gray-900">{bucket.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {bucket.region}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {bucket.descripcion || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(bucket.fecha_creacion).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          bucket.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {bucket.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Buckets AWS (Todos) */}
      <div>
        <h2 className="text-xl font-bold mb-4">Todos los Buckets en AWS</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {awsBuckets.map((bucket: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-start gap-3">
                  <CircleStackIcon className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {bucket.Name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Creado: {new Date(bucket.CreationDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {awsBuckets.length === 0 && (
            <p className="text-center text-gray-500">No se encontraron buckets en AWS</p>
          )}
        </div>
      </div>

      {/* Modal Crear Bucket */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Crear Nuevo Bucket</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Bucket *
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="mi-bucket-sistema-legal"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value.toLowerCase() })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Solo minúsculas, números y guiones. Debe ser único globalmente.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Región
                  </label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  >
                    <option value="us-east-1">US East (N. Virginia)</option>
                    <option value="us-west-2">US West (Oregon)</option>
                    <option value="eu-west-1">EU (Ireland)</option>
                    <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2"
                    rows={3}
                    placeholder="Descripción del uso del bucket..."
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ nombre: '', region: 'us-east-1', descripcion: '' });
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creando...' : 'Crear Bucket'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
