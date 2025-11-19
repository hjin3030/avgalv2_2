// frontend/src/pages/dashboard/Dashboard.tsx

import { useAuth } from '@/hooks/useAuth'

export default function Dashboard() {
  const { profile } = useAuth()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Panel de control con métricas, KPIs y análisis de datos en tiempo real
        </p>
      </div>

      {/* Construcción Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-md p-12 text-center">
        <div className="max-w-2xl mx-auto">
          {/* Icono */}
          <div className="text-8xl mb-6">🚧</div>
          
          {/* Título */}
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            En Construcción
          </h2>
          
          {/* Descripción */}
          <p className="text-xl text-gray-600 mb-6">
            Este módulo incluirá próximamente:
          </p>
          
          {/* Lista de features */}
          <div className="bg-white rounded-lg p-6 shadow-sm text-left">
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-green-500 mr-3 text-xl">✓</span>
                <span><strong>KPIs en tiempo real:</strong> producción diaria, stock crítico, vales pendientes</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 text-xl">✓</span>
                <span><strong>Gráficos interactivos:</strong> tendencias de producción, análisis de stock</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 text-xl">✓</span>
                <span><strong>Reportes históricos:</strong> comparativas mensuales, exportación de datos</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 text-xl">✓</span>
                <span><strong>Alertas automáticas:</strong> notificaciones de stock bajo, vales sin validar</span>
              </li>
            </ul>
          </div>
          
          {/* Footer info */}
          <div className="mt-8 text-sm text-gray-500">
            Módulo accesible para: <span className="font-semibold capitalize">{profile?.rol}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
