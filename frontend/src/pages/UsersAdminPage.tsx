import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  UserPlusIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const usersAPI = {
  getPending: () => axios.get(`${API_URL}/users/pending`),
  getAll: () => axios.get(`${API_URL}/users`),
  approve: (id: number, role: string) => axios.patch(`${API_URL}/users/${id}/approve`, { role }),
  changeRole: (id: number, role: string) => axios.patch(`${API_URL}/users/${id}/role`, { role }),
  toggleStatus: (id: number) => axios.patch(`${API_URL}/users/${id}/toggle-status`)
};

export default function UsersAdminPage() {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<'pending' | 'all'>('pending');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState('CONTABLE');

  // Queries
  const { data: pendingUsers, isLoading: loadingPending } = useQuery({
    queryKey: ['users', 'pending'],
    queryFn: () => usersAPI.getPending().then(res => res.data.data)
  });

  const { data: allUsers, isLoading: loadingAll } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => usersAPI.getAll().then(res => res.data.data),
    enabled: selectedTab === 'all'
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => usersAPI.approve(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario aprobado exitosamente');
      setShowApproveModal(false);
      setSelectedUser(null);
    },
    onError: () => toast.error('Error al aprobar usuario')
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: number) => usersAPI.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Estado actualizado');
    },
    onError: () => toast.error('Error al cambiar estado')
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => usersAPI.changeRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Rol actualizado');
    },
    onError: () => toast.error('Error al cambiar rol')
  });

  const handleApprove = (user: any) => {
    setSelectedUser(user);
    setShowApproveModal(true);
  };

  const confirmApprove = () => {
    if (!selectedUser) return;
    approveMutation.mutate({ id: selectedUser.id, role: selectedRole });
  };

  const getRoleBadge = (role: string) => {
    const badges: any = {
      'ADMIN': 'bg-red-100 text-red-800',
      'CONTABLE': 'bg-blue-100 text-blue-800',
      'JURIDICO': 'bg-purple-100 text-purple-800'
    };
    return badges[role] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (estado: string, activo: boolean) => {
    if (estado === 'PENDIENTE') {
      return 'bg-yellow-100 text-yellow-800';
    }
    if (!activo || estado === 'INACTIVO') {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Administración de Usuarios</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setSelectedTab('pending')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5" />
              Pendientes de Aprobación
              {pendingUsers?.length > 0 && (
                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {pendingUsers.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setSelectedTab('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <UserPlusIcon className="w-5 h-5" />
              Todos los Usuarios
            </span>
          </button>
        </nav>
      </div>

      {/* Content */}
      {selectedTab === 'pending' && (
        <div className="bg-white rounded-lg shadow">
          {loadingPending ? (
            <div className="p-12 text-center text-gray-500">
              Cargando usuarios pendientes...
            </div>
          ) : pendingUsers?.length === 0 ? (
            <div className="p-12 text-center">
              <ClockIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No hay usuarios pendientes de aprobación</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha Registro
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingUsers?.map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{user.nombre_completo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.fecha_creacion).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleApprove(user)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                          Aprobar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'all' && (
        <div className="bg-white rounded-lg shadow">
          {loadingAll ? (
            <div className="p-12 text-center text-gray-500">
              Cargando usuarios...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Último Acceso
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allUsers?.map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{user.nombre_completo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.role ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadge(user.role)}`}>
                            {user.role}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">Sin rol</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(user.estado_registro, user.activo)}`}>
                          {user.estado_registro}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.fecha_ultimo_acceso 
                          ? new Date(user.fecha_ultimo_acceso).toLocaleString()
                          : 'Nunca'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => toggleStatusMutation.mutate(user.id)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            user.activo
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {user.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Aprobación */}
      {showApproveModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Aprobar Usuario</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Nombre:</strong> {selectedUser.nombre_completo}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <strong>Email:</strong> {selectedUser.email}
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asignar Rol
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="CONTABLE">CONTABLE</option>
                <option value="JURIDICO">JURIDICO</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmApprove}
                disabled={approveMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {approveMutation.isPending ? 'Aprobando...' : 'Aprobar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
