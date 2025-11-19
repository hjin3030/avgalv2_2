// frontend/src/components/bodega/AjusteStockModal.tsx
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useStock } from '@/hooks/useStock'
import { useSkus } from '@/hooks/useSkus'

interface AjusteStockModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AjusteStockModal({ onClose, onSuccess }: AjusteStockModalProps) {
  const { profile } = useAuth()
  const { stock, aplicarAjuste } = useStock()
  const { skus } = useSkus()

  const [skuId, setSkuId] = useState('')
  const [tipoAjuste, setTipoAjuste] = useState<'incrementar' | 'decrementar' | 'establecer'>('establecer')
  const [cantidad, setCantidad] = useState(0)
  const [razon, setRazon] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const skuSeleccionado = skus.find((s) => s.id === skuId)
  const stockActual = stock.find((s) => s.skuId === skuId)

  const calcularNuevoStock = () => {
    if (!stockActual) return 0
    if (tipoAjuste === 'establecer') return cantidad
    if (tipoAjuste === 'incrementar') return stockActual.cantidad + cantidad
    return stockActual.cantidad - cantidad
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || profile.rol !== 'superadmin') return

    try {
      setLoading(true)
      setError(null)

      if (!skuId) {
        setError('Debes seleccionar un SKU')
        return
      }

      if (!razon.trim()) {
        setError('Debes especificar una razón para el ajuste')
        return
      }

      if (cantidad <= 0 && tipoAjuste !== 'establecer') {
        setError('La cantidad debe ser mayor a 0')
        return
      }

      const resultado = await aplicarAjuste(
        skuId,
        tipoAjuste,
        cantidad,
        razon,
        observaciones,
        profile.id,
        profile.nombre
      )

      if (!resultado.success) {
        setError(resultado.error || 'Error al aplicar ajuste')
        return
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error al crear ajuste:', err)
      setError(err.message || 'Error al crear ajuste')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
          <h2 className="text-xl font-bold text-gray-900">⚙️ Ajuste de Stock</h2>
          <p className="text-sm text-red-700 mt-1">
            ⚠️ <strong>Solo Superadmin:</strong> Esta acción modifica directamente el stock y queda registrada en auditoría.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* SKU */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Producto (SKU) <span className="text-red-500">*</span>
            </label>
            <select
              value={skuId}
              onChange={(e) => setSkuId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              required
            >
              <option value="">Seleccionar producto...</option>
              {skus.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.codigo} - {s.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Mostrar stock actual */}
          {stockActual && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Stock actual:</strong> {stockActual.cantidad.toLocaleString('es-CL')} unidades
              </p>
            </div>
          )}

          {/* Tipo de Ajuste */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Ajuste <span className="text-red-500">*</span>
            </label>
            <select
              value={tipoAjuste}
              onChange={(e) => setTipoAjuste(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="establecer">Establecer cantidad exacta</option>
              <option value="incrementar">Incrementar stock</option>
              <option value="decrementar">Decrementar stock</option>
            </select>
          </div>

          {/* Cantidad */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
              min={tipoAjuste === 'establecer' ? 0 : 1}
            />
            {stockActual && (
              <p className="text-sm text-gray-600 mt-1">
                Nuevo stock: <strong className="text-gray-900">{calcularNuevoStock().toLocaleString('es-CL')}</strong> unidades
              </p>
            )}
          </div>

          {/* Razón (obligatoria) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Razón del Ajuste <span className="text-red-500">*</span>
            </label>
            <select
              value={razon}
              onChange={(e) => setRazon(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Seleccionar razón...</option>
              <option value="Corrección de inventario">Corrección de inventario</option>
              <option value="Merma o pérdida">Merma o pérdida</option>
              <option value="Rotura">Rotura</option>
              <option value="Devolución no registrada">Devolución no registrada</option>
              <option value="Error de sistema">Error de sistema</option>
              <option value="Ajuste de conteo físico">Ajuste de conteo físico</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {/* Observaciones */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones Adicionales
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Detalles adicionales del ajuste..."
            />
          </div>

          {/* Advertencia */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Atención:</strong> Este ajuste se aplicará inmediatamente y quedará registrado en la auditoría del sistema con prioridad ALTA.
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50"
            >
              {loading ? 'Aplicando...' : '⚙️ Aplicar Ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
