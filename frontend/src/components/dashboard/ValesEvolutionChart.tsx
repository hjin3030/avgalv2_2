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
  ResponsiveContainer,
} from 'recharts'
import { useVales } from '../../hooks/useVales'

type PeriodoDashboard = 'hoy' | '7d' | '30d' | 'mes'

function fechaChileISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildLastNDays(n: number) {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(start.getDate() - (n - 1))

  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const dt = new Date(start)
    dt.setDate(start.getDate() + i)
    out.push(fechaChileISO(dt))
  }
  return out
}

function fechaLabelDDM(fechaISO: string) {
  const [y, m, d] = String(fechaISO).split('-').map(Number)
  if (!y || !m || !d) return fechaISO
  return `${d}/${m}`
}

function getTitulo(periodo: PeriodoDashboard, days: number) {
  if (periodo === 'hoy') return '📊 Evolución de Vales por Tipo (Hoy)'
  if (periodo === 'mes') return '📊 Evolución de Vales por Tipo (Mes actual)'
  return `📊 Evolución de Vales por Tipo (Últimos ${days} días)`
}

export default function ValesEvolutionBarChart({
  days = 7,
  periodo = '7d',
}: {
  days?: number
  periodo?: PeriodoDashboard
}) {
  const { vales, loading } = useVales()

  const chartData = useMemo(() => {
    const safeDays = Math.max(1, Math.min(62, Number(days || 7))) // tope defensivo
    const dias = buildLastNDays(safeDays) // incluye hoy sí o sí

    const dataMap = new Map<string, any>()
    dias.forEach((fecha) => {
      dataMap.set(fecha, {
        fecha,
        fechaLabel: fechaLabelDDM(fecha),
        ingreso: 0,
        egreso: 0,
        reingreso: 0,
        total: 0,
      })
    })

    ;(vales || []).forEach((vale: any) => {
      const f = String(vale.fecha || '')
      if (!f || !dataMap.has(f)) return
      const entry = dataMap.get(f)!
      entry.total += 1
      if (vale.tipo === 'ingreso') entry.ingreso += 1
      else if (vale.tipo === 'egreso') entry.egreso += 1
      else if (vale.tipo === 'reingreso') entry.reingreso += 1
      dataMap.set(f, entry)
    })

    return dias.map((d) => dataMap.get(d))
  }, [vales, days])

  const titulo = getTitulo(periodo, days)

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold mb-2">{titulo}</h3>
        <div className="text-gray-500">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-3">{titulo}</h3>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="fechaLabel" />
          <YAxis allowDecimals={false} />
          <Tooltip
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload
              return row?.fecha || ''
            }}
          />
          <Legend />
          <Bar dataKey="ingreso" name="Ingreso" fill="#3b82f6" />
          <Bar dataKey="egreso" name="Egreso" fill="#f59e0b" />
          <Bar dataKey="reingreso" name="Reingreso" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
