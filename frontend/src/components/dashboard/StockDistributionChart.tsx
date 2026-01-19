// src/components/dashboard/StockDistributionChart.tsx

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useStock } from '../../hooks/useStock'
import { getSkuInfo, isSkuAnalitico } from '../../utils/constants'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#14b8a6', '#f97316', '#84cc16']

type Row = {
  sku: string
  nombre?: string
  cantidad: number
  cajasEq?: number | null
}

export default function StockDistributionChart() {
  const { stock, loading } = useStock()

  const chartData: Row[] = useMemo(() => {
    if (!stock?.length) return []
    return stock
      .filter((s: any) => (s.cantidad || 0) > 0)
      .filter((s: any) => isSkuAnalitico(s.skuCodigo))
      .sort((a: any, b: any) => (b.cantidad || 0) - (a.cantidad || 0))
      .slice(0, 10)
      .map((s: any) => {
        const info = getSkuInfo(s.skuCodigo)
        const upc = info?.unidadesPorCaja
        const cajasEq = upc && upc > 0 ? Math.floor((s.cantidad || 0) / upc) : null
        return {
          sku: s.skuCodigo,
          nombre: s.skuNombre,
          cantidad: s.cantidad || 0,
          cajasEq,
        }
      })
  }, [stock])

  const totalStock = useMemo(() => chartData.reduce((acc, r) => acc + (r.cantidad || 0), 0), [chartData])
  const totalCajasEq = useMemo(() => {
    // Solo suma equivalencias donde se puede calcular
    const sum = chartData.reduce((acc, r) => acc + (typeof r.cajasEq === 'number' ? r.cajasEq : 0), 0)
    const any = chartData.some((r) => typeof r.cajasEq === 'number')
    return any ? sum : null
  }, [chartData])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold mb-2">📦 Distribución de Stock (Top 10 SKUs)</h3>
        <div className="text-gray-500">Cargando stock...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-1">
        📦 Distribución de Stock (Top 10 SKUs) — Total: {totalStock.toLocaleString('es-CL')}
        {typeof totalCajasEq === 'number' ? ` (${totalCajasEq.toLocaleString('es-CL')}C)` : ''}
      </h3>
      <div className="text-xs text-gray-500 mb-3">Equivalencia en cajas (C) se muestra solo cuando existe “unidadesPorCaja”.</div>

      {!chartData.length ? (
        <div className="text-gray-500">No hay datos de stock.</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="sku" interval={0} angle={-30} textAnchor="end" height={60} />
            <YAxis />
            <Tooltip
              formatter={(value: any, name: any, props: any) => {
                if (name === 'cantidad') {
                  const cajas = props?.payload?.cajasEq
                  return [`${Number(value).toLocaleString('es-CL')} uds${typeof cajas === 'number' ? ` (${cajas.toLocaleString('es-CL')}C)` : ''}`, 'Stock']
                }
                return [value, name]
              }}
              labelFormatter={(label) => `SKU: ${label}`}
            />
            <Bar dataKey="cantidad">
              {chartData.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
