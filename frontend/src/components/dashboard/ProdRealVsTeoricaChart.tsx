// src/components/dashboard/ProdRealVsTeoricaChart.tsx

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useContadores } from '../../hooks/useContadores'
import { useVales } from '../../hooks/useVales'
import { usePabellones } from '../../hooks/usePabellones'
import { formatNumber, formatPercent } from '../../utils/formatHelpers'

type Row = {
  pabellonId: string
  pabellonNombre: string
  teorica: number
  real: number
  variacionPct: number
}

// Chile-safe hoy
const hoyChileISO = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function ProdRealVsTeoricaChart() {
  const hoy = hoyChileISO()

  const { pabellones, loading: loadingPab } = usePabellones(true)
  const { contadores, loading: loadingCont } = useContadores(hoy)
  const { vales, loading: loadingVales } = useVales({ tipo: 'ingreso', estado: 'validado' })

  const chartData: Row[] = useMemo(() => {
    const pabs = (pabellones || []).filter((p: any) => p.activo !== false)

    // base: todos los pabellones (aunque no tengan contadores)
    const map = new Map<string, Row>()
    pabs.forEach((p: any) => {
      map.set(p.id, {
        pabellonId: p.id,
        pabellonNombre: p.nombre || p.id,
        teorica: 0,
        real: 0,
        variacionPct: 0,
      })
    })

    // teórica: contadores del día (si existen)
    if (contadores?.contadores?.length) {
      contadores.contadores.forEach((c: any) => {
        const pabId = c.pabellonId
        if (!pabId) return
        const row = map.get(pabId)
        if (!row) {
          // por si existe contador de un pabellón no cargado (edge)
          map.set(pabId, {
            pabellonId: pabId,
            pabellonNombre: c.pabellonNombre || pabId,
            teorica: c.valor || 0,
            real: 0,
            variacionPct: 0,
          })
          return
        }
        row.teorica += c.valor || 0
      })
    }

    // real: vales de ingreso validados del día (por fecha)
    const valesHoy = (vales || []).filter((v: any) => v.fecha === hoy)
    valesHoy.forEach((v: any) => {
      const pabId = v.origenId || v.pabellonId || ''
      if (!pabId) return
      const row = map.get(pabId)
      if (!row) return

      const totalVale = (v.detalles || []).reduce((acc: number, d: any) => acc + (d.totalUnidades || 0), 0)
      row.real += totalVale
    })

    // variación
    const rows = Array.from(map.values()).map((r) => {
      const variacionPct = r.teorica > 0 ? r.real / r.teorica - 1 : 0
      return { ...r, variacionPct }
    })

    // orden: mayor real primero
    rows.sort((a, b) => b.real - a.real)
    return rows
  }, [pabellones, contadores, vales, hoy])

  const loading = loadingPab || loadingCont || loadingVales

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold mb-2">📊 Prod. REAL vs TEÓRICA (Hoy)</h3>
        <div className="text-gray-500">Cargando producción...</div>
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold mb-2">📊 Prod. REAL vs TEÓRICA (Hoy)</h3>
        <div className="text-gray-500">Sin datos.</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-2">📊 Prod. REAL vs TEÓRICA (Hoy)</h3>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="pabellonNombre" interval={0} angle={-25} textAnchor="end" height={60} />
          <YAxis />
          <Tooltip
            formatter={(value: any, name: any, props: any) => {
              if (name === 'variacionPct') return [formatPercent(Number(value), 1), 'Variación']
              if (name === 'teorica') return [`${formatNumber(Number(value))} uds`, 'Teórica']
              if (name === 'real') return [`${formatNumber(Number(value))} uds`, 'Real']
              return [value, name]
            }}
          />
          <Legend />
          <Bar dataKey="teorica" name="Teórica" fill="#94a3b8" />
          <Bar dataKey="real" name="Real" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
