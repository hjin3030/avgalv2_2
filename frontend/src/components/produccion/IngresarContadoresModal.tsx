// frontend/src/components/produccion/IngresarContadoresModal.tsx

import { useState, useMemo } from 'react'
import { CONTADORES_PRODUCCION, PABELLONES_AUTOMATICOS } from '@/utils/constants'
import { guardarContadores } from '@/utils/produccionHelpers'
import { useAuth } from '@/hooks/useAuth'

interface IngresarContadoresModalProps {
  isOpen: boolean
  onClose: () => void
  onContadoresGuardados?: () => void
}

export default function IngresarContadoresModal({ 
  isOpen, 
  onClose, 
  onContadoresGuardados 
}: IngresarContadoresModalProps) {
  const { profile } = useAuth()
  const [paso, setPaso] = useState(1)
  const [valores, setValores] = useState<Record<number, number>>({})
  const [guardando, setGuardando] = useState(false)

  const fechaActual = useMemo(() => {
    const hoy = new Date()
    return hoy.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }, [])

  const totalProduccion = useMemo(() => {
    return Object.values(valores).reduce((sum, val) => sum + (val || 0), 0)
  }, [valores])

  const handleValorChange = (contadorId: number, valor: string) => {
    const numericValue = parseInt(valor) || 0
    setValores(prev => ({
      ...prev,
      [contadorId]: numericValue
    }))
  }

  const todosLosContadoresIngresados = useMemo(() => {
    return CONTADORES_PRODUCCION.every(c => valores[c.id] !== undefined && valores[c.id] >= 0)
  }, [valores])

  const handleCerrar = () => {
    setPaso(1)
    setValores({})
    onClose()
  }

  const handleConfirmar = async () => {
    if (!profile) {
      alert('No hay usuario autenticado')
      return
    }

    if (!todosLosContadoresIngresados) {
      alert('Debes ingresar valores para todos los contadores')
      return
    }

    setGuardando(true)

    try {
      await guardarContadores(valores, profile.uid, profile.nombre)
      alert('✅ Contadores guardados exitosamente')
      if (onContadoresGuardados) onContadoresGuardados()
      handleCerrar()
    } catch (error: any) {
      console.error('Error guardando contadores:', error)
      alert(`❌ Error: ${error.message || 'No se pudieron guardar los contadores'}`)
    } finally {
      setGuardando(false)
    }
  }

  if (!isOpen) return null

  // Agrupar contadores por pabellón
  const contadoresPorPabellon = useMemo(() => {
    const grupos: Record<string, typeof CONTADORES_PRODUCCION> = {}
    CONTADORES_PRODUCCION.forEach(contador => {
      if (!grupos[contador.pabellonId]) {
        grupos[contador.pabellonId] = []
      }
      grupos[contador.pabellonId].push(contador)
    })
    return grupos
  }, [])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">⚙️ Ingresar Contadores de Producción</h2>
              <p className="text-indigo-100 text-base mt-2 capitalize">{fechaActual}</p>
              <p className="text-indigo-200 text-sm mt-1">Paso {paso} de 2</p>
            </div>
            <button 
              onClick={handleCerrar} 
              className="text-white hover:text-indigo-200 text-3xl"
            >
              &times;
            </button>
          </div>
        </div>

        {/* PASO 1: INGRESO DE CONTADORES */}
        {paso === 1 && (
          <div className="flex-1 overflow-auto p-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-3xl">📌</div>
                <div>
                  <p className="font-bold text-blue-900 mb-2">Instrucciones:</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Ingresa el valor de cada contador de producción</li>
                    <li>• Los valores deben ser números enteros (sin decimales)</li>
                    <li>• <strong>Una vez confirmado, NO podrás editar estos valores</strong></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-6">
              <div className="text-center">
                <p className="text-sm text-green-700 font-semibold">Total Producción</p>
                <p className="text-4xl font-bold text-green-900 mt-2">
                  {totalProduccion.toLocaleString('es-CL')} unidades
                </p>
              </div>
            </div>

            {PABELLONES_AUTOMATICOS.map((pabellonId) => {
              const contadores = contadoresPorPabellon[pabellonId] || []
              if (contadores.length === 0) return null

              const totalPabellon = contadores.reduce((sum, c) => sum + (valores[c.id] || 0), 0)

              return (
                <div key={pabellonId} className="mb-6 border-2 border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-4">
                    <h3 className="text-xl font-bold">{contadores[0].pabellonNombre}</h3>
                    <p className="text-sm text-purple-100 mt-1">
                      Total: <strong>{totalPabellon.toLocaleString('es-CL')} U</strong>
                    </p>
                  </div>

                  <div className="p-4 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {contadores.map((contador) => (
                        <div 
                          key={contador.id}
                          className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-400 transition-colors bg-gray-50"
                        >
                          <label className="block mb-2">
                            <span className="font-bold text-gray-900">{contador.label}</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={valores[contador.id] || ''}
                            onChange={(e) => handleValorChange(contador.id, e.target.value)}
                            placeholder="0"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-bold text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handleCerrar}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setPaso(2)}
                disabled={!todosLosContadoresIngresados}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente → Confirmar
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: CONFIRMACIÓN */}
        {paso === 2 && (
          <div className="flex-1 overflow-auto p-6">
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-3xl">⚠️</div>
                <div>
                  <p className="font-bold text-yellow-900 mb-2">Importante:</p>
                  <p className="text-sm text-yellow-800">
                    Una vez confirmado, estos valores <strong>NO podrán ser editados</strong>. 
                    Revisa cuidadosamente antes de confirmar.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6 mb-6">
              <div className="text-center">
                <p className="text-gray-700 font-semibold mb-2">Total Producción del Día</p>
                <p className="text-5xl font-bold text-green-700">
                  {totalProduccion.toLocaleString('es-CL')} U
                </p>
                <p className="text-sm text-gray-600 mt-3 capitalize">{fechaActual}</p>
              </div>
            </div>

            {PABELLONES_AUTOMATICOS.map((pabellonId) => {
              const contadores = contadoresPorPabellon[pabellonId] || []
              if (contadores.length === 0) return null

              const totalPabellon = contadores.reduce((sum, c) => sum + (valores[c.id] || 0), 0)

              return (
                <div key={pabellonId} className="mb-6 border-2 border-gray-300 rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
                    <h3 className="text-xl font-bold">{contadores[0].pabellonNombre}</h3>
                    <p className="text-sm text-indigo-100 mt-1">
                      Total: <strong>{totalPabellon.toLocaleString('es-CL')} U</strong>
                    </p>
                  </div>

                  <div className="p-4 bg-white">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-3 text-left font-bold text-gray-700">Contador</th>
                          <th className="p-3 text-right font-bold text-gray-700">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contadores.map((contador, idx) => (
                          <tr key={contador.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="p-3 text-gray-900">{contador.label}</td>
                            <td className="p-3 text-right font-bold text-lg text-gray-900">
                              {(valores[contador.id] || 0).toLocaleString('es-CL')} U
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
              >
                ← Atrás
              </button>
              <button
                type="button"
                onClick={handleConfirmar}
                disabled={guardando}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : '✅ Confirmar y Guardar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
