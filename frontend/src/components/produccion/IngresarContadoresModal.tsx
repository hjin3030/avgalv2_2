// frontend/src/components/produccion/IngresarContadoresModal.tsx

import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { todayDateString } from '@/utils/formatHelpers'
import { CONTADORES_PRODUCCION, PABELLONES_AUTOMATICOS } from '@/utils/constants'
import { guardarContadores, guardarPesosBaldePorPabellon } from '@/utils/produccionHelpers'

interface Props {
  isOpen: boolean
  onClose: () => void
  pabellones: any[] // lista de pabellones automáticos activos (ya filtrados desde Produccion)
  fecha: string
}

export default function IngresarContadoresModal({ isOpen, onClose, pabellones, fecha }: Props) {
  const { profile } = useAuth()

  const [paso, setPaso] = useState<1 | 2>(1)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // valores contadores: por id (1..18)
  const [valores, setValores] = useState<Record<number, number>>({})
  // pesos por pabellón: pabId -> number
  const [pesos, setPesos] = useState<Record<string, number>>({})

  const hoy = todayDateString()
  const esHoy = fecha === hoy

  const pabellonesOrdenados = useMemo(() => {
    const map = new Map(pabellones.map((p) => [p.id, p]))
    return (PABELLONES_AUTOMATICOS as readonly string[])
      .map((id) => map.get(id))
      .filter(Boolean) as any[]
  }, [pabellones])

  const contadoresPorPabellon = useMemo(() => {
    const grupos: Record<string, typeof CONTADORES_PRODUCCION> = {}
    CONTADORES_PRODUCCION.forEach((c) => {
      if (!grupos[c.pabellonId]) grupos[c.pabellonId] = []
      grupos[c.pabellonId].push(c)
    })
    // orden estable por id
    Object.values(grupos).forEach((arr) => arr.sort((a, b) => a.id - b.id))
    return grupos
  }, [])

  const totalProduccion = useMemo(() => {
    return CONTADORES_PRODUCCION.reduce((sum, c) => sum + Number(valores[c.id] || 0), 0)
  }, [valores])

  const pesoTotal = useMemo(() => {
    return Object.values(pesos).reduce((sum, p) => sum + Number(p || 0), 0)
  }, [pesos])

  const setValorContador = (contadorId: number, v: string) => {
    const n = Number(v || 0)
    setValores((prev) => ({ ...prev, [contadorId]: isNaN(n) ? 0 : n }))
  }

  const setPesoPabellon = (pabellonId: string, v: string) => {
    const n = Number(v || 0)
    setPesos((prev) => ({ ...prev, [pabellonId]: isNaN(n) ? 0 : n }))
  }

  const confirmar = async () => {
    try {
      setError(null)

      if (!esHoy) {
        throw new Error('Solo se permite ingresar contadores/peso para hoy')
      }
      if (!profile?.uid) {
        throw new Error('Usuario no autenticado')
      }

      setGuardando(true)

      // 1) guardar contadores
      await guardarContadores(fecha, valores, profile.uid, profile.nombre || 'Usuario')

      // 2) guardar pesos
      const pesosPorPabellon: Record<string, number> = {}
      pabellonesOrdenados.forEach((p) => {
        pesosPorPabellon[p.id] = Number(pesos[p.id] || 0)
      })
      await guardarPesosBaldePorPabellon(fecha, pesosPorPabellon, profile.uid, profile.nombre || 'Usuario')

      onClose()
      // hard refresh del estado (simple): recargar página o dejar que Produccion re-lea
      window.location.reload()
    } catch (e: any) {
      setError(e.message || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6 relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-3xl font-bold text-gray-600 hover:text-gray-900">
          &times;
        </button>

        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ingresar Producción (Automáticos)</h2>
            <p className="text-sm text-gray-600">Fecha: {fecha}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Paso {paso} de 2</p>
            <p className="text-lg font-bold text-blue-600">{totalProduccion.toLocaleString('es-CL')} U</p>
          </div>
        </div>

        {!esHoy && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 mb-4">
            Solo se permite ingresar datos para el día de hoy.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Paso 1: Contadores */}
        {paso === 1 && (
          <div className="space-y-4">
            {pabellonesOrdenados.map((p) => {
              const conts = contadoresPorPabellon[p.id] || []
              const totalPab = conts.reduce((sum, c) => sum + Number(valores[c.id] || 0), 0)

              return (
                <div key={p.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-800">{p.nombre}</h3>
                    <div className="text-sm text-gray-600">
                      Total pabellón: <span className="font-bold">{totalPab.toLocaleString('es-CL')} U</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {conts.map((c) => (
                      <label key={c.id} className="block">
                        <span className="text-xs text-gray-600">{c.label}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          value={valores[c.id] ?? ''}
                          onChange={(e) => setValorContador(c.id, e.target.value)}
                          disabled={!esHoy || guardando}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                onClick={() => setPaso(2)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                disabled={!esHoy || guardando}
              >
                Siguiente: Peso balde
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: Pesos */}
        {paso === 2 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">Peso balde total (suma)</p>
                <p className="text-2xl font-bold text-blue-700">{pesoTotal.toLocaleString('es-CL')} </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Importante: una vez confirmado, los valores NO podrán ser editados.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {pabellonesOrdenados.map((p) => (
                <label key={p.id} className="block border border-gray-200 rounded-xl p-3">
                  <span className="text-sm font-bold text-gray-800">{p.nombre}</span>
                  <span className="block text-xs text-gray-600 mt-1">Peso balde</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    value={pesos[p.id] ?? ''}
                    onChange={(e) => setPesoPabellon(p.id, e.target.value)}
                    disabled={!esHoy || guardando}
                  />
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setPaso(1)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                disabled={guardando}
              >
                Volver
              </button>
              <button
                onClick={confirmar}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold"
                disabled={!esHoy || guardando}
              >
                {guardando ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
