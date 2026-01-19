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
  ResponsiveContainer,
} from 'recharts'
import { useVales } from '../../hooks/useVales'

function norm(s: any) {
  return String(s || '').trim().toLowerCase()
}

function isPacking(origenNombre: any) {
  const o = norm(origenNombre)
  // Acepta variantes típicas
  return o === 'packing' || o.startsWith('packing ')
}

function getOrigenComparacion(vale: any): string {
  const origenNombre = String(vale.origenNombre || '').trim()
  const pabellonNombre = String(vale.pabellonNombre || '').trim()
  const pabellonId = String(vale.pabellonId || '').trim()

  // Packing -> usar pabellón (porque packing es suma)
  if (isPacking(origenNombre)) {
    if (pabellonNombre) return pabellonNombre
    if (pabellonId) return `Pab ${pabellonId}`
    return 'Packing' // se excluirá más abajo
  }

  return origenNombre || 'Sin origen'
}

export default function TopOrigenesChart() {
  const { vales, loading } = useVales()

  const chartData = useMemo(() => {
    if (!vales?.length) return []

    // Entradas = ingresos + reingresos
    const entradas = (vales as any[]).filter(
      (v) => (v.tipo === 'ingreso' || v.tipo === 'reingreso') && (v.origenNombre || v.pabellonNombre || v.pabellonId),
    )

    const origenesMap = new Map<string, { nombre: string; ingreso: number; reingreso: number; total: number }>()

    entradas.forEach((vale) => {
      const key = getOrigenComparacion(vale)

      // Excluir packing “macro”
      if (isPacking(key)) return

      if (!origenesMap.has(key)) {
        origenesMap.set(key, { nombre: key, ingreso: 0, reingreso: 0, total: 0 })
      }

      const entry = origenesMap.get(key)!
      const unidades = Number(vale.totalUnidades || 0)

      if (vale.tipo === 'ingreso') entry.ingreso += unidades
      else if (vale.tipo === 'reingreso') entry.reingreso += unidades
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
        <div className="h-80 flex items-center justify-center text-gray-500">Sin datos de ingreso/reingreso</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">📥 Top 5 Orígenes (Pabellones + Origenes)</h3>
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
          <YAxis stroke="#666" style={{ fontSize: '12px' }} tickFormatter={(v) => Number(v).toLocaleString('es-CL')} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            formatter={(value: any) => `${Number(value).toLocaleString('es-CL')} uds`}
          />
          <Legend wrapperStyle={{ fontSize: '14px' }} />
          <Bar dataKey="ingreso" fill="#3b82f6" name="Ingreso" radius={[8, 8, 0, 0]} stackId="a" />
          <Bar dataKey="reingreso" fill="#10b981" name="Reingreso" radius={[8, 8, 0, 0]} stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
