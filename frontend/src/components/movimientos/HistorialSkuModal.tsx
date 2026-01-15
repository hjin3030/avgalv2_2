// frontend/src/components/movimientos/HistorialSkuModal.tsx

import { useEffect, useMemo, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Movimiento } from '@/types'
import { formatearFechaHora } from '@/utils/formatHelpers'

interface HistorialSkuModalProps {
  isOpen: boolean
  onClose: () => void
  skuCodigo: string
}

function toMillisSafe(ts: any): number {
  if (!ts) return 0
  if (typeof ts?.toMillis === 'function') return ts.toMillis()
  if (typeof ts?.toDate === 'function') return ts.toDate().getTime()
  const d = new Date(ts)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

function normalizarCodigoSkuEspacios(codigo: string): string {
  return String(codigo || '').replace(/-/g, ' ')
}

function normalizarCodigoSkuGuiones(codigo: string): string {
  return String(codigo || '').trim().replace(/\s+/g, '-')
}

export default function HistorialSkuModal({ isOpen, onClose, skuCodigo }: HistorialSkuModalProps) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

  useEffect(() => {
    if (!isOpen || !skuCodigo) return

    const cargarHistorial = async () => {
      setLoading(true)
      setError(null)

      try {
        const codigoConEspacios = normalizarCodigoSkuEspacios(skuCodigo)
        const codigoConGuiones = normalizarCodigoSkuGuiones(skuCodigo)
        const codigos = Array.from(new Set([codigoConEspacios, codigoConGuiones].filter(Boolean)))

        // Firestore: where-in soporta hasta 10 valores (aquí usamos 2)
        const q = query(collection(db, 'movimientos'), where('skuCodigo', 'in', codigos))
        const snapshot = await getDocs(q)

        const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Movimiento[]

        // Ordenar localmente por createdAt || timestamp (desc)
        data.sort((a: any, b: any) => {
          const ta = toMillisSafe(a.createdAt || a.timestamp)
          const tb = toMillisSafe(b.createdAt || b.timestamp)
          return tb - ta
        })

        setMovimientos(data)
      } catch (e: any) {
        console.error('Error al cargar historial:', e)
        setError(e?.message || 'No se pudo cargar el historial')
        setMovimientos([])
      } finally {
        setLoading(false)
      }
    }

    cargarHistorial()
  }, [isOpen, skuCodigo])

  const movimientosFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') return movimientos
    return movimientos.filter((m: any) => m.tipo === filtroTipo)
  }, [movimientos, filtroTipo])

  const totalesPorTipo = useMemo(() => {
    const totales = { ingreso: 0, egreso: 0, reingreso: 0, ajuste: 0 }

    movimientos.forEach((m: any) => {
      const qty = Math.abs(Number(m.cantidad ?? 0))
      if (m.tipo === 'ingreso') totales.ingreso += qty
      else if (m.tipo === 'egreso') totales.egreso += qty
      else if (m.tipo === 'reingreso') totales.reingreso += qty
      else if (m.tipo === 'ajuste') totales.ajuste += qty
    })

    return totales
  }, [movimientos])

  const getTipoBadge = (tipo: string) => {
    const estilos: Record<string, string> = {
      ingreso: 'bg-green-100 text-green-800 border-green-300',
      egreso: 'bg-red-100 text-red-800 border-red-300',
      reingreso: 'bg-purple-100 text-purple-800 border-purple-300',
      ajuste: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    }

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold border ${
          estilos[tipo] || 'bg-gray-100 text-gray-800 border-gray-300'
        }`}
      >
        {String(tipo || '').toUpperCase()}
      </span>
    )
  }

  const formatCantidad = (cantidad: number) => {
    const n = Number(cantidad ?? 0)
    const signo = n >= 0 ? '+' : ''
    const color = n < 0 ? 'text-red-600' : 'text-green-600'
    return (
      <span className={`font-bold ${color}`}>
        {signo}
        {n.toLocaleString('es-CL')} U
      </span>
    )
  }

  const renderFechaHora = (mov: any) => {
    const ts = mov.createdAt || mov.timestamp
    if (ts) return formatearFechaHora(ts) // DD/MM/YYYY HH:mm (helper existente)

    // fallback extremo (docs viejos)
    if (mov.fecha && mov.hora) return `${mov.fecha} ${mov.hora}`
    if (mov.fecha) return String(mov.fecha)
    return '-'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="px-6 py-5 bg-gradient-to-r from-purple-600 to-purple-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">📜 Historial de Movimientos</h2>
            <p className="text-purple-100 text-sm mt-1">SKU: {skuCodigo}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-purple-200 transition-colors" aria-label="Cerrar">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
              <p className="text-sm text-green-700 mb-1">Total Ingresos</p>
              <p className="text-2xl font-bold text-green-900">+{totalesPorTipo.ingreso.toLocaleString('es-CL')} U</p>
            </div>
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
              <p className="text-sm text-red-700 mb-1">Total Egresos</p>
              <p className="text-2xl font-bold text-red-900">-{totalesPorTipo.egreso.toLocaleString('es-CL')} U</p>
            </div>
            <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4">
              <p className="text-sm text-purple-700 mb-1">Total Reingresos</p>
              <p className="text-2xl font-bold text-purple-900">+{totalesPorTipo.reingreso.toLocaleString('es-CL')} U</p>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
              <p className="text-sm text-yellow-700 mb-1">Total Ajustes</p>
              <p className="text-2xl font-bold text-yellow-900">{totalesPorTipo.ajuste.toLocaleString('es-CL')} U</p>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-gray-700">Filtrar por tipo:</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="todos">Todos ({movimientos.length})</option>
              <option value="ingreso">Ingresos ({movimientos.filter((m: any) => m.tipo === 'ingreso').length})</option>
              <option value="egreso">Egresos ({movimientos.filter((m: any) => m.tipo === 'egreso').length})</option>
              <option value="reingreso">
                Reingresos ({movimientos.filter((m: any) => m.tipo === 'reingreso').length})
              </option>
              <option value="ajuste">Ajustes ({movimientos.filter((m: any) => m.tipo === 'ajuste').length})</option>
            </select>

            <span className="text-sm text-gray-600 ml-auto">
              Mostrando: {movimientosFiltrados.length} movimiento{movimientosFiltrados.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* TABLA */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando historial...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 font-bold">Error al cargar historial</p>
              <p className="text-gray-600 mt-2 text-sm">{error}</p>
            </div>
          ) : movimientosFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filtroTipo === 'todos'
                  ? 'No hay movimientos registrados para este SKU'
                  : `No hay movimientos de tipo "${filtroTipo}"`}
              </p>
            </div>
          ) : (
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">FECHA/HORA</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">TIPO</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">VALE</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">CANTIDAD</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">ORIGEN</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">DESTINO</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">USUARIO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {movimientosFiltrados.map((mov: any) => (
                    <tr key={mov.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-semibold">{renderFechaHora(mov)}</td>
                      <td className="px-4 py-3 text-center">{getTipoBadge(mov.tipo)}</td>
                      <td className="px-4 py-3 text-center text-gray-900 font-semibold">{mov.valeReferencia || '-'}</td>
                      <td className="px-4 py-3 text-right">{formatCantidad(mov.cantidad)}</td>
                      <td className="px-4 py-3 text-gray-900">{mov.origenNombre || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{mov.destinoNombre || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{mov.usuarioNombre || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Total de movimientos: <span className="font-bold text-gray-900">{movimientos.length}</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
