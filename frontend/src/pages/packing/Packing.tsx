import { useState, useMemo, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useVales } from '@/hooks/useVales'
import { usePabellones } from '@/hooks/usePabellones'
import NuevoValeModal from '@/components/packing/NuevoValeModal'
import DetalleValeModal from '@/components/packing/DetalleValeModal'
import { todayDateString, justDate, formatearFechaHora, formatDate } from '@/utils/formatHelpers'
import { GRAMOS_POR_UNIDAD } from '@/utils/constants'

export default function Packing() {
  const { vales } = useVales()
  const { pabellones } = usePabellones()

  const [mostrarModalNuevoVale, setMostrarModalNuevoVale] = useState(false)
  const [mostrarAlertaPesoBalde, setMostrarAlertaPesoBalde] = useState(false)
  const [pesoBalde, setPesoBalde] = useState('')
  const [pesoBaldeDia, setPesoBaldeDia] = useState<number | null>(null)
  const [cargandoPeso, setCargandoPeso] = useState(true)
  const [valeSeleccionado, setValeSeleccionado] = useState<any>(null)
  const [verDetalleVale, setVerDetalleVale] = useState(false)
  const [sortCol, setSortCol] = useState<string>('fecha')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const fechaActualCL = formatDate(todayDateString())

  useEffect(() => {
    const cargarPesoBalde = async () => {
      try {
        const hoyString = todayDateString()
        const docRef = doc(db, 'pesosBalde', hoyString)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setPesoBaldeDia(docSnap.data().peso)
        } else {
          setPesoBaldeDia(null)
        }
      } catch (error) {
        console.error('Error cargando peso balde:', error)
      } finally {
        setCargandoPeso(false)
      }
    }
    cargarPesoBalde()
  }, [])

  const valesHoy = useMemo(() => {
    const hoy = todayDateString()
    return vales.filter((v) =>
      v.fecha &&
      justDate(v.fecha) === hoy &&
      v.tipo?.toLowerCase() === 'ingreso'
    )
  }, [vales])

  // MOVER LA FUNCIÓN ANTES DEL useMemo QUE LA USA
  const getNombrePabellon = (id) => pabellones.find((p) => p.id === id)?.nombre || 'N/A'

  const valesSorted = useMemo(() => {
    const sorted = [...valesHoy]
    sorted.sort((a, b) => {
      let vA, vB
      switch (sortCol) {
        case 'nro':
          vA = a.correlativoDia || ''
          vB = b.correlativoDia || ''
          break
        case 'tipo':
          vA = a.tipo || ''
          vB = b.tipo || ''
          break
        case 'fecha':
          vA = a.updatedAt || a.createdAt || a.timestamp
          vB = b.updatedAt || b.createdAt || b.timestamp
          break
        case 'pabellon':
          vA = getNombrePabellon(a.origenId)
          vB = getNombrePabellon(b.origenId)
          break
        case 'skus':
          vA = (a.detalles || []).map(d => d.sku).join(', ')
          vB = (b.detalles || []).map(d => d.sku).join(', ')
          break
        case 'total':
          vA = a.totalUnidades || 0
          vB = b.totalUnidades || 0
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
          vA = a.updatedAt || a.createdAt || a.timestamp
          vB = b.updatedAt || b.createdAt || b.timestamp
      }
      if (typeof vA === 'string' && typeof vB === 'string') {
        if (sortDir === 'asc') return vA.localeCompare(vB)
        else return vB.localeCompare(vA)
      }
      if (typeof vA === 'number' && typeof vB === 'number') {
        if (sortDir === 'asc') return vA - vB
        else return vB - vA
      }
      return 0
    })
    return sorted
  }, [valesHoy, sortCol, sortDir, pabellones])

  const getEstadoBadge = (estado) => {
    const colores = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      validado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800'
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colores[estado] || 'bg-gray-100'}`}>
        {estado?.toUpperCase()}
      </span>
    )
  }

  const calcularDesglose = (detalles) => {
    const t = { cajas: 0, bandejas: 0, unidades: 0 }
    detalles?.forEach(d => {
      t.cajas += d.cajas || 0
      t.bandejas += d.bandejas || 0
      t.unidades += d.unidades || 0
    })
    return t
  }

  const handleVerDetalleVale = (vale) => {
    setValeSeleccionado(vale)
    setVerDetalleVale(true)
  }

  const handleGuardarPesoBalde = async () => {
    try {
      const pesoNumerico = parseFloat(pesoBalde)
      if (isNaN(pesoNumerico) || pesoNumerico <= 0) {
        alert('Por favor ingresa un peso válido')
        return
      }
      const hoyString = todayDateString()
      const ahora = new Date()
      const docRef = doc(db, 'pesosBalde', hoyString)
      await setDoc(docRef, {
        peso: pesoNumerico,
        fecha: hoyString,
        timestamp: ahora.toISOString(),
        hora: ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      })
      setPesoBaldeDia(pesoNumerico)
      setMostrarAlertaPesoBalde(false)
      setPesoBalde('')
    } catch (error) {
      console.error('Error guardando peso balde:', error)
      alert('Error al guardar el peso. Intenta nuevamente.')
    }
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

  const getCellValue = (vale, col) => {
    const desglose = calcularDesglose(vale.detalles)
    switch (col) {
      case 'nro': return (<div className="font-mono font-bold text-blue-600">{vale.tipo?.toUpperCase()} #{vale.correlativoDia || 'N/A'}<div className="text-xs text-gray-500">{vale.id?.slice(0, 8)}</div></div>)
      case 'tipo': return (<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">{vale.tipo || 'N/A'}</span>)
      case 'fecha': return (
        <div>
          <div className="font-semibold text-sm">
            {vale.estado === 'pendiente'
              ? (<>
                  <div className="text-gray-900">{formatearFechaHora(vale.createdAt || vale.timestamp)}</div>
                  <div className="text-xs text-gray-500">Creado</div>
                 </>)
              : (<>
                  <div className="text-gray-900">{formatearFechaHora(vale.updatedAt || vale.timestamp)}</div>
                  <div className="text-xs text-gray-500">Actualizado</div>
                 </>)
            }
          </div>
          <div className="text-xs text-gray-400">{vale.usuarioCreadorNombre || 'N/A'}</div>
        </div>
      )
      case 'pabellon': return (<span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">{getNombrePabellon(vale.origenId)}</span>)
      case 'skus': return (
        <div className="text-sm text-gray-700 font-medium max-w-xs overflow-x-auto whitespace-nowrap">
          {vale.detalles?.map((d) => d.sku).join(', ') || 'N/A'}
        </div>
      )
      case 'total': return (<div className="font-bold text-xl text-gray-900">{vale.totalUnidades?.toLocaleString('es-CL')} U
        <div className="text-sm text-gray-600 font-semibold">{desglose.cajas}C · {desglose.bandejas}B · {desglose.unidades}U</div>
      </div>)
      case 'estado': return getEstadoBadge(vale.estado)
      case 'timestamp': return (vale.estado === 'pendiente' || !vale.updatedAt
        ? '-' : formatearFechaHora(vale.updatedAt))
      case 'accion':
        return (
          <button
            onClick={() => handleVerDetalleVale(vale)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-md"
          >👁️ Ver</button>
        )
      default: return null
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">📦 Packing</h1>
            <p className="text-gray-600 mt-2 capitalize text-lg">{fechaActualCL}</p>
          </div>
        </div>
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
          {cargandoPeso ? (
            <div className="bg-gray-200 rounded-2xl shadow-2xl p-8 flex items-center justify-center">
              <div className="animate-pulse text-gray-500">Cargando...</div>
            </div>
          ) : pesoBaldeDia === null ? (
            <button
              onClick={() => setMostrarAlertaPesoBalde(true)}
              className="group relative overflow-hidden bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-105 p-8"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </div>
                    <div className="text-5xl">⚖️</div>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Ingresar Peso Balde</h3>
                  <p className="text-orange-100 text-sm">⚠️ No registrado hoy</p>
                </div>
              </div>
            </button>
          ) : (
            <div className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-2xl shadow-2xl transition-all duration-300 transform p-8 opacity-70 cursor-not-allowed">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center"><svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></div>
                    <div className="text-5xl">⚖️</div>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Peso Balde Registrado</h3>
                  <p className="text-blue-100 text-sm">✅ {pesoBaldeDia} kg</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
                      if(col.id !== "accion") {
                        setSortCol(col.id)
                        setSortDir(
                          sortCol === col.id && sortDir === 'desc' ? 'asc' : 'desc'
                        )
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
                valesSorted.map((vale) => (
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

      {mostrarAlertaPesoBalde && pesoBaldeDia === null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 text-white bg-gradient-to-r from-red-500 to-orange-500">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">⚖️ Peso Balde del Día</h2>
                  <p className="text-red-100 text-sm">{fechaActualCL}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>📌 Nota:</strong> Este peso aplica para todo el packing del día (Pabellones 13, 14 y 15).
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Peso del Balde (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={pesoBalde}
                  onChange={(e) => setPesoBalde(e.target.value)}
                  placeholder="Ej: 10"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-bold"
                />
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              <button
                onClick={() => { setMostrarAlertaPesoBalde(false); setPesoBalde('') }}
                className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarPesoBalde}
                disabled={!pesoBalde}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:from-blue-700 hover:to-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar Peso
              </button>
            </div>
          </div>
        </div>
      )}

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
