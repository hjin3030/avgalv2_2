// src/components/dashboard/ProduccionPabellonChart.tsx

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { useContadores } from '../../hooks/useContadores'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#14b8a6']

export default function ProduccionPabellonChart() {
  const hoy = new Date().toISOString().split('T')[0]
  const { contadores, loading } = useContadores(hoy)

  const chartData = useMemo(() => {
    if (!contadores?.contadores) return []

    const pabellonesMap = new Map<string, number>()

    contadores.contadores.forEach(c => {
      const pabellon = c.pabellonNombre || `Pab ${c.pabellonId}`
      pabellonesMap.set(
        pabellon,
        (pabellonesMap.get(pabellon) || 0) + (c.valor || 0)
      )
    })

    return Array.from(pabellonesMap.entries())
      .map(([pabellon, cantidad]) => ({ pabellon, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
  }, [contadores])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">🥚 Producción por Pabellón (Hoy)</h3>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">🥚 Producción por Pabellón (Hoy)</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Sin contadores registrados hoy
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">🥚 Producción por Pabellón (Hoy)</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="pabellon"
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
            formatter={(value: number) => [value.toLocaleString('es-CL') + ' unidades', 'Producción']}
          />
          <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
