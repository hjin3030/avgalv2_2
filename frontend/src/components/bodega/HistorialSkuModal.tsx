// frontend/src/components/bodega/HistorialSkuModal.tsx
import { useState, useEffect, useMemo } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Movimiento } from '@/types'

interface HistorialSkuModalProps {
  isOpen: boolean
  onClose: () => void
  skuCodigo: string
}

export default function HistorialSkuModal({ isOpen, onClose, skuCodigo }: HistorialSkuModalProps) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

  useEffect(() => {
    if (!isOpen || !skuCodigo) return

    const cargarHistorial = async () => {
      setLoading(true)
      try {
        const q = query(
          collection(db, 'movimientos'),
          where('skuCodigo', '==', skuCodigo),
          orderBy('createdAt', 'desc')
        )

        const snapshot = await getDocs(q)
        const movimientosData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Movimiento[]

        setMovimientos(movimientosData)
      } catch (error) {
        console.error('Error al cargar historial:', error)
      } finally {
        setLoading(false)
      }
    }

    cargarHistorial()
  }, [isOpen, skuCodigo])

  const movimientosFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') return movimientos
    return movimientos.filter((m) => m.tipo === filtroTipo)
  }, [movimientos, filtroTipo])

  const getTipoBadge = (tipo: string) => {
    const estilos = {
      ingreso: 'bg-green-100 text-green-800 border-green-300',
      egreso: 'bg-red-100 text-red-800 border-red-300',
      reingreso: 'bg-purple-100 text-purple-800 border-purple-300',
      ajuste: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    }
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold border ${estilos[tipo as keyof typeof estilos] || 'bg-gray-100 text-gray-800 border-gray-300'}`}
      >
        {tipo.toUpperCase()}
      </span>
    )
  }

  const formatCantidad = (cantidad: number, tipo: string) => {
    const signo = tipo === 'egreso' ? '-' : '+'
    const color = tipo === 'egreso' ? 'text-red-600' : 'text-green-600'
    return <span className={`font-bold ${color}`}>{signo}{Math.abs(cantidad).toLocaleString()} U</span>
  }

  const totalesPorTipo = useMemo(() => {
    const totales = {
      ingreso: 0,
      egreso: 0,
      reingreso: 0,
      ajuste: 0
    }

    movimientos.forEach((m) => {
      if (m.tipo in totales) {
        totales[m.tipo as keyof typeof totales] += Math.abs(m.cantidad)
      }
    })

    return totales
  }, [movimientos])

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
          <button onClick={onClose} className="text-white hover:text-purple-200 transition-colors">
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
              <p className="text-2xl font-bold text-green-900">+{totalesPorTipo.ingreso.toLocaleString()} U</p>
            </div>
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
              <p className="text-sm text-red-700 mb-1">Total Egresos</p>
              <p className="text-2xl font-bold text-red-900">-{totalesPorTipo.egreso.toLocaleString()} U</p>
            </div>
            <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4">
              <p className="text-sm text-purple-700 mb-1">Total Reingresos</p>
              <p className="text-2xl font-bold text-purple-900">+{totalesPorTipo.reingreso.toLocaleString()} U</p>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
              <p className="text-sm text-yellow-700 mb-1">Total Ajustes</p>
              <p className="text-2xl font-bold text-yellow-900">{totalesPorTipo.ajuste.toLocaleString()} U</p>
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
              <option value="ingreso">Ingresos ({movimientos.filter((m) => m.tipo === 'ingreso').length})</option>
              <option value="egreso">Egresos ({movimientos.filter((m) => m.tipo === 'egreso').length})</option>
              <option value="reingreso">Reingresos ({movimientos.filter((m) => m.tipo === 'reingreso').length})</option>
              <option value="ajuste">Ajustes ({movimientos.filter((m) => m.tipo === 'ajuste').length})</option>
            </select>
            <span className="text-sm text-gray-600 ml-auto">
              Mostrando: {movimientosFiltrados.length} movimiento{movimientosFiltrados.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* TABLA DE HISTORIAL */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando historial...</p>
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
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">FECHA</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">HORA</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">TIPO</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">VALE</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">CANTIDAD</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">ORIGEN</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">DESTINO</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">USUARIO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {movimientosFiltrados.map((mov) => (
                    <tr key={mov.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-semibold">{mov.fecha}</td>
                      <td className="px-4 py-3 text-gray-600">{mov.hora}</td>
                      <td className="px-4 py-3 text-center">{getTipoBadge(mov.tipo)}</td>
                      <td className="px-4 py-3 text-center text-gray-900 font-semibold">{mov.valeReferencia || '-'}</td>
                      <td className="px-4 py-3 text-right">{formatCantidad(mov.cantidad, mov.tipo)}</td>
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
