import { useState } from 'react'
import { doc, updateDoc, collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import type { Vale } from '@/types'

interface ValidarValeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  vale: Vale
}

export default function ValidarValeModal(
  { isOpen, onClose, onConfirm, vale }: ValidarValeModalProps
) {
  const profile = useAuth()
  const [accion, setAccion] = useState<'validar' | 'rechazar'>('validar')
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (accion === 'rechazar' && !observaciones.trim()) {
      setError('Las observaciones son obligatorias para rechazar un vale')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const valeRef = doc(db, 'vales', vale.id)
      const ahora = new Date()
      const updateData: any = {
        estado: accion === 'validar' ? 'validado' : 'rechazado',
        updatedAt: Timestamp.fromDate(ahora)
      }

      // Solo si el vale estaba pendiente, registra fechaValidacion y horaValidacion
      if (vale.estado === 'pendiente') {
        updateData.fechaValidacion = ahora.toISOString().split('T')[0]
        updateData.horaValidacion = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
      }

      if (profile?.uid) updateData.validadoPorId = profile.uid
      if (profile?.nombre) updateData.validadoPorNombre = profile.nombre
      if (profile?.rol) updateData.validadoPorRol = profile.rol
      if (observaciones.trim()) updateData.observaciones = observaciones.trim()

      await updateDoc(valeRef, updateData)

      if (accion === 'validar') {
        for (const detalle of vale.detalles) {
          await addDoc(collection(db, 'movimientos'), {
            tipo: vale.tipo,
            skuCodigo: detalle.sku,
            skuNombre: detalle.skuNombre,
            cantidad: detalle.totalUnidades,
            valeId: vale.id,
            valeReferencia: vale.correlativoDia ? `${vale.tipo.toUpperCase()} #${vale.correlativoDia}` : '',
            valeEstado: 'validado',
            fecha: updateData.fechaValidacion,
            origenNombre: vale.origenNombre,
            destinoNombre: vale.destinoNombre,
            usuarioNombre: profile?.nombre || '',
            createdAt: serverTimestamp(),
          })
        }
      }

      onConfirm()
    } catch (err: any) {
      console.error('Error al validar vale', err)
      setError('Error: ' + (err.message || ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold">Validar Vale</h2>
            <p className="text-blue-100 mt-1">Confirma si deseas validar o rechazar el vale de ingreso.</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-white hover:text-blue-200 text-3xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          <div className="mb-4">
            <div className="font-bold text-lg mb-2">Detalle del Vale:</div>
            <div className="text-gray-700">Tipo: <b>{vale.tipo}</b></div>
            <div className="text-gray-700">Origen: <b>{vale.origenNombre}</b></div>
            <div className="text-gray-700">Destino: <b>{vale.destinoNombre}</b></div>
            <div className="text-gray-700">Productos:</div>
            <ul className="list-disc ml-5 text-sm mb-2">
              {vale.detalles.map((d: any, i: number) => (
                <li key={i}>{d.sku} - {d.skuNombre}: {d.totalUnidades} uds.</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block font-semibold mb-1">Acción</label>
              <select
                className="rounded border px-3 py-2 w-full"
                value={accion}
                onChange={e => setAccion(e.target.value as any)}
                disabled={loading}
              >
                <option value="validar">Validar</option>
                <option value="rechazar">Rechazar</option>
              </select>
            </div>
            {accion === 'rechazar' && (
              <div>
                <label className="block font-semibold mb-1">Observaciones (obligatorio si rechaza)</label>
                <textarea
                  rows={3}
                  className="rounded border px-3 py-2 w-full"
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  disabled={loading}
                  maxLength={400}
                />
              </div>
            )}
            {error && <div className="text-red-600 font-bold">{error}</div>}
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (accion === 'rechazar' && !observaciones.trim())}
            className={`flex-1 px-6 py-3 rounded-xl font-bold text-lg shadow-lg disabled:opacity-50
              ${accion === 'validar'
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
              }`
            }
          >
            {loading ? 'Procesando...' : accion === 'validar' ? 'Validar e Ingresar' : 'Rechazar Vale'}
          </button>
        </div>
      </div>
    </div>
  )
}
