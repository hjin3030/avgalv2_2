import { useState, useMemo, useEffect } from 'react'
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSkus } from '@/hooks/useSkus'
import { formatearFechaHora } from '@/utils/formatHelpers'
import BodegaDetalleValeModal from '@/components/bodega/BodegaDetalleValeModal'
import { getSkuInfo } from '@/utils/constants'
import { calcularDesglose as calcDesglose, formatearDesglose } from '@/utils/stockHelpers'

interface CartolaModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Movimiento {
  id: string
  cantidad: number
  createdAt: any
  timestamp?: any
  destinoNombre: string
  fecha: string
  hora: string
  origenNombre: string
  skuCodigo: string
  skuNombre: string
  tipo: 'ingreso' | 'egreso' | 'reingreso' | 'ajuste'
  usuarioNombre: string
  valeEstado: string
  valeId: string
  valeReferencia: string
}

export default function CartolaModal({ isOpen, onClose }: CartolaModalProps) {
  const { skus } = useSkus()

  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [cargando, setCargando] = useState(false)

  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [skuFiltro, setSkuFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')

  const [ordenColumna, setOrdenColumna] = useState<string>('fecha')
  const [ordenAsc, setOrdenAsc] = useState(false)

  const [paginaActual, setPaginaActual] = useState(1)
  const [itemsPorPagina, setItemsPorPagina] = useState(25)

  // ✅ Ver Vale (unificado con el resto del sistema)
  const [valeDetalle, setValeDetalle] = useState<any | null>(null)
  const [showValeDetalle, setShowValeDetalle] = useState(false)
  const [cargandoVale, setCargandoVale] = useState(false)

  useEffect(() => {
    if (isOpen && movimientos.length === 0) cargarMovimientos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const cargarMovimientos = async () => {
    setCargando(true)
    try {
      const q = query(collection(db, 'movimientos'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const datos = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Movimiento[]
      setMovimientos(datos)
    } catch (error) {
      alert('Error al cargar los movimientos')
    } finally {
      setCargando(false)
    }
  }

  const handleVerVale = async (valeId?: string) => {
    if (!valeId) return
    setCargandoVale(true)
    try {
      const ref = doc(db, 'vales', valeId)
      const snap = await getDoc(ref)
      if (!snap.exists()) throw new Error('Vale no encontrado')
      setValeDetalle({ id: snap.id, ...(snap.data() as any) })
      setShowValeDetalle(true)
    } catch (e: any) {
      alert(e?.message || 'Error consultando el vale')
    } finally {
      setCargandoVale(false)
    }
  }

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((mov) => {
      if (fechaDesde && mov.fecha < fechaDesde) return false
      if (fechaHasta && mov.fecha > fechaHasta) return false
      if (skuFiltro && mov.skuCodigo !== skuFiltro) return false
      if (tipoFiltro !== 'todos' && mov.tipo !== tipoFiltro) return false

      // Mantener la regla que ya tenías:
      if (mov.tipo === 'ingreso' && mov.valeEstado !== 'validado') return false

      if (busqueda) {
        const searchLower = busqueda.toLowerCase()
        const coincide =
          String(mov.skuCodigo || '').toLowerCase().includes(searchLower) ||
          String(mov.skuNombre || '').toLowerCase().includes(searchLower) ||
          String(mov.origenNombre || '').toLowerCase().includes(searchLower) ||
          String(mov.destinoNombre || '').toLowerCase().includes(searchLower) ||
          String(mov.usuarioNombre || '').toLowerCase().includes(searchLower) ||
          String(mov.valeReferencia || '').toLowerCase().includes(searchLower)

        if (!coincide) return false
      }
      return true
    })
  }, [movimientos, fechaDesde, fechaHasta, skuFiltro, tipoFiltro, busqueda])

  const movimientosOrdenados = useMemo(() => {
    const sorted = [...movimientosFiltrados].sort((a, b) => {
      let valorA: any
      let valorB: any

      switch (ordenColumna) {
        case 'fecha': {
          valorA = a.createdAt || a.timestamp || (a.fecha + a.hora)
          valorB = b.createdAt || b.timestamp || (b.fecha + b.hora)
          if (valorA?.toDate) valorA = valorA.toDate().getTime()
          if (valorB?.toDate) valorB = valorB.toDate().getTime()
          break
        }
        case 'tipo':
          valorA = a.tipo
          valorB = b.tipo
          break
        case 'sku':
          valorA = a.skuCodigo
          valorB = b.skuCodigo
          break
        case 'cantidad':
          valorA = a.cantidad
          valorB = b.cantidad
          break
        case 'origen':
          valorA = a.origenNombre
          valorB = b.origenNombre
          break
        case 'destino':
          valorA = a.destinoNombre
          valorB = b.destinoNombre
          break
        default:
          valorA = a.fecha
          valorB = b.fecha
      }

      if (valorA < valorB) return ordenAsc ? -1 : 1
      if (valorA > valorB) return ordenAsc ? 1 : -1
      return 0
    })
    return sorted
  }, [movimientosFiltrados, ordenColumna, ordenAsc])

  const totalPaginas = Math.ceil(movimientosOrdenados.length / itemsPorPagina)

  const movimientosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina
    const fin = inicio + itemsPorPagina
    return movimientosOrdenados.slice(inicio, fin)
  }, [movimientosOrdenados, paginaActual, itemsPorPagina])

  const estadisticas = useMemo(() => {
    let totalIngresos = 0
    let totalEgresos = 0
    let totalReingresos = 0
    let totalAjustes = 0

    movimientosFiltrados.forEach((mov) => {
      if (mov.tipo === 'ingreso') totalIngresos += Number(mov.cantidad || 0)
      else if (mov.tipo === 'egreso') totalEgresos += Math.abs(Number(mov.cantidad || 0))
      else if (mov.tipo === 'reingreso') totalReingresos += Number(mov.cantidad || 0)
      else if (mov.tipo === 'ajuste') totalAjustes += Math.abs(Number(mov.cantidad || 0))
    })

    return {
      totalIngresos,
      totalEgresos,
      totalReingresos,
      totalAjustes,
      balanceNeto: totalIngresos + totalReingresos - totalEgresos,
    }
  }, [movimientosFiltrados])

  const handleOrdenar = (columna: string) => {
    if (ordenColumna === columna) setOrdenAsc(!ordenAsc)
    else {
      setOrdenColumna(columna)
      setOrdenAsc(true)
    }
  }

  const limpiarFiltros = () => {
    setFechaDesde('')
    setFechaHasta('')
    setSkuFiltro('')
    setTipoFiltro('todos')
    setBusqueda('')
    setPaginaActual(1)
  }

  const exportarCSV = () => {
    const headers = ['Fecha y Hora', 'Tipo', 'SKU', 'Producto', 'Cantidad', 'Origen', 'Destino', 'Vale', 'Usuario']

    const filas = movimientosOrdenados.map((mov) => [
      formatearFechaHora(mov.createdAt || mov.timestamp),
      mov.tipo.toUpperCase(),
      mov.skuCodigo,
      mov.skuNombre,
      mov.cantidad,
      mov.origenNombre,
      mov.destinoNombre,
      mov.valeReferencia,
      mov.usuarioNombre,
    ])

    const csvContent = [headers.join(','), ...filas.map((fila) => fila.map((c) => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `movimientos_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getTipoBadge = (tipo: string) => {
    const colores: Record<string, string> = {
      ingreso: 'bg-green-100 text-green-800',
      egreso: 'bg-red-100 text-red-800',
      reingreso: 'bg-purple-100 text-purple-800',
      ajuste: 'bg-yellow-100 text-yellow-800',
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colores[tipo] || 'bg-gray-100 text-gray-800'}`}>
        {tipo?.toUpperCase()}
      </span>
    )
  }

  // ✅ Desglose correcto por SKU (si existe en catálogo), si no, fallback 180/30
  const calcularDesglose = (skuCodigo: string, cantidad: number) => {
    const info = getSkuInfo(skuCodigo)
    const unidadesPorCaja = info?.unidadesPorCaja ?? 180
    const unidadesPorBandeja = info?.unidadesPorBandeja ?? 30
    const d = calcDesglose(Math.abs(Number(cantidad ?? 0)), unidadesPorCaja, unidadesPorBandeja)
    return formatearDesglose(d)
  }

  const getCantidadColor = (tipo: Movimiento['tipo']) => {
    if (tipo === 'egreso') return 'text-red-600'
    if (tipo === 'reingreso') return 'text-purple-700'
    if (tipo === 'ajuste') return 'text-yellow-700'
    return 'text-green-600'
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col">
          <div className="p-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white flex justify-between items-center rounded-t-2xl">
            <div>
              <h2 className="text-2xl font-bold">📊 Historial de Movimientos</h2>
              <p className="text-purple-100 text-sm mt-1">{movimientosFiltrados.length} movimientos encontrados</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-purple-200 text-3xl font-bold">
              &times;
            </button>
          </div>

          <div className="p-4 bg-purple-50 border-b grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">INGRESOS</div>
              <div className="text-2xl font-bold text-green-700">+{estadisticas.totalIngresos.toLocaleString('es-CL')} U</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">EGRESOS</div>
              <div className="text-2xl font-bold text-red-700">-{estadisticas.totalEgresos.toLocaleString('es-CL')} U</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">REINGRESOS</div>
              <div className="text-2xl font-bold text-purple-700">
                +{estadisticas.totalReingresos.toLocaleString('es-CL')} U
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">AJUSTES</div>
              <div className="text-2xl font-bold text-yellow-700">{estadisticas.totalAjustes.toLocaleString('es-CL')} U</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">BALANCE NETO</div>
              <div className={`text-2xl font-bold ${estadisticas.balanceNeto >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {estadisticas.balanceNeto >= 0 ? '+' : ''}
                {estadisticas.balanceNeto.toLocaleString('es-CL')} U
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-b">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
                <select
                  value={skuFiltro}
                  onChange={(e) => setSkuFiltro(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Todos los SKUs</option>
                  {skus
                    .filter((s) => s.activo)
                    .map((sku) => (
                      <option key={sku.id} value={sku.codigo}>
                        {sku.codigo} - {sku.nombre}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={tipoFiltro}
                  onChange={(e) => {
                    setTipoFiltro(e.target.value)
                    setPaginaActual(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                  <option value="reingreso">Reingreso</option>
                  <option value="ajuste">Ajuste</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Búsqueda</label>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value)
                    setPaginaActual(1)
                  }}
                  placeholder="Buscar SKU, origen, destino, usuario..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={limpiarFiltros}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-semibold"
              >
                🗑️ Limpiar Filtros
              </button>
              <button
                onClick={exportarCSV}
                disabled={movimientosOrdenados.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold disabled:opacity-50"
              >
                📥 Exportar CSV ({movimientosOrdenados.length})
              </button>
              <button
                onClick={cargarMovimientos}
                disabled={cargando}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold disabled:opacity-50"
              >
                🔄 Actualizar
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {cargando ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">⏳</div>
                  <p className="text-lg font-semibold text-gray-700">Cargando movimientos...</p>
                </div>
              </div>
            ) : movimientosPaginados.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-lg font-semibold text-gray-700">No se encontraron movimientos</p>
                  <p className="text-sm text-gray-500 mt-2">Prueba ajustando los filtros</p>
                </div>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th
                      onClick={() => handleOrdenar('fecha')}
                      className="border p-3 text-left cursor-pointer hover:bg-gray-200 font-bold text-sm"
                    >
                      FECHA Y HORA {ordenColumna === 'fecha' && (ordenAsc ? '▲' : '▼')}
                    </th>
                    <th className="border p-3 text-center font-bold text-sm">VALE</th>
                    <th
                      onClick={() => handleOrdenar('tipo')}
                      className="border p-3 text-center cursor-pointer hover:bg-gray-200 font-bold text-sm"
                    >
                      TIPO {ordenColumna === 'tipo' && (ordenAsc ? '▲' : '▼')}
                    </th>
                    <th
                      onClick={() => handleOrdenar('sku')}
                      className="border p-3 text-left cursor-pointer hover:bg-gray-200 font-bold text-sm"
                    >
                      SKU {ordenColumna === 'sku' && (ordenAsc ? '▲' : '▼')}
                    </th>
                    <th
                      onClick={() => handleOrdenar('cantidad')}
                      className="border p-3 text-right cursor-pointer hover:bg-gray-200 font-bold text-sm"
                    >
                      CANTIDAD {ordenColumna === 'cantidad' && (ordenAsc ? '▲' : '▼')}
                    </th>
                    <th
                      onClick={() => handleOrdenar('origen')}
                      className="border p-3 text-left cursor-pointer hover:bg-gray-200 font-bold text-sm"
                    >
                      ORIGEN {ordenColumna === 'origen' && (ordenAsc ? '▲' : '▼')}
                    </th>
                    <th
                      onClick={() => handleOrdenar('destino')}
                      className="border p-3 text-left cursor-pointer hover:bg-gray-200 font-bold text-sm"
                    >
                      DESTINO {ordenColumna === 'destino' && (ordenAsc ? '▲' : '▼')}
                    </th>
                    <th className="border p-3 text-left font-bold text-sm">USUARIO</th>
                    <th className="border p-3 text-center font-bold text-sm">VER VALE</th>
                  </tr>
                </thead>

                <tbody>
                  {movimientosPaginados.map((mov) => (
                    <tr key={mov.id} className="hover:bg-blue-50">
                      <td className="border p-3">
                        <div className="font-semibold text-sm">{formatearFechaHora(mov.createdAt || mov.timestamp)}</div>
                      </td>
                      <td className="border p-3 text-center">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{mov.valeReferencia}</span>
                      </td>
                      <td className="border p-3 text-center">{getTipoBadge(mov.tipo)}</td>
                      <td className="border p-3">
                        <div className="font-mono font-bold text-blue-600">{mov.skuCodigo}</div>
                        <div className="text-xs text-gray-600">{mov.skuNombre}</div>
                      </td>
                      <td className="border p-3 text-right">
                        <div className={`font-bold text-lg ${getCantidadColor(mov.tipo)}`}>
                          {mov.cantidad >= 0 ? '+' : ''}
                          {mov.cantidad.toLocaleString('es-CL')} U
                        </div>
                        <div className="text-xs text-gray-600">{calcularDesglose(mov.skuCodigo, mov.cantidad)}</div>
                      </td>
                      <td className="border p-3 text-sm">{mov.origenNombre}</td>
                      <td className="border p-3 text-sm">{mov.destinoNombre}</td>
                      <td className="border p-3 text-sm">{mov.usuarioNombre}</td>
                      <td className="border p-3 text-center">
                        <button
                          onClick={() => handleVerVale(mov.valeId)}
                          disabled={!mov.valeId || cargandoVale}
                          className={`px-3 py-1 font-semibold rounded text-xs ${
                            mov.valeId ? 'bg-blue-100 text-blue-900 hover:bg-blue-200' : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          Ver Vale
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
                disabled={paginaActual === 1}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 font-semibold text-sm"
              >
                ← Anterior
              </button>
              <span className="text-sm text-gray-700 font-medium">
                Página {paginaActual} de {totalPaginas || 1}
              </span>
              <button
                onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
                disabled={paginaActual === totalPaginas || totalPaginas === 0}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 font-semibold text-sm"
              >
                Siguiente →
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 font-medium">Items por página:</label>
              <select
                value={itemsPorPagina}
                onChange={(e) => {
                  setItemsPorPagina(Number(e.target.value))
                  setPaginaActual(1)
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {showValeDetalle && valeDetalle && (
        <BodegaDetalleValeModal
          isOpen={showValeDetalle}
          onClose={() => {
            setShowValeDetalle(false)
            setValeDetalle(null)
          }}
          valeData={valeDetalle}
        />
      )}
    </>
  )
}
