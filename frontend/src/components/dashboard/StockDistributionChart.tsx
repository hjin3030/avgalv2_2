// src/components/dashboard/StockDistributionChart.tsx

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
import { useStock } from '../../hooks/useStock'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#14b8a6', '#f97316', '#84cc16']

export default function StockDistributionChart() {
  const { stock, loading } = useStock()

  // Preparar datos: Top 10 SKUs con más stock
  const chartData = useMemo(() => {
    if (!stock.length) return []

    return stock
      .filter(s => s.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10)
      .map(s => ({
        sku: s.skuCodigo,
        nombre: s.skuNombre,
        cantidad: s.cantidad
      }))
  }, [stock])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Distribución de Stock</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Distribución de Stock</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Sin datos de stock
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">📊 Distribución de Stock (Top 10 SKUs)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="sku"
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
            formatter={(value: number) => [value.toLocaleString('es-CL') + ' unidades', 'Stock']}
            labelFormatter={(label) => {
              const item = chartData.find(d => d.sku === label)
              return item ? `${item.sku} - ${item.nombre}` : label
            }}
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
