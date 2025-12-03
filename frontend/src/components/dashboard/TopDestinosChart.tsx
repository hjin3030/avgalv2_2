// src/components/dashboard/TopDestinosChart.tsx

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { useVales } from '../../hooks/useVales'

export default function TopDestinosChart() {
  const { vales, loading } = useVales()

  const chartData = useMemo(() => {
    if (!vales.length) return []

    const egresos = vales.filter(v => v.tipo === 'egreso' && v.destinoNombre)

    const destinosMap = new Map<string, { nombre: string; totalUnidades: number; vales: number }>()

    egresos.forEach(vale => {
      const destino = vale.destinoNombre || 'Sin destino'
      if (!destinosMap.has(destino)) {
        destinosMap.set(destino, { nombre: destino, totalUnidades: 0, vales: 0 })
      }
      const entry = destinosMap.get(destino)!
      entry.totalUnidades += vale.totalUnidades || 0
      entry.vales++
    })

    return Array.from(destinosMap.values())
      .sort((a, b) => b.totalUnidades - a.totalUnidades)
      .slice(0, 5)
  }, [vales])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">🎯 Top 5 Destinos (Egresos)</h3>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">🎯 Top 5 Destinos (Egresos)</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Sin egresos registrados
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">🎯 Top 5 Destinos (Egresos)</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="nombre"
            stroke="#666"
            style={{ fontSize: '11px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#666"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => value.toLocaleString('es-CL')}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
            formatter={(value: number, name: string, props: any) => [
              `${value.toLocaleString('es-CL')} unidades (${props.payload.vales} vales)`,
              'Total Egresado'
            ]}
          />
          <Bar dataKey="totalUnidades" fill="#f97316" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
