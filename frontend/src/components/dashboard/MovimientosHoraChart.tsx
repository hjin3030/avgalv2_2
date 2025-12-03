// src/components/dashboard/MovimientosHoraChart.tsx

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useMovimientos } from '../../hooks/useMovimientos'
import { todayDateString, formatNumber } from '../../utils/formatHelpers'

interface HourRow {
  hora: string
  ingresos: number
  egresos: number
  total: number
}

function getFechaLocalFromMov(mov: any): string | null {
  // Si ya guardas un campo fecha 'YYYY-MM-DD', úsalo directo
  if (mov.fecha && typeof mov.fecha === 'string') return mov.fecha

  // Si viene un timestamp de Firestore (seconds / nanoseconds)
  const ts = mov.fechaHora || mov.timestamp || mov.createdAt
  if (ts && typeof ts === 'object') {
    const seconds = ts.seconds ?? ts._seconds
    const nanos = ts.nanoseconds ?? ts._nanoseconds ?? 0
    if (typeof seconds === 'number') {
      const date = new Date(seconds * 1000 + Math.floor(nanos / 1e6))
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }

  return null
}

function getHoraLabelFromMov(mov: any): string {
  // Si tienes un campo 'hora' tipo "HH:mm" lo usamos
  if (mov.hora && typeof mov.hora === 'string') {
    const hh = mov.hora.slice(0, 2)
    return `${hh.padStart(2, '0')}:00`
  }

  // Si no, calculamos desde el timestamp local
  const ts = mov.fechaHora || mov.timestamp || mov.createdAt
  if (ts && typeof ts === 'object') {
    const seconds = ts.seconds ?? ts._seconds
    const nanos = ts.nanoseconds ?? ts._nanoseconds ?? 0
    if (typeof seconds === 'number') {
      const date = new Date(seconds * 1000 + Math.floor(nanos / 1e6))
      const hh = String(date.getHours()).padStart(2, '0')
      return `${hh}:00`
    }
  }

  // Fallback
  return '00:00'
}

export default function MovimientosHoraChart() {
  const hoyLocal = todayDateString()

  const { movimientos, loading } = useMovimientos()

  const data: HourRow[] = useMemo(() => {
    if (!movimientos || !movimientos.length) return []

    // 1) Solo movimientos cuya fecha LOCAL coincide con hoyLocal
    const movimientosHoy = (movimientos || []).filter((m: any) => {
      const fechaLocal = getFechaLocalFromMov(m)
      return fechaLocal === hoyLocal
    })

    if (!movimientosHoy.length) return []

    // 2) Inicializar las 24 horas
    const horasMap = new Map<string, HourRow>()
    for (let h = 0; h < 24; h++) {
      const label = `${h.toString().padStart(2, '0')}:00`
      horasMap.set(label, {
        hora: label,
        ingresos: 0,
        egresos: 0,
        total: 0,
      })
    }

    // 3) Acumular por hora
    movimientosHoy.forEach((mov: any) => {
      const key = getHoraLabelFromMov(mov)

      if (!horasMap.has(key)) {
        horasMap.set(key, {
          hora: key,
          ingresos: 0,
          egresos: 0,
          total: 0,
        })
      }

      const row = horasMap.get(key)!
      const cantidad = mov.totalUnidades || mov.cantidad || 0
      const tipo: string = mov.tipo || '' // 'ingreso' | 'egreso' | ...

      if (tipo === 'ingreso') {
        row.ingresos += cantidad
      } else if (tipo === 'egreso') {
        row.egresos += cantidad
      }

      row.total = row.ingresos + row.egresos
      horasMap.set(key, row)
    })

    // 4) Orden por hora
    return Array.from(horasMap.values()).sort((a, b) =>
      a.hora.localeCompare(b.hora),
    )
  }, [movimientos, hoyLocal])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">
          🔄 Flujo de Movimientos por Hora (Hoy)
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
          🔄 Flujo de Movimientos por Hora (Hoy)
        </h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Sin movimientos registrados hoy
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">
        🔄 Flujo de Movimientos por Hora (Hoy)
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 0, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="hora"
            stroke="#666"
            style={{ fontSize: '11px' }}
            height={40}
          />
          <YAxis
            stroke="#666"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => formatNumber(value as number)}
          />
          <Tooltip
            formatter={(value: any, name: string) => {
              let label = ''
              if (name === 'ingresos') label = 'Ingresos'
              else if (name === 'egresos') label = 'Egresos'
              else if (name === 'total') label = 'Total'
              else label = name

              return [
                `${formatNumber(Number(value))} unidades`,
                label,
              ]
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="ingresos"
            name="Ingresos"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="egresos"
            name="Egresos"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
