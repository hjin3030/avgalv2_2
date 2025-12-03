// src/components/dashboard/TopOrigenesChart.tsx

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { useVales } from '../../hooks/useVales'

export default function TopOrigenesChart() {
  const { vales, loading } = useVales()

  const chartData = useMemo(() => {
    if (!vales.length) return []

    // Filtrar ingresos y reingresos
    const ingresoReingreso = vales.filter(
      v => (v.tipo === 'ingreso' || v.tipo === 'reingreso') && v.origenNombre
    )

    const origenesMap = new Map<string, { nombre: string; ingreso: number; reingreso: number; total: number }>()

    ingresoReingreso.forEach(vale => {
      const origen = vale.origenNombre || 'Sin origen'
      if (!origenesMap.has(origen)) {
        origenesMap.set(origen, { nombre: origen, ingreso: 0, reingreso: 0, total: 0 })
      }
      const entry = origenesMap.get(origen)!
      const unidades = vale.totalUnidades || 0
      
      if (vale.tipo === 'ingreso') {
        entry.ingreso += unidades
      } else if (vale.tipo === 'reingreso') {
        entry.reingreso += unidades
      }
      entry.total += unidades
    })

    return Array.from(origenesMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [vales])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">📥 Top 5 Orígenes (Entradas)</h3>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">📥 Top 5 Orígenes (Entradas)</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Sin datos de ingreso/reingreso
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">📥 Top 5 Orígenes (Ingreso + Reingreso)</h3>
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
            formatter={(value: number) => value.toLocaleString('es-CL') + ' uds'}
          />
          <Legend wrapperStyle={{ fontSize: '14px' }} />
          <Bar dataKey="ingreso" fill="#3b82f6" name="Ingreso" radius={[8, 8, 0, 0]} stackId="a" />
          <Bar dataKey="reingreso" fill="#10b981" name="Reingreso" radius={[8, 8, 0, 0]} stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
