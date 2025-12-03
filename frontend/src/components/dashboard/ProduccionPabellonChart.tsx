/// src/components/dashboard/ProduccionPabellonChart.tsx

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useContadores } from '../../hooks/useContadores'
import { todayDateString, formatNumber } from '../../lib/formatters'

const COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#6366f1',
  '#14b8a6',
]

interface ChartRow {
  pabellonId: string
  pabellonNombre: string
  cantidad: number
}

export default function ProduccionPabellonChart() {
  // Fecha de hoy (zona Chile) – se mantiene igual
  const hoy = todayDateString()

  const { contadores, loading } = useContadores(hoy)

  const chartData: ChartRow[] = useMemo(() => {
    if (!contadores?.contadores) return []

    // Clave SIEMPRE por pabellonId ("pab11", "pab12", etc.)
    const pabellonesMap = new Map<string, ChartRow>()

    contadores.contadores.forEach((c: any) => {
      const pabellonId: string = c.pabellonId || ''
      const pabellonNombre: string =
        c.pabellonNombre || pabellonId || 'Sin pabellón'

      if (!pabellonId) return

      const current = pabellonesMap.get(pabellonId) || {
        pabellonId,
        pabellonNombre,
        cantidad: 0,
      }

      pabellonesMap.set(pabellonId, {
        ...current,
        cantidad: current.cantidad + (c.valor || 0),
      })
    })

    return Array.from(pabellonesMap.values()).sort(
      (a, b) => b.cantidad - a.cantidad,
    )
  }, [contadores])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">
          🥚 Producción por Pabellón (Hoy)
        </h3>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">
          🥚 Producción CONTADORES por Pabellón AUTOMÁTICO (Hoy)
        </h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Sin contadores registrados hoy
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">
        🥚 Producción CONTADORES por Pabellón AUTOMÁTICO (Hoy)
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 0, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="pabellonNombre"
            stroke="#666"
            style={{ fontSize: '11px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#666"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => formatNumber(value as number)}
          />
          <Tooltip
            formatter={(value: any) => [
              `${formatNumber(value as number)} unidades`,
              'Producción teórica',
            ]}
          />
          <Bar dataKey="cantidad" name="Producción teórica">
            {chartData.map((entry, index) => (
              <Cell
                key={entry.pabellonId}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
