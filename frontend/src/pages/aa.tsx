// frontend/src/pages/packing/Packing.tsx
import { useState, useMemo, useEffect } from 'react'
import { useVales } from '@/hooks/useVales'
import { usePabellones } from '@/hooks/usePabellones'
import NuevoValeModal from '@/components/packing/NuevoValeModal'

export default function Packing() {
  const { vales } = useVales()
  const { pabellones } = usePabellones()

  const [mostrarModalNuevoVale, setMostrarModalNuevoVale] = useState(false)
  const [mostrarAlertaPesoBalde, setMostrarAlertaPesoBalde] = useState(false)
  const [pesoBalde, setPesoBalde] = useState('')
  const [pabellonSeleccionado, setPabellonSeleccionado] = useState('')
  const [valeSeleccionado, setValeSeleccionado] = useState<any>(null)
  const [verDetalleVale, setVerDetalleVale] = useState(false)

  // Fecha actual
  const fechaActual = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // ✅ DEBUG: Ver qué vales están llegando
  useEffect(() => {
    console.log('📦 VALES TOTALES:', vales.length)
    console.log('📦 VALES COMPLETOS:', vales)
    const hoy = new Date().toISOString().split('T')[0]
    console.log('📅 FECHA HOY:', hoy)
    
    // Ver todos los vales de hoy (sin filtro de tipo)
    const todosValesHoy = vales.filter((v) => v.fecha === hoy)
    console.log('📦 VALES DE HOY (todos):', todosValesHoy.length, todosValesHoy)
    
    // Ver solo ingresos
    const ingresosHoy = vales.filter((v) => v.fecha === hoy && v.tipo === 'ingreso')
    console.log('📦 INGRESOS HOY:', ingresosHoy.length, ingresosHoy)
  }, [vales])

  // Vales del día - MÚLTIPLES FILTROS POR SI ACASO
  const valesHoy = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0]
    
    // Probar TODOS estos filtros:
    const opcion1 = vales.filter((v) => v.fecha === hoy && v.tipo === 'ingreso')
    const opcion2 = vales.filter((v) => v.fecha === hoy && v.tipo?.toLowerCase() === 'ingreso')
    const opcion3 = vales.filter((v) => v.fecha?.includes(hoy) && v.tipo === 'ingreso')
    const opcion4 = vales.filter((v) => v.fecha === hoy) // SIN filtro de tipo
    
    console.log('🔍 OPCIÓN 1 (exacta):', opcion1.length)
    console.log('🔍 OPCIÓN 2 (lowercase):', opcion2.length)
    console.log('🔍 OPCIÓN 3 (includes):', opcion3.length)
    console.log('🔍 OPCIÓN 4 (sin tipo):', opcion4.length)
    
    // USAR LA QUE TENGA MÁS RESULTADOS
    if (opcion1.length > 0) return opcion1
    if (opcion2.length > 0) return opcion2
    if (opcion3.length > 0) return opcion3
    return opcion4 // Mostrar TODOS los vales de hoy mientras debugueamos
    
  }, [vales])

  // Helpers
  const getNombrePabellon = (id) => pabellones.find((p) => p.id === id)?.nombre || 'N/A'
  
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

  const handleGuardarPesoBalde = () => {
    console.log('Guardando peso balde:', pesoBalde, 'para pabellón:', pabellonSeleccionado)
    setMostrarAlertaPesoBalde(false)
    setPesoBalde('')
    setPabellonSeleccionado('')
  }

  const handleValeCreado = (valeId: string) => {
    console.log('✅ VALE CREADO:', valeId)
    // Forzar re-render después de 500ms
    setTimeout(() => {
      console.log('🔄 FORZANDO REFRESH...')
    }, 500)
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header con Título y Botones Prominentes */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">📦 Packing</h1>
            <p className="text-gray-600 mt-2 capitalize text-lg">{fechaActual}</p>
          </div>
        </div>

        {/* Botones Prominentes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Botón Crear Nuevo Vale */}
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
              <div className="text-6xl opacity-20 group-hover:opacity-30 transition-opacity">
                +
              </div>
            </div>
          </button>

          {/* Botón Ingresar Peso Balde - Estilo Alerta */}
          <button
            onClick={() => setMostrarAlertaPesoBalde(true)}
            className="group relative overflow-hidden bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-105 p-8"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-5xl">⚖️</div>
                </div>
                <h3 className="text-2xl font-bold mb-2">Ingresar Peso Balde</h3>
                <p className="text-orange-100 text-sm">Registrar peso del balde del día</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* DEBUG INFO - QUITAR DESPUÉS */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6">
        <h3 className="font-bold text-yellow-900 mb-2">🔍 DEBUG INFO:</h3>
        <p className="text-sm text-yellow-800">
          - Total vales cargados: <strong>{vales.length}</strong><br/>
          - Vales filtrados hoy: <strong>{valesHoy.length}</strong><br/>
          - Fecha actual: <strong>{new Date().toISOString().split('T')[0]}</strong>
        </p>
      </div>

      {/* Tabla de Historial de Vales */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">📋 Historial de Vales del Día</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {new Date().toISOString().split('T')[0]}
            </span>
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-bold">
              {valesHoy.length} vales
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="border border-gray-300 p-3 text-left font-bold text-gray-700">N° VALE</th>
                <th className="border border-gray-300 p-3 text-left font-bold text-gray-700">TIPO</th>
                <th className="border border-gray-300 p-3 text-left font-bold text-gray-700">TIMESTAMP</th>
                <th className="border border-gray-300 p-3 text-left font-bold text-gray-700">PABELLÓN</th>
                <th className="border border-gray-300 p-3 text-left font-bold text-gray-700">SKUs</th>
                <th className="border border-gray-300 p-3 text-center font-bold text-gray-700">TOTAL</th>
                <th className="border border-gray-300 p-3 text-center font-bold text-gray-700">ESTADO</th>
                <th className="border border-gray-300 p-3 text-center font-bold text-gray-700">ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {valesHoy.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border border-gray-200 p-8 text-center text-gray-500">
                    <div className="text-6xl mb-4">📦</div>
                    <p className="text-lg font-semibold">No hay vales registrados hoy</p>
                    <p className="text-sm text-gray-400 mt-2">Los vales creados aparecerán aquí</p>
                    <p className="text-xs text-red-500 mt-4">
                      DEBUG: Revisar consola del navegador para más info
                    </p>
                  </td>
                </tr>
              ) : (
                valesHoy.map((vale) => {
                  const desglose = calcularDesglose(vale.detalles)
                  return (
                    <tr key={vale.id} className="hover:bg-blue-50 transition-colors">
                      <td className="border border-gray-200 p-3">
                        <div className="font-mono font-bold text-blue-600">
                          {vale.tipo?.toUpperCase()} #{vale.correlativoDia || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">{vale.id?.slice(0, 8)}</div>
                      </td>
                      <td className="border border-gray-200 p-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">
                          {vale.tipo || 'N/A'}
                        </span>
                      </td>
                      <td className="border border-gray-200 p-3">
                        <div className="font-semibold">{vale.fecha}</div>
                        <div className="text-sm text-gray-600">{vale.hora}</div>
                        <div className="text-xs text-gray-400">
                          {vale.usuarioCreadorNombre || 'N/A'}
                        </div>
                      </td>
                      <td className="border border-gray-200 p-3">
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                          {getNombrePabellon(vale.origenId)}
                        </span>
                      </td>
                      <td className="border border-gray-200 p-3">
                        <div className="text-sm text-gray-700 font-medium">
                          {vale.detalles?.map((d) => d.sku).join(', ') || 'N/A'}
                        </div>
                      </td>
                      <td className="border border-gray-200 p-3 text-center">
                        <div className="font-bold text-lg text-gray-900">
                          {vale.totalUnidades?.toLocaleString('es-CL')} U
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {desglose.cajas}C · {desglose.bandejas}B · {desglose.unidades}U
                        </div>
                      </td>
                      <td className="border border-gray-200 p-3 text-center">
                        {getEstadoBadge(vale.estado)}
                      </td>
                      <td className="border border-gray-200 p-3 text-center">
                        <button 
                          onClick={() => handleVerDetalleVale(vale)} 
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-md"
                        >
                          👁️ Ver
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALES (sin cambios) */}
      {mostrarAlertaPesoBalde && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">⚖️ Ingresar Peso Balde</h2>
                  <p className="text-red-100 text-sm mt-1">Registro del día {new Date().toLocaleDateString('es-CL')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Pabellón</label>
                <select
                  value={pabellonSeleccionado}
                  onChange={(e) => setPabellonSeleccionado(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Seleccionar pabellón...</option>
                  {pabellones.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Peso del Balde (kg)</label>
                <input
                  type="number"
                  value={pesoBalde}
                  onChange={(e) => setPesoBalde(e.target.value)}
                  placeholder="Ej: 25.5"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  setMostrarAlertaPesoBalde(false)
                  setPesoBalde('')
                  setPabellonSeleccionado('')
                }}
                className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarPesoBalde}
                disabled={!pesoBalde || !pabellonSeleccionado}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
          onValeCreated={handleValeCreado}
        />
      )}

      {verDetalleVale && valeSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">📄 Detalle del Vale</h2>
                <p className="text-blue-100 text-sm mt-1">Vale #{valeSeleccionado.correlativoDia}</p>
              </div>
              <button 
                onClick={() => setVerDetalleVale(false)} 
                className="text-white hover:text-blue-200 text-3xl"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Fecha</p>
                  <p className="font-bold text-gray-900">{valeSeleccionado.fecha}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Hora</p>
                  <p className="font-bold text-gray-900">{valeSeleccionado.hora}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Usuario</p>
                  <p className="font-bold text-gray-900">{valeSeleccionado.usuarioCreadorNombre}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pabellón</p>
                  <p className="font-bold text-gray-900">{getNombrePabellon(valeSeleccionado.origenId)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Estado</p>
                  {getEstadoBadge(valeSeleccionado.estado)}
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Unidades</p>
                  <p className="font-bold text-2xl text-blue-600">
                    {valeSeleccionado.totalUnidades?.toLocaleString('es-CL')} U
                  </p>
                </div>
              </div>

              <table className="w-full border-collapse border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-3 text-left font-bold">SKU</th>
                    <th className="border p-3 text-center font-bold">Cajas</th>
                    <th className="border p-3 text-center font-bold">Bandejas</th>
                    <th className="border p-3 text-center font-bold">Unidades</th>
                    <th className="border p-3 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {valeSeleccionado.detalles?.map((detalle, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="border p-3 font-semibold">{detalle.sku}</td>
                      <td className="border p-3 text-center">{detalle.cajas}</td>
                      <td className="border p-3 text-center">{detalle.bandejas}</td>
                      <td className="border p-3 text-center">{detalle.unidades}</td>
                      <td className="border p-3 text-right font-bold">
                        {detalle.totalUnidades.toLocaleString('es-CL')} U
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-gray-50 border-t flex gap-3">
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                🖨️ Imprimir
              </button>
              <button
                onClick={() => setVerDetalleVale(false)}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}