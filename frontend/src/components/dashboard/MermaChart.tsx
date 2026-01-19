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
import { useMovimientos } from '../../hooks/useMovimientos'
import { GRAMOS_POR_UNIDAD } from '../../utils/constants'

type PeriodoDashboard = 'hoy' | '7d' | '30d' | 'mes'

interface ChartPoint {
  fecha: string // YYYY-MM-DD
  fechaLabel: string // dd/M
  pesoKg: number
  pesoBaldeKg: number
  pesoDESMovKg: number
}

function round2(n: number) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100
}

function fechaChileISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fechaLabelDDM(fechaISO: string) {
  const [y, m, d] = String(fechaISO).split('-').map(Number)
  if (!y || !m || !d) return fechaISO
  return `${d}/${m}`
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

function udsToKg(unidades: number) {
  const g = Number(GRAMOS_POR_UNIDAD || 60)
  return (Number(unidades || 0) * g) / 1000
}

function getTitulo(periodo: PeriodoDashboard, days: number) {
  if (periodo === 'hoy') return '🗑️ Desecho (kg) — Hoy'
  if (periodo === 'mes') return '🗑️ Desecho (kg) — Mes actual'
  return `🗑️ Desecho (kg) — Últimos ${days} días`
}

export default function MermaChart({
  days = 30,
  periodo = '30d',
}: {
  days?: number
  periodo?: PeriodoDashboard
}) {
  const safeDays = Math.max(1, Math.min(62, Number(days || 30)))

  const { pesosBalde, loading: loadingPesos } = usePesosBalde(safeDays)

  const movLimit = useMemo(() => {
    if (safeDays <= 1) return 1500
    if (safeDays <= 7) return 4000
    return 12000
  }, [safeDays])

  const { movimientos, loading: loadingMov } = useMovimientos({ limitCount: movLimit, soloValidados: true })
  const loading = loadingPesos || loadingMov

  const chartData: ChartPoint[] = useMemo(() => {
    const fechas = buildLastNDays(safeDays)

    // peso balde por día
    const mapPB = new Map<string, number>()
    ;(pesosBalde || []).forEach((pb: any) => {
      const f = String(pb.fecha || '')
      if (!f) return
      mapPB.set(f, (mapPB.get(f) || 0) + Number(pb.peso || 0))
    })

    // DES por movimientos (uds -> kg)
    const mapDes = new Map<string, number>()
    ;(movimientos || [])
      .filter((m: any) => m.valeEstado === 'validado' && m.skuCodigo === 'DES')
      .forEach((m: any) => {
        const f = String(m.fecha || '')
        if (!f) return
        const deltaUds = Number(m.cantidad || 0)
        if (deltaUds <= 0) return
        mapDes.set(f, (mapDes.get(f) || 0) + udsToKg(deltaUds))
      })

    return fechas.map((fecha) => {
      const pesoBaldeKg = round2(mapPB.get(fecha) || 0)
      const pesoDESMovKg = round2(mapDes.get(fecha) || 0)
      const total = round2(pesoBaldeKg + pesoDESMovKg)

      return {
        fecha,
        fechaLabel: fechaLabelDDM(fecha),
        pesoKg: total,
        pesoBaldeKg,
        pesoDESMovKg,
      }
    })
  }, [pesosBalde, movimientos, safeDays])

  const promedioKg = useMemo(() => {
    const valid = chartData.filter((p) => (p.pesoKg || 0) > 0)
    if (!valid.length) return 0
    return round2(valid.reduce((acc, p) => acc + p.pesoKg, 0) / valid.length)
  }, [chartData])

  const hoy = fechaChileISO()
  const hoyKg = chartData.find((p) => p.fecha === hoy)?.pesoKg || 0

  const titulo = getTitulo(periodo, safeDays)

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold mb-2">{titulo}</h3>
        <div className="text-gray-500">Cargando merma...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">{titulo}</h3>
          <div className="text-xs text-gray-500">
            Total diario = Peso balde (pesoTotal/pabellón) + DES por movimientos (convertido con {GRAMOS_POR_UNIDAD}g/ud).
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500">Hoy</div>
          <div className="text-2xl font-bold text-gray-900">
            {round2(hoyKg).toLocaleString('es-CL', { maximumFractionDigits: 2 })} kg
          </div>
        </div>
      </div>

      <div className="mt-3">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fechaLabel" />
            <YAxis />
            <Tooltip
              formatter={(value: any, name: any) => {
                const v = round2(Number(value))
                if (name === 'pesoKg') return [`${v.toFixed(2)} kg`, 'Desecho total']
                if (name === 'pesoBaldeKg') return [`${v.toFixed(2)} kg`, 'Peso balde']
                if (name === 'pesoDESMovKg') return [`${v.toFixed(2)} kg`, 'DES por movimientos']
                return [`${v}`, name]
              }}
            />
            <Legend />
            <ReferenceLine y={promedioKg} stroke="#ef4444" strokeDasharray="6 4" label="Promedio" />
            <Line type="monotone" dataKey="pesoKg" name="Desecho total (kg)" stroke="#111827" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="pesoBaldeKg" name="Peso balde (kg)" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="pesoDESMovKg" name="DES por movimientos (kg)" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
