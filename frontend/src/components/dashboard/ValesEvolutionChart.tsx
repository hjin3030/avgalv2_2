// src/components/dashboard/ValesEvolutionBarChart.tsx

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

export default function ValesEvolutionBarChart() {
  const { vales, loading } = useVales()

  const chartData = useMemo(() => {
    if (!vales.length) return []

    const hoy = new Date()
    const hace7dias = new Date(hoy)
    hace7dias.setDate(hoy.getDate() - 7)

    const dataMap = new Map<string, { fecha: string; ingreso: number; egreso: number; reingreso: number; total: number }>()

    for (let i = 0; i < 7; i++) {
      const fecha = new Date(hace7dias)
      fecha.setDate(hace7dias.getDate() + i)
      const fechaStr = fecha.toISOString().split('T')[0]
      dataMap.set(fechaStr, {
        fecha: fechaStr,
        ingreso: 0,
        egreso: 0,
        reingreso: 0,
        total: 0
      })
    }

    vales.forEach(vale => {
      if (vale.fecha && dataMap.has(vale.fecha)) {
        const entry = dataMap.get(vale.fecha)!
        entry.total++
        if (vale.tipo === 'ingreso') entry.ingreso++
        else if (vale.tipo === 'egreso') entry.egreso++
        else if (vale.tipo === 'reingreso') entry.reingreso++
      }
    })

    return Array.from(dataMap.values()).sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [vales])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Evolución de Vales (Barras)</h3>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">📊 Evolución de Vales por Tipo (Últimos 7 días)</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
          <YAxis stroke="#666" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
            labelFormatter={(value) => {
              const date = new Date(value)
              return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
            }}
          />
          <Legend wrapperStyle={{ fontSize: '14px' }} />
          <Bar dataKey="ingreso" fill="#3b82f6" name="Ingresos" radius={[4, 4, 0, 0]} />
          <Bar dataKey="egreso" fill="#f97316" name="Egresos" radius={[4, 4, 0, 0]} />
          <Bar dataKey="reingreso" fill="#10b981" name="Reingresos" radius={[4, 4, 0, 0]} />
          <Bar dataKey="total" fill="#6366f1" name="Total" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
