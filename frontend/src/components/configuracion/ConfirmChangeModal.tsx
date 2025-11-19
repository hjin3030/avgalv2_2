// frontend/src/components/ConfirmChangeModal.tsx

import { formatDateTime } from '@/lib/formatters'

interface CambioPendiente {
  id: string
  modulo: string
  nombre: string
  activo: boolean
  activoAnterior: boolean
}

interface ConfirmChangeModalProps {
  isOpen: boolean
  cambio: CambioPendiente | null
  onConfirm: () => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function ConfirmChangeModal({
  isOpen,
  cambio,
  onConfirm,
  onCancel,
  isLoading = false
}: ConfirmChangeModalProps) {
  if (!isOpen || !cambio) return null

  const textoAccion = cambio.activo ? 'Activar' : 'Desactivar'
  const estadoActual = cambio.activoAnterior ? 'Activo' : 'Inactivo'
  const nuevoEstado = cambio.activo ? 'Activo' : 'Inactivo'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Confirmar Cambio</h3>
        </div>

        {/* CONTENT */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <p className="text-sm text-gray-600">Módulo:</p>
            <p className="font-semibold text-gray-900 capitalize">{cambio.modulo}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Elemento:</p>
            <p className="font-semibold text-gray-900">{cambio.nombre}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Acción:</p>
            <p className="font-semibold text-gray-900">{textoAccion}</p>
          </div>

          <div className="bg-gray-50 p-3 rounded-md">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-600">Estado actual:</p>
                <p className="font-semibold text-gray-900">{estadoActual}</p>
              </div>
              <div className="text-2xl text-gray-400">→</div>
              <div>
                <p className="text-xs text-gray-600">Nuevo estado:</p>
                <p className={`font-semibold ${cambio.activo ? 'text-green-600' : 'text-red-600'}`}>
                  {nuevoEstado}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ Este cambio será registrado en el log de auditoría.
            </p>
          </div>

          <div className="text-xs text-gray-500">
            Hora: {formatDateTime(new Date())}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isLoading && (
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
