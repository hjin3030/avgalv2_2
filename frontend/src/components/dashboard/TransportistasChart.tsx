// src/components/dashboard/TransportistasChart.tsx

import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts'
import { useVales } from '../../hooks/useVales'

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function TransportistasChart() {
  const { vales, loading } = useVales()

  const chartData = useMemo(() => {
    if (!vales.length) return []

    // Filtrar vales con transportista
    const valesConTransportista = vales.filter(v => v.transportistaNombre)

    const transportistasMap = new Map<string, number>()

    valesConTransportista.forEach(vale => {
      const transportista = vale.transportistaNombre || 'Sin transportista'
      transportistasMap.set(
        transportista,
        (transportistasMap.get(transportista) || 0) + (vale.totalUnidades || 0)
      )
    })

    return Array.from(transportistasMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [vales])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">🚚 Distribución por Transportista</h3>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">🚚 Distribución por Transportista</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Sin datos de transportistas
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">🚚 Distribución por Transportista</h3>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
            formatter={(value: number) => value.toLocaleString('es-CL') + ' unidades'}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
