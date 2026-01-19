import { useState, useMemo } from 'react'
import { useVales } from '@/hooks/useVales'
import { usePabellones } from '@/hooks/usePabellones'
import NuevoValeModal from '@/components/packing/NuevoValeModal'
import DetalleValeModal from '@/components/packing/PackingDetalleValeModal'
import { todayDateString, justDate, formatearFechaHora, formatDate } from '@/utils/formatHelpers'

export default function Packing() {
  const { vales } = useVales()
  const { pabellones } = usePabellones()

  const [mostrarModalNuevoVale, setMostrarModalNuevoVale] = useState(false)
  const [valeSeleccionado, setValeSeleccionado] = useState<any>(null)
  const [verDetalleVale, setVerDetalleVale] = useState(false)

  const [sortCol, setSortCol] = useState<string>('fecha')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const fechaActualCL = formatDate(todayDateString())

  const getNombrePabellonById = (id?: string) =>
    pabellones.find((p) => p.id === id)?.nombre || 'N/A'

  const getNombrePabellonFromVale = (vale: any) => {
    // En packing el pabellón real viene en pabellonNombre/pabellonId (no en origenId) [file:101]
    if (vale?.pabellonNombre) return vale.pabellonNombre
    if (vale?.pabellonId) return getNombrePabellonById(vale.pabellonId)
    return 'N/A'
  }

  const valesHoy = useMemo(() => {
    const hoy = todayDateString()
    return vales.filter((v: any) =>
      v.fecha &&
      justDate(v.fecha) === hoy &&
      v.tipo?.toLowerCase() === 'ingreso' &&
      v.origenId === 'packing' // producción real del módulo packing [file:101]
    )
  }, [vales])

  // -----------------------------
  // Producción real (Packing) por pabellón = suma de totalUnidades de vales hoy por pabellón [file:74]
  // -----------------------------
  const produccionReal = useMemo(() => {
    const porPab: Record<string, { pabellonNombre: string; totalUnidades: number; valesCount: number }> = {}

    valesHoy.forEach((v: any) => {
      const pabId = v.pabellonId || 'SIN_PAB'
      const pabNombre = getNombrePabellonFromVale(v)

      if (!porPab[pabId]) {
        porPab[pabId] = { pabellonNombre: pabNombre, totalUnidades: 0, valesCount: 0 }
      }

      porPab[pabId].totalUnidades += Number(v.totalUnidades || 0)
      porPab[pabId].valesCount += 1
    })

    const items = Object.entries(porPab)
      .map(([pabellonId, data]) => ({ pabellonId, ...data }))
      .sort((a, b) => a.pabellonNombre.localeCompare(b.pabellonNombre))

    const totalGeneral = items.reduce((sum, x) => sum + x.totalUnidades, 0)

    return { items, totalGeneral }
  }, [valesHoy, pabellones])

  const valesSorted = useMemo(() => {
    const sorted = [...valesHoy]
    sorted.sort((a: any, b: any) => {
      let vA: any, vB: any
      switch (sortCol) {
        case 'nro':
          vA = a.correlativoDia || 0
          vB = b.correlativoDia || 0
          break
        case 'tipo':
          vA = a.tipo || ''
          vB = b.tipo || ''
          break
        case 'fecha':
          vA = a.updatedAt || a.createdAt || a.timestamp || ''
          vB = b.updatedAt || b.createdAt || b.timestamp || ''
          break
        case 'pabellon':
          vA = getNombrePabellonFromVale(a)
          vB = getNombrePabellonFromVale(b)
          break
        case 'skus':
          vA = (a.detalles || []).map((d: any) => d.sku).join(', ')
          vB = (b.detalles || []).map((d: any) => d.sku).join(', ')
          break
        case 'total':
          vA = Number(a.totalUnidades || 0)
          vB = Number(b.totalUnidades || 0)
          break
        case 'estado':
          vA = a.estado || ''
          vB = b.estado || ''
          break
        case 'timestamp':
          vA = a.updatedAt || ''
          vB = b.updatedAt || ''
          break
        default:
          vA = a.updatedAt || a.createdAt || a.timestamp || ''
          vB = b.updatedAt || b.createdAt || b.timestamp || ''
      }

      if (typeof vA === 'string' && typeof vB === 'string') {
        return sortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA)
      }
      if (typeof vA === 'number' && typeof vB === 'number') {
        return sortDir === 'asc' ? vA - vB : vB - vA
      }
      return 0
    })
    return sorted
  }, [valesHoy, sortCol, sortDir, pabellones])

  const getEstadoBadge = (estado?: string) => {
    const colores: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      validado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800',
    }
    const key = (estado || '').toLowerCase()
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colores[key] || 'bg-gray-100 text-gray-800'}`}>
        {(estado || 'N/A').toUpperCase()}
      </span>
    )
  }

  const calcularDesglose = (detalles: any[]) => {
    const t = { cajas: 0, bandejas: 0, unidades: 0 }
    detalles?.forEach((d) => {
      t.cajas += d.cajas || 0
      t.bandejas += d.bandejas || 0
      t.unidades += d.unidades || 0
    })
    return t
  }

  const handleVerDetalleVale = (vale: any) => {
    setValeSeleccionado(vale)
    setVerDetalleVale(true)
  }

  const columnasTabla = [
    { id: 'nro', label: 'N° VALE' },
    { id: 'tipo', label: 'TIPO' },
    { id: 'fecha', label: 'FECHA Y HORA' },
    { id: 'pabellon', label: 'PABELLÓN' },
    { id: 'skus', label: 'SKUs' },
    { id: 'total', label: 'TOTAL' },
    { id: 'estado', label: 'ESTADO' },
    { id: 'timestamp', label: 'Timestamp actualización' },
    { id: 'accion', label: 'ACCIÓN' }
  ]

  const getCellValue = (vale: any, col: string) => {
    const desglose = calcularDesglose(vale.detalles)
    switch (col) {
      case 'nro':
        return (
          <div className="font-mono font-bold text-blue-600">
            {vale.tipo?.toUpperCase()} #{vale.correlativoDia || 'N/A'}
            <div className="text-xs text-gray-500">{vale.id?.slice(0, 8)}</div>
          </div>
        )
      case 'tipo':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">
            {vale.tipo || 'N/A'}
          </span>
        )
      case 'fecha':
        return (
          <div>
            <div className="font-semibold text-sm">
              {vale.estado === 'pendiente' ? (
                <>
                  <div className="text-gray-900">{formatearFechaHora(vale.createdAt || vale.timestamp)}</div>
                  <div className="text-xs text-gray-500">Creado</div>
                </>
              ) : (
                <>
                  <div className="text-gray-900">{formatearFechaHora(vale.updatedAt || vale.timestamp)}</div>
                  <div className="text-xs text-gray-500">Actualizado</div>
                </>
              )}
            </div>
            <div className="text-xs text-gray-400">{vale.usuarioCreadorNombre || 'N/A'}</div>
          </div>
        )
      case 'pabellon':
        return (
          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
            {getNombrePabellonFromVale(vale)}
          </span>
        )
      case 'skus':
        return (
          <div className="text-sm text-gray-700 font-medium max-w-xs overflow-x-auto whitespace-nowrap">
            {vale.detalles?.map((d: any) => d.sku).join(', ') || 'N/A'}
          </div>
        )
      case 'total':
        return (
          <div className="font-bold text-xl text-gray-900">
            {Number(vale.totalUnidades || 0).toLocaleString('es-CL')} U
            <div className="text-sm text-gray-600 font-semibold">
              {desglose.cajas}C · {desglose.bandejas}B · {desglose.unidades}U
            </div>
          </div>
        )
      case 'estado':
        return getEstadoBadge(vale.estado)
      case 'timestamp':
        return (vale.estado === 'pendiente' || !vale.updatedAt) ? '-' : formatearFechaHora(vale.updatedAt)
      case 'accion':
        return (
          <button
            onClick={() => handleVerDetalleVale(vale)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-md"
          >
            👁️ Ver
          </button>
        )
      default:
        return null
    }
  }

  const estadoProduccionReal = useMemo(() => {
    // “Pendiente” = no hay vales hoy desde packing [file:101]
    if (valesHoy.length === 0) {
      return { estado: 'pendiente', titulo: 'Producción real pendiente', subtitulo: '⚠️ No hay vales de packing hoy' }
    }
    return {
      estado: 'ok',
      titulo: 'Producción real del día',
      subtitulo: `✅ ${produccionReal.items.length} pabellón(es) con producción · ${produccionReal.totalGeneral.toLocaleString('es-CL')} U`
    }
  }, [valesHoy.length, produccionReal.items.length, produccionReal.totalGeneral])

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">📦 Packing</h1>
            <p className="text-gray-600 mt-2 capitalize text-lg">{fechaActualCL}</p>
          </div>
        </div>

        {/* Acciones superiores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => setMostrarModalNuevoVale(true)}
            className="group relative overflow-hidden bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-105 p-8"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="text-5xl mb-3">📝</div>
                <h3 className="text-2xl font-bold mb-2">Crear Nuevo Vale</h3>
                <p className="text-green-100 text-sm">Generar vale de ingreso a bodega</p>
              </div>
              <div className="text-6xl opacity-20 group-hover:opacity-30 transition-opacity">+</div>
            </div>
          </button>

          {/* Reemplazo del botón antiguo: estado producción real (packing) */}
          <div
            className={[
              'group relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 transform p-8',
              estadoProduccionReal.estado === 'pendiente'
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                : 'bg-gradient-to-r from-blue-600 to-green-600 text-white'
            ].join(' ')}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <span className="text-xl">📊</span>
                  </div>
                  <div className="text-5xl">🥚</div>
                </div>
                <h3 className="text-2xl font-bold mb-2">{estadoProduccionReal.titulo}</h3>
                <p className={estadoProduccionReal.estado === 'pendiente' ? 'text-orange-100 text-sm' : 'text-blue-100 text-sm'}>
                  {estadoProduccionReal.subtitulo}
                </p>

                {/* Detalle por pabellón (compacto) */}
                {produccionReal.items.length > 0 && (
                  <div className="mt-4 bg-white/15 rounded-lg p-3">
                    <div className="text-xs font-semibold mb-2">Detalle por pabellón</div>
                    <div className="space-y-1">
                      {produccionReal.items.map((x) => (
                        <div key={x.pabellonId} className="flex justify-between text-sm">
                          <span className="truncate pr-2">{x.pabellonNombre}</span>
                          <span className="font-semibold">
                            {x.totalUnidades.toLocaleString('es-CL')} U
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">📋 Historial de Vales del Día</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{fechaActualCL}</span>
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-bold">{valesHoy.length} vales</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                {columnasTabla.map(col => (
                  <th
                    key={col.id}
                    className="border border-gray-300 p-3 text-left font-bold text-gray-700 cursor-pointer select-none"
                    onClick={() => {
                      if (col.id !== 'accion') {
                        setSortCol(col.id)
                        setSortDir(sortCol === col.id && sortDir === 'desc' ? 'asc' : 'desc')
                      }
                    }}
                  >
                    {col.label}
                    {sortCol === col.id ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {valesSorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="border border-gray-200 p-8 text-center text-gray-500">
                    <div className="text-6xl mb-4">📦</div>
                    <p className="text-lg font-semibold">No hay vales registrados hoy</p>
                    <p className="text-sm text-gray-400 mt-2">Los vales creados aparecerán aquí</p>
                  </td>
                </tr>
              ) : (
                valesSorted.map((vale: any) => (
                  <tr key={vale.id} className="hover:bg-blue-50 transition-colors">
                    {columnasTabla.map(col => (
                      <td key={col.id} className="border border-gray-200 p-3 text-center">
                        {col.id === 'accion'
                          ? (
                            <button
                              onClick={() => handleVerDetalleVale(vale)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-md"
                            >
                              👁️ Ver
                            </button>
                          )
                          : getCellValue(vale, col.id)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modales */}
      {mostrarModalNuevoVale && (
        <NuevoValeModal
          isOpen={mostrarModalNuevoVale}
          onClose={() => setMostrarModalNuevoVale(false)}
          onValeCreated={() => {}}
        />
      )}

      {verDetalleVale && valeSeleccionado && (
        <DetalleValeModal
          isOpen={verDetalleVale}
          onClose={() => setVerDetalleVale(false)}
          valeData={valeSeleccionado}
        />
      )}
    </div>
  )
}
