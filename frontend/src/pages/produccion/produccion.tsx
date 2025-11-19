// frontend/src/pages/produccion/produccion.tsx

import { useState, useEffect } from 'react'
import { usePabellones } from '@/hooks/usePabellones'
import { todayDateString } from '@/utils/formatHelpers'
import { formatDateTime } from '@/lib/formatters'
import {
  verificarContadoresIngresados,
  obtenerContadoresFecha,
  obtenerFechaAnterior,
  calcularVariacion,
  type RegistroContadores,
  type ContadorValor
} from '@/utils/produccionHelpers'
import IngresarContadoresModal from '@/components/produccion/IngresarContadoresModal'
import { PABELLONES_AUTOMATICOS } from '@/utils/constants'

// Función helper para formatear fecha a DD-MM-AAAA
const formatearFecha = (fechaStr: string): string => {
  const [year, month, day] = fechaStr.split('-')
  return `${day}-${month}-${year}`
}

// Modal para ver detalles del pabellón
function VerPabellonModal({ pabellon, onClose }: { pabellon: any; onClose: () => void }) {
  if (!pabellon) return null

  const ocupacion = pabellon.capacidadTotal
    ? ((pabellon.cantidadTotal / pabellon.capacidadTotal) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-3xl font-bold text-gray-600 hover:text-gray-900"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-gray-900">{pabellon.nombre}</h2>
        <div className="space-y-2">
          <p className="text-gray-700">
            <strong>Cantidad Actual:</strong> {(pabellon.cantidadTotal || 0).toLocaleString('es-CL')} U
          </p>
          <p className="text-gray-700">
            <strong>Capacidad Total:</strong> {(pabellon.capacidadTotal || 0).toLocaleString('es-CL')} U
          </p>
          <p className="text-gray-700">
            <strong>% Ocupación:</strong> {ocupacion}%
          </p>
          <p className="text-gray-700">
            <strong>Total Líneas:</strong> {pabellon.totalLineas || '-'}
          </p>
          <p className="text-gray-700">
            <strong>Caras por Línea:</strong> {pabellon.carasPorLinea || '-'}
          </p>
          <p className="text-gray-700">
            <strong>Estado:</strong>{' '}
            <span className={pabellon.activo ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
              {pabellon.activo ? 'ACTIVO' : 'INACTIVO'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Produccion() {
  const { pabellones } = usePabellones()
  const [fechaSeleccionada, setFechaSeleccionada] = useState(todayDateString())
  const [mostrarModalContadores, setMostrarModalContadores] = useState(false)
  const [contadoresIngresados, setContadoresIngresados] = useState(false)
  const [cargandoEstado, setCargandoEstado] = useState(true)
  const [registroContadores, setRegistroContadores] = useState<RegistroContadores | null>(null)
  const [registroAnterior, setRegistroAnterior] = useState<RegistroContadores | null>(null)
  const [pabellonDetalle, setPabellonDetalle] = useState<any>(null)
  const [pabellonesExpandidos, setPabellonesExpandidos] = useState<Set<string>>(new Set())
  const [seccionResumenExpandida, setSeccionResumenExpandida] = useState(true)
  const [seccionPabellonesExpandida, setSeccionPabellonesExpandida] = useState(true)

  const hoy = todayDateString()
  const esHoy = fechaSeleccionada === hoy

  useEffect(() => {
    const cargarEstadoYContadores = async () => {
      setCargandoEstado(true)
      const ingresados = await verificarContadoresIngresados(fechaSeleccionada)
      setContadoresIngresados(ingresados)

      if (ingresados) {
        const registro = await obtenerContadoresFecha(fechaSeleccionada)
        setRegistroContadores(registro)

        const fechaAnterior = obtenerFechaAnterior(fechaSeleccionada)
        const registroAnt = await obtenerContadoresFecha(fechaAnterior)
        setRegistroAnterior(registroAnt)
      } else {
        setRegistroContadores(null)
        setRegistroAnterior(null)
      }

      setCargandoEstado(false)
    }

    cargarEstadoYContadores()
  }, [fechaSeleccionada])

  // Filtrar TODOS los pabellones activos (no solo automáticos)
  const pabellonesActivos = pabellones.filter((p) => p.activo)

  // Función para extraer el número del contador (C1, C2, etc.)
  const extraerNumeroContador = (label: string): string => {
    const match = label.match(/C(\d+)/)
    return match ? `C${match[1]}` : label
  }

  const togglePabellon = (pabellonNombre: string) => {
    setPabellonesExpandidos((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(pabellonNombre)) {
        newSet.delete(pabellonNombre)
      } else {
        newSet.add(pabellonNombre)
      }
      return newSet
    })
  }

  // Agrupar contadores por pabellón
  const agruparContadoresPorPabellon = (contadores: ContadorValor[]) => {
    const grupos: Record<string, ContadorValor[]> = {}
    contadores.forEach((contador) => {
      const pabNombre = contador.pabellonNombre
      if (!grupos[pabNombre]) {
        grupos[pabNombre] = []
      }
      grupos[pabNombre].push(contador)
    })
    return grupos
  }

  return (
    <div className="p-8 space-y-6">
      {/* SELECTOR DE FECHA */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow">
        <label className="font-medium text-gray-700">Fecha:</label>
        <input
          type="date"
          value={fechaSeleccionada}
          onChange={(e) => setFechaSeleccionada(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-600">{formatearFecha(fechaSeleccionada)}</span>
        {esHoy && <span className="text-sm text-blue-600 font-medium">Hoy</span>}
      </div>

      {/* 1. ALERTA DE CONTADORES INGRESADOS */}
      {cargandoEstado ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2">Cargando...</p>
        </div>
      ) : contadoresIngresados && registroContadores ? (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-6 shadow">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-green-800 mb-3">✅ Contadores Ingresados</h3>

              {/* Fecha y hora */}
              {registroContadores.createdAt && (
                <div className="flex items-center gap-2 text-sm text-green-700 mb-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">Ingresado el:</span>
                  <span>{formatDateTime(registroContadores.createdAt)}</span>
                </div>
              )}

              {/* Usuario */}
              {registroContadores.usuarioNombre && (
                <div className="flex items-center gap-2 text-sm text-green-700 mb-4">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-semibold">Por:</span>
                  <span>{registroContadores.usuarioNombre}</span>
                </div>
              )}

              {/* Total con variación */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Producción del Día</p>
                    <p className="text-3xl font-bold text-green-600">
                      {registroContadores.totalProduccion.toLocaleString('es-CL')} U
                    </p>
                  </div>
                  {registroAnterior && (() => {
                    const variacion = calcularVariacion(registroContadores.totalProduccion, registroAnterior.totalProduccion)
                    const esPositivo = variacion >= 0
                    return (
                      <div className={`text-right ${esPositivo ? 'text-green-600' : 'text-red-600'}`}>
                        <p className="text-sm font-medium">vs día anterior</p>
                        <p className="text-2xl font-bold">
                          {esPositivo ? '↗' : '↘'} {esPositivo ? '+' : ''}{variacion.toFixed(1)}%
                        </p>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-6 shadow">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-yellow-800 font-semibold">
                ⚠️ No se ingresaron contadores para el {formatearFecha(fechaSeleccionada)}
              </p>
              {esHoy && (
                <button
                  onClick={() => setMostrarModalContadores(true)}
                  className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Ingresar Contadores
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. RESUMEN DE CONTADORES DEL DÍA (COLAPSABLE POR PABELLÓN) */}
      {contadoresIngresados && registroContadores?.contadores && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Header Colapsable */}
          <button
            onClick={() => setSeccionResumenExpandida(!seccionResumenExpandida)}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between hover:from-blue-700 hover:to-blue-800 transition-colors"
          >
            <div>
              <h2 className="text-2xl font-bold text-white text-left">📊 Resumen de Contadores del Día</h2>
              <p className="text-blue-100 mt-1 text-left">Contadores ingresados por pabellón</p>
            </div>
            <svg
              className={`w-8 h-8 text-white transition-transform ${seccionResumenExpandida ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {seccionResumenExpandida && (
            <div className="p-6 space-y-3">
              {Object.entries(agruparContadoresPorPabellon(registroContadores.contadores)).map(
                ([pabellonNombre, contadoresPab]) => {
                  const isExpanded = pabellonesExpandidos.has(pabellonNombre)

                  // Calcular total del pabellón
                  const totalPabellon = contadoresPab.reduce((sum, c) => sum + c.valor, 0)

                  // Calcular variación vs día anterior
                  let variacionPabellon = 0
                  if (registroAnterior?.contadores) {
                    const contadoresAnterioresPab = registroAnterior.contadores.filter(
                      (c) => c.pabellonNombre === pabellonNombre
                    )
                    const totalAnterior = contadoresAnterioresPab.reduce((sum, c) => sum + c.valor, 0)
                    if (totalAnterior > 0) {
                      variacionPabellon = calcularVariacion(totalPabellon, totalAnterior)
                    }
                  }

                  const esPositivo = variacionPabellon >= 0

                  return (
                    <div key={pabellonNombre} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                      {/* Header Colapsable por Pabellón */}
                      <button
                        onClick={() => togglePabellon(pabellonNombre)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-bold text-gray-800">{pabellonNombre}</span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold ${
                              esPositivo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {esPositivo ? '↗' : '↘'} {Math.abs(variacionPabellon).toFixed(1)}% vs día anterior
                          </span>
                        </div>
                        <svg
                          className={`w-6 h-6 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Contenido Expandible */}
                      {isExpanded && (
                        <div className="p-6 bg-white border-t-2">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {contadoresPab.map((contador) => {
                              // Calcular variación individual
                              let variacionIndividual = null
                              if (registroAnterior?.contadores) {
                                const contadorAnterior = registroAnterior.contadores.find(
                                  (c) => c.contadorId === contador.contadorId
                                )
                                if (contadorAnterior && contadorAnterior.valor > 0) {
                                  variacionIndividual = calcularVariacion(contador.valor, contadorAnterior.valor)
                                }
                              }

                              return (
                                <div key={contador.contadorId} className="bg-gray-50 rounded-lg p-4 text-center">
                                  <p className="text-sm font-semibold text-gray-700 mb-2">
                                    {extraerNumeroContador(contador.label)}
                                  </p>
                                  <p className="text-3xl font-bold text-blue-600">
                                    {contador.valor.toLocaleString('es-CL')}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">unidades</p>
                                  {variacionIndividual !== null && (
                                    <p
                                      className={`text-xs font-semibold mt-2 ${
                                        variacionIndividual >= 0 ? 'text-green-600' : 'text-red-600'
                                      }`}
                                    >
                                      {variacionIndividual >= 0 ? '▲' : '▼'} {variacionIndividual >= 0 ? '+' : ''}
                                      {variacionIndividual.toFixed(1)}%
                                    </p>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* Total del Pabellón */}
                          <div className="mt-6 bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Total del Pabellón</p>
                                <p className="text-3xl font-bold text-blue-600">
                                  {totalPabellon.toLocaleString('es-CL')} U
                                </p>
                              </div>
                              <div className={`text-right ${esPositivo ? 'text-green-600' : 'text-red-600'}`}>
                                <p className="text-sm font-medium">vs día anterior</p>
                                <p className="text-2xl font-bold">
                                  {esPositivo ? '↗' : '↘'} {Math.abs(variacionPabellon).toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. PABELLONES DE PRODUCCIÓN (COLAPSABLE) */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Header Colapsable */}
        <button
          onClick={() => setSeccionPabellonesExpandida(!seccionPabellonesExpandida)}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 flex items-center justify-between hover:from-indigo-700 hover:to-indigo-800 transition-colors"
        >
          <div>
            <h2 className="text-2xl font-bold text-white text-left">🏭 Pabellones de Producción</h2>
            <p className="text-indigo-100 mt-1 text-left">Pabellones activos ({pabellonesActivos.length})</p>
          </div>
          <svg
            className={`w-8 h-8 text-white transition-transform ${seccionPabellonesExpandida ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {seccionPabellonesExpandida && (
          <div className="p-6">
            {pabellonesActivos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg font-medium">No hay pabellones activos configurados</p>
                <p className="text-sm mt-2">Activa los pabellones en la sección de Configuración</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pabellonesActivos.map((pabellon) => {
                  const ocupacion = pabellon.capacidadTotal
                    ? ((pabellon.cantidadTotal / pabellon.capacidadTotal) * 100).toFixed(1)
                    : '0.0'

                  return (
                    <div
                      key={pabellon.id}
                      onClick={() => setPabellonDetalle(pabellon)}
                      className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-indigo-400 hover:shadow-xl transition-all cursor-pointer"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-800">{pabellon.nombre}</h3>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          Activo
                        </span>
                      </div>

                      {/* Estadísticas */}
                      <div className="space-y-3">
                        {/* Cantidad Actual */}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <p className="text-xs text-gray-600 mb-1 font-semibold">Cantidad Actual</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {(pabellon.cantidadTotal || 0).toLocaleString('es-CL')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">unidades</p>
                        </div>

                        {/* % de Ocupación */}
                        <div className="bg-green-50 rounded-lg p-4">
                          <p className="text-xs text-gray-600 mb-1 font-semibold">% de Ocupación</p>
                          <div className="flex items-baseline gap-2 mb-2">
                            <p className="text-3xl font-bold text-green-600">{ocupacion}%</p>
                            <p className="text-sm text-gray-500">
                              de {(pabellon.capacidadTotal || 0).toLocaleString('es-CL')}
                            </p>
                          </div>
                          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-green-500 h-full transition-all duration-300"
                              style={{ width: `${Math.min(parseFloat(ocupacion), 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Otros datos */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <span className="text-gray-600 text-xs">Líneas</span>
                            <p className="font-bold text-gray-800 text-lg">{pabellon.totalLineas || 0}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <span className="text-gray-600 text-xs">Caras/Línea</span>
                            <p className="font-bold text-gray-800 text-lg">{pabellon.carasPorLinea || 0}</p>
                          </div>
                        </div>
                      </div>

                      <button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors text-sm">
                        Ver Detalles Completos
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALES */}
      {mostrarModalContadores && (
        <IngresarContadoresModal
          isOpen={mostrarModalContadores}
          onClose={() => setMostrarModalContadores(false)}
          pabellones={pabellonesActivos.filter((p) => PABELLONES_AUTOMATICOS.some(pabId => p.id === pabId || p.nombre.includes(pabId.replace('pab', ''))))}
          fecha={fechaSeleccionada}
        />
      )}

      {pabellonDetalle && <VerPabellonModal pabellon={pabellonDetalle} onClose={() => setPabellonDetalle(null)} />}
    </div>
  )
}
