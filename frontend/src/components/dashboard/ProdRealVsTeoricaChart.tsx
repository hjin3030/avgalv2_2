// src/components/dashboard/ProdRealVsTeoricaChart.tsx

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useContadores } from '../../hooks/useContadores'
import { useVales } from '../../hooks/useVales'
import {
  todayDateString,
  formatNumber,
  formatPercent,
} from '../../utils/formatHelpers'

// Pabellones automáticos (solo estos tienen producción teórica)
const PABELLONES_AUTOMATICOS: { id: string; nombre: string }[] = [
  { id: 'pab13', nombre: 'Pabellón 13' },
  { id: 'pab14', nombre: 'Pabellón 14' },
  { id: 'pab15', nombre: 'Pabellón 15' },
]

const PAB_IDS_AUTOMATICOS = PABELLONES_AUTOMATICOS.map((p) => p.id)

interface ProdRow {
  pabellonId: string
  pabellonNombre: string
  teorica: number
  real: number
  variacionPct: number
}

export default function ProdRealVsTeoricaChart() {
  const hoyLocal = todayDateString()

  // TEÓRICA: contadores del día actual (este hook ya recibe la fecha)
  const { contadores, loading: loadingContadores } = useContadores(hoyLocal)

  // REAL: traemos vales y filtramos por fecha === hoyLocal en el componente
  const { vales, loading: loadingVales } = useVales({
    tipo: 'ingreso',
    estado: 'validado',
  })

  const chartData: ProdRow[] = useMemo(() => {
    const map = new Map<string, ProdRow>()

    // Inicializar filas para cada pabellón automático
    PABELLONES_AUTOMATICOS.forEach((p) => {
      map.set(p.id, {
        pabellonId: p.id,
        pabellonNombre: p.nombre,
        teorica: 0,
        real: 0,
        variacionPct: 0,
      })
    })

    // TEÓRICA desde contadores (día actual)
    if (contadores?.contadores?.length) {
      contadores.contadores.forEach((c: any) => {
        const pabId: string = c.pabellonId || ''
        if (!PAB_IDS_AUTOMATICOS.includes(pabId)) return

        const definicion = PABELLONES_AUTOMATICOS.find((p) => p.id === pabId)
        const pabellonNombre =
          definicion?.nombre || c.pabellonNombre || pabId

        const current = map.get(pabId) || {
          pabellonId: pabId,
          pabellonNombre,
          teorica: 0,
          real: 0,
          variacionPct: 0,
        }

        map.set(pabId, {
          ...current,
          teorica: current.teorica + (c.valor || 0),
        })
      })
    }

    // REAL desde vales, pero SOLO los del día actual
    const valesHoy = (vales || []).filter(
      (v: any) => v.fecha === hoyLocal,
    )

    if (valesHoy.length) {
      valesHoy.forEach((v: any) => {
        const pabId: string = v.origenId || ''
        if (!PAB_IDS_AUTOMATICOS.includes(pabId)) return

        const definicion = PABELLONES_AUTOMATICOS.find((p) => p.id === pabId)
        const pabellonNombre =
          definicion?.nombre || v.origenNombre || pabId

        const totalVale = (v.detalles || []).reduce(
          (acc: number, d: any) => acc + (d.totalUnidades || 0),
          0,
        )

        const current = map.get(pabId) || {
          pabellonId: pabId,
          pabellonNombre,
          teorica: 0,
          real: 0,
          variacionPct: 0,
        }

        map.set(pabId, {
          ...current,
          real: current.real + totalVale,
        })
      })
    }

    // Calcular variación
    const rows = Array.from(map.values()).map((row) => {
      let variacionPct = 0
      if (row.teorica > 0) {
        variacionPct = row.real / row.teorica - 1
      }
      return {
        ...row,
        variacionPct,
      }
    })

    // Si quieres ocultar filas totalmente en cero, descomenta:
    // return rows.filter((r) => r.teorica > 0 || r.real > 0)
    return rows
  }, [contadores, vales, hoyLocal])

  const loading = loadingContadores || loadingVales

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">
          📊 Prod. REAL vs TEÓRICA (Automáticos)
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
          📊 Prod. REAL vs TEÓRICA (Automáticos)
        </h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Sin datos de producción hoy para pabellones automáticos (13, 14, 15)
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">
        📊 Prod. REAL vs TEÓRICA HOY (Pabs 13–14-15)
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
            tickFormatter={(value: number) => formatNumber(value)}
          />
          <Tooltip
            formatter={(value: any, name: string) => {
              if (name === 'variacionPct') {
                return [
                  formatPercent(value as number, 1),
                  'Variación REAL vs TEÓRICA',
                ]
              }
              if (name === 'teorica') {
                return [
                  `${formatNumber(Number(value))} unidades`,
                  'Prod. teórica',
                ]
              }
              if (name === 'real') {
                return [
                  `${formatNumber(Number(value))} unidades`,
                  'Prod. real',
                ]
              }
              return [`${formatNumber(Number(value))} unidades`, name]
            }}
          />
          <Legend />
          <Bar
            dataKey="teorica"
            name="Prod. teórica"
            fill="#3b82f6"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="real"
            name="Prod. real"
            fill="#22c55e"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
