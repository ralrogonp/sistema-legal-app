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
