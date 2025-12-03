// src/components/dashboard/ProduccionPorPabellonRealChart.tsx

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
import { useVales } from '../../hooks/useVales'
import { todayDateString, formatNumber } from '../../utils/formatHelpers'

// Pabellones activos (reales) – clave por ID
const PABELLONES_ACTIVOS: { id: string; nombre: string }[] = [
  { id: 'pab11', nombre: 'Pabellón 11' },
  { id: 'pab12', nombre: 'Pabellón 12' },
  { id: 'pab13', nombre: 'Pabellón 13' },
  { id: 'pab14', nombre: 'Pabellón 14' },
  { id: 'pab15', nombre: 'Pabellón 15' },
  { id: 'pabR2', nombre: 'Pabellón R2' },
]

const PAB_IDS_ACTIVOS = PABELLONES_ACTIVOS.map((p) => p.id)

interface Row {
  pabellonId: string
  pabellonNombre: string
  unidades: number
}

export default function ProduccionPorPabellonRealChart() {
  const hoyLocal = todayDateString()

  // useVales puede traer más rango; aquí luego filtramos por fecha === hoyLocal
  const { vales, loading } = useVales({
    tipo: 'ingreso',
    estado: 'validado',
  })

  const data: Row[] = useMemo(() => {
    if (!vales || !vales.length) return []

    // 1) Filtrar SOLO vales del día actual
    const valesHoy = (vales || []).filter(
      (v: any) => v.fecha === hoyLocal,
    )

    if (!valesHoy.length) return []

    const map = new Map<string, Row>()

    valesHoy.forEach((vale: any) => {
      const origenId: string = vale.origenId || ''
      if (!PAB_IDS_ACTIVOS.includes(origenId)) return

      const definicion = PABELLONES_ACTIVOS.find((p) => p.id === origenId)
      const pabellonNombre =
        definicion?.nombre || vale.origenNombre || origenId

      const totalVale = (vale.detalles || []).reduce(
        (acc: number, d: any) => acc + (d.totalUnidades || 0),
        0,
      )

      const current = map.get(origenId) || {
        pabellonId: origenId,
        pabellonNombre,
        unidades: 0,
      }

      map.set(origenId, {
        ...current,
        unidades: current.unidades + totalVale,
      })
    })

    // Mantener orden fijo 11,12,13,14,15,R2 y eliminar los que queden en 0
    return PABELLONES_ACTIVOS.map((p) => {
      const row = map.get(p.id)
      return {
        pabellonId: p.id,
        pabellonNombre: p.nombre,
        unidades: row?.unidades || 0,
      }
    }).filter((row) => row.unidades > 0)
  }, [vales, hoyLocal])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">
          🏭 Distribución Producción REAL (Hoy)
        </h3>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">
          🏭 Distribución Producción REAL (Hoy)
        </h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Sin producción registrada hoy en pabellones 11, 12, 13, 14, 15 y R2
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">
        🏭 Distribución Producción REAL (Hoy)
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={data}
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
              'Producción real',
            ]}
          />
          <Legend />
          <Bar
            dataKey="unidades"
            name="Producción real"
            fill="#f97316"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
