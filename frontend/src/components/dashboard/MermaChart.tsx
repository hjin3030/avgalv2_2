// src/components/dashboard/MermaChart.tsx

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts'
import { usePesosBalde } from '../../hooks/usePesosBalde'

interface ChartPoint {
  fecha: string
  peso: number
}

export default function MermaChart() {
  const { pesosBalde, loading } = usePesosBalde(30)

  const chartData: ChartPoint[] = useMemo(() => {
    if (!pesosBalde.length) return []

    return pesosBalde.map((pb) => ({
      fecha: pb.fecha,
      peso: pb.peso,
    }))
  }, [pesosBalde])

  // Promedio de peso balde en los últimos 30 días (solo días con dato)
  const promedioPeso = useMemo(() => {
    if (!chartData.length) return 0
    const suma = chartData.reduce((acc, p) => acc + p.peso, 0)
    return suma / chartData.length
  }, [chartData])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">
          ⚖️ Tendencia de Merma (Peso Balde)
        </h3>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        </div>
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">
          ⚖️ Tendencia de Merma (Peso Balde)
        </h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Sin datos de merma registrados
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          ⚖️ Tendencia de Merma (Últimos 30 días)
        </h3>
        <span className="text-sm text-gray-500">
          Promedio: <strong>{promedioPeso.toFixed(2)} kg</strong>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="fecha"
            tickFormatter={(value) => {
              const date = new Date(value)
              return `${date.getDate()}/${date.getMonth() + 1}`
            }}
            stroke="#666"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#666"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => value.toFixed(1) + ' kg'}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            labelFormatter={(value) => {
              const date = new Date(value)
              return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
            }}
            formatter={(value: number) => [value.toFixed(2) + ' kg', 'Peso Balde']}
          />
          <Legend verticalAlign="top" height={24} />
          {/* Línea de merma (peso balde) */}
          <Line
            type="monotone"
            dataKey="peso"
            name="Peso balde"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
            activeDot={{ r: 6 }}
          />
          {/* Línea horizontal de promedio */}
          {promedioPeso > 0 && (
            <ReferenceLine
              y={promedioPeso}
              stroke="#3b82f6"
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
              label={{
                value: 'Promedio 30 días',
                position: 'right',
                fill: '#3b82f6',
                fontSize: 11,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
