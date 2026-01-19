// src/components/dashboard/KPIcards.tsx

import { useMemo } from 'react'
import type { Vale } from '../../hooks/useVales'
import type { Stock } from '../../hooks/useStock'
import { isSkuAnalitico } from '../../utils/constants'

interface KPICardsProps {
  vales: Vale[]
  stock: Stock[]
  contadoresPorPabellon?: Record<string, number>
}

// Fecha Chile YYYY-MM-DD (sin UTC)
function fechaChileISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function KPICards({ vales, stock, contadoresPorPabellon = {} }: KPICardsProps) {
  const hoy = fechaChileISO()
  const ayer = fechaChileISO(new Date(Date.now() - 86400000))

  // ========================================
  // KPI 1: VALES POR TIPO (HOY VS AYER)
  // ========================================
  const valesKPI = useMemo(() => {
    const valesHoy = vales.filter((v) => v.fecha === hoy)
    const valesAyer = vales.filter((v) => v.fecha === ayer)

    const hoyIngreso = valesHoy.filter((v) => v.tipo === 'ingreso').length
    const hoyEgreso = valesHoy.filter((v) => v.tipo === 'egreso').length
    const hoyReingreso = valesHoy.filter((v) => v.tipo === 'reingreso').length
    const hoyTotal = valesHoy.length

    const ayerIngreso = valesAyer.filter((v) => v.tipo === 'ingreso').length
    const ayerEgreso = valesAyer.filter((v) => v.tipo === 'egreso').length
    const ayerReingreso = valesAyer.filter((v) => v.tipo === 'reingreso').length
    const ayerTotal = valesAyer.length

    const calcVariacion = (hoyN: number, ayerN: number) => {
      if (ayerN === 0) return hoyN > 0 ? 100 : 0
      return ((hoyN - ayerN) / ayerN) * 100
    }

    return {
      hoy: { ingreso: hoyIngreso, egreso: hoyEgreso, reingreso: hoyReingreso, total: hoyTotal },
      ayer: { ingreso: ayerIngreso, egreso: ayerEgreso, reingreso: ayerReingreso, total: ayerTotal },
      variacion: {
        ingreso: calcVariacion(hoyIngreso, ayerIngreso),
        egreso: calcVariacion(hoyEgreso, ayerEgreso),
        reingreso: calcVariacion(hoyReingreso, ayerReingreso),
        total: calcVariacion(hoyTotal, ayerTotal),
      },
    }
  }, [vales, hoy, ayer])

  // ========================================
  // KPI 2: STOCK - MAYOR Y MENOR SKU (FILTRADO)
  // ========================================
  const stockKPI = useMemo(() => {
    const stockAnalitico = stock.filter((s) => isSkuAnalitico(s.skuCodigo))
    const stockConCantidad = stockAnalitico.filter((s) => (s.cantidad || 0) > 0)

    if (stockConCantidad.length === 0) return null

    const mayor = stockConCantidad.reduce((max, s) => ((s.cantidad || 0) > (max.cantidad || 0) ? s : max))
    const menor = stockConCantidad.reduce((min, s) => ((s.cantidad || 0) < (min.cantidad || 0) ? s : min))

    const calcDesglose = (cantidad: number) => {
      const cajas = Math.floor(cantidad / 180)
      const resto1 = cantidad % 180
      const bandejas = Math.floor(resto1 / 30)
      const unidades = resto1 % 30
      return { cajas, bandejas, unidades }
    }

    return {
      total: stockAnalitico.reduce((sum, s) => sum + (s.cantidad || 0), 0),
      totalSKUs: stockAnalitico.length,
      mayor: {
        sku: mayor.skuCodigo,
        nombre: mayor.skuNombre,
        cantidad: mayor.cantidad || 0,
        desglose: calcDesglose(mayor.cantidad || 0),
      },
      menor: {
        sku: menor.skuCodigo,
        nombre: menor.skuNombre,
        cantidad: menor.cantidad || 0,
        desglose: calcDesglose(menor.cantidad || 0),
      },
    }
  }, [stock])

  // ========================================
  // KPI 3: PRODUCCIÓN HOY (POR PABELLÓN)
  // ========================================
  const produccionKPI = useMemo(() => {
    const produccionHoy = Object.entries(contadoresPorPabellon).map(([pabellon, cantidad]) => ({
      pabellon,
      cantidad: Number(cantidad || 0),
    }))

    const totalHoy = produccionHoy.reduce((sum, p) => sum + p.cantidad, 0)

    // (si después quieres “ayer”, debe venir de contadoresProduccion/{ayer} y no está en este componente)
    const totalAyer = 0
    const variacion = totalAyer > 0 ? ((totalHoy - totalAyer) / totalAyer) * 100 : 0

    return { totalHoy, totalAyer, variacion, porPabellon: produccionHoy }
  }, [contadoresPorPabellon])

  // ========================================
  // KPI 4: EGRESO VS INGRESO+REINGRESO (VALIDADOS)
  // ========================================
  const balanceKPI = useMemo(() => {
    const valesHoy = vales.filter((v) => v.fecha === hoy && v.estado === 'validado')

    const totalEgreso = valesHoy
      .filter((v) => v.tipo === 'egreso')
      .reduce((sum, v) => sum + (Number(v.totalUnidades) || 0), 0)

    const totalIngresoReingreso = valesHoy
      .filter((v) => v.tipo === 'ingreso' || v.tipo === 'reingreso')
      .reduce((sum, v) => sum + (Number(v.totalUnidades) || 0), 0)

    const balance = totalIngresoReingreso - totalEgreso
    const balancePorcentaje = totalIngresoReingreso > 0 ? (balance / totalIngresoReingreso) * 100 : 0

    return { egreso: totalEgreso, ingresoReingreso: totalIngresoReingreso, balance, balancePorcentaje }
  }, [vales, hoy])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* KPI 1 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-600">Vales Hoy</h3>
          <span className="text-2xl">📋</span>
        </div>

        <p className="text-3xl font-bold text-gray-900 mb-3">{valesKPI.hoy.total}</p>

        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Ingreso:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-700">{valesKPI.hoy.ingreso}</span>
              <span className={`text-xs ${valesKPI.variacion.ingreso >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {valesKPI.variacion.ingreso >= 0 ? '▲' : '▼'} {Math.abs(valesKPI.variacion.ingreso).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Egreso:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-orange-700">{valesKPI.hoy.egreso}</span>
              <span className={`text-xs ${valesKPI.variacion.egreso >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {valesKPI.variacion.egreso >= 0 ? '▲' : '▼'} {Math.abs(valesKPI.variacion.egreso).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Reingreso:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-green-700">{valesKPI.hoy.reingreso}</span>
              <span className={`text-xs ${valesKPI.variacion.reingreso >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {valesKPI.variacion.reingreso >= 0 ? '▲' : '▼'} {Math.abs(valesKPI.variacion.reingreso).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200">
          <span className="text-xs text-gray-500">
            Ayer: {valesKPI.ayer.total} vales ({valesKPI.variacion.total >= 0 ? '+' : ''}
            {valesKPI.variacion.total.toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* KPI 2 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-600">Stock Total</h3>
          <span className="text-2xl">📦</span>
        </div>

        <p className="text-3xl font-bold text-gray-900 mb-3">{stockKPI?.total.toLocaleString('es-CL') || 0}</p>

        {stockKPI ? (
          <div className="space-y-2">
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <div className="text-xs text-gray-600 mb-1">Mayor Stock:</div>
              <div className="font-semibold text-sm text-green-800">{stockKPI.mayor.sku}</div>
              <div className="text-xs text-gray-600 mt-1">
                {stockKPI.mayor.desglose.cajas}C, {stockKPI.mayor.desglose.bandejas}B, {stockKPI.mayor.desglose.unidades}U
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded p-2">
              <div className="text-xs text-gray-600 mb-1">Menor Stock:</div>
              <div className="font-semibold text-sm text-orange-800">{stockKPI.menor.sku}</div>
              <div className="text-xs text-gray-600 mt-1">
                {stockKPI.menor.desglose.cajas}C, {stockKPI.menor.desglose.bandejas}B, {stockKPI.menor.desglose.unidades}U
              </div>
            </div>

            <div className="text-[11px] text-gray-500 pt-1">
              Excluye: DES, OTRO, BLA/COL MAN, BLA/COL SINCAL.
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm py-4">Sin datos de stock</div>
        )}
      </div>

      {/* KPI 3 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-600">Producción Hoy</h3>
          <span className="text-2xl">🥚</span>
        </div>

        <p className="text-3xl font-bold text-gray-900 mb-3">{produccionKPI.totalHoy.toLocaleString('es-CL')}</p>

        {produccionKPI.porPabellon.length > 0 ? (
          <div className="space-y-1.5 mb-3">
            {produccionKPI.porPabellon.map((p) => (
              <div key={p.pabellon} className="flex justify-between items-center text-xs">
                <span className="text-gray-600">{p.pabellon}:</span>
                <span className="font-semibold">{p.cantidad.toLocaleString('es-CL')}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm py-2">Sin contadores registrados hoy</div>
        )}

        <div className="pt-2 border-t border-gray-200">
          <span className={`text-xs ${produccionKPI.variacion >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {produccionKPI.totalAyer > 0
              ? `${produccionKPI.variacion >= 0 ? '▲' : '▼'} ${Math.abs(produccionKPI.variacion).toFixed(1)}% vs ayer`
              : 'Sin datos de ayer'}
          </span>
        </div>
      </div>

      {/* KPI 4 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-600">Balance Hoy</h3>
          <span className="text-2xl">⚖️</span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-600 mb-1">Entrada (Ing+Reing):</div>
            <div className="text-2xl font-bold text-green-600">{balanceKPI.ingresoReingreso.toLocaleString('es-CL')}</div>
          </div>

          <div>
            <div className="text-xs text-gray-600 mb-1">Salida (Egreso):</div>
            <div className="text-2xl font-bold text-orange-600">{balanceKPI.egreso.toLocaleString('es-CL')}</div>
          </div>

          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Balance:</span>
              <span className={`text-lg font-bold ${balanceKPI.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balanceKPI.balance >= 0 ? '+' : ''}
                {balanceKPI.balance.toLocaleString('es-CL')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
