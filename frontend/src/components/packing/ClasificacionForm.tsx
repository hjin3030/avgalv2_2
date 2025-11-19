// Archivo: frontend/src/components/packing/ClasificacionForm.tsx
import { useState, useEffect } from 'react'
import { useSkus } from '@/hooks/useSkus'
import { usePabellones } from '@/hooks/usePabellones'
import { calcularTotalUnidades } from '@/utils/skuHelpers'
import type { ValeDetalle, Sku } from '@/types'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'

interface ClasificacionFormProps {
  onSubmit: (data: ClasificacionData) => void
  onCancel: () => void
}

interface ClasificacionData {
  pabellonId: string
  fecha: string
  detalles: ValeDetalle[]
}

export default function ClasificacionForm({ onSubmit, onCancel }: ClasificacionFormProps) {
  const { skus, loading: loadingSkus } = useSkus(true)
  const { pabellones, loading: loadingPabellones } = usePabellones(true)

  const [pabellonId, setPabellonId] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [detalles, setDetalles] = useState<ValeDetalle[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (skus.length > 0 && detalles.length === 0) {
      const detallesIniciales = skus
        .sort((a, b) => a.orden - b.orden)
        .map(sku => ({
          sku: sku.codigo,
          cajas: 0,
          bandejas: 0,
          unidades: 0,
          totalUnidades: 0
        }))
      setDetalles(detallesIniciales)
    }
  }, [skus])

  const actualizarDetalle = (skuCodigo: string, campo: 'cajas' | 'bandejas' | 'unidades', valor: number) => {
    const sku = skus.find(s => s.codigo === skuCodigo)
    if (!sku) return

    setDetalles(prev => prev.map(d => {
      if (d.sku === skuCodigo) {
        const nuevoCajas = campo === 'cajas' ? valor : d.cajas
        const nuevoBandejas = campo === 'bandejas' ? valor : d.bandejas
        const nuevoUnidades = campo === 'unidades' ? valor : d.unidades

        return {
          ...d,
          [campo]: valor,
          totalUnidades: calcularTotalUnidades(nuevoCajas, nuevoBandejas, nuevoUnidades, sku)
        }
      }
      return d
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!pabellonId) {
      setError('Debe seleccionar un pabellón')
      return
    }

    const detallesConCantidad = detalles.filter(d => d.totalUnidades > 0)

    if (detallesConCantidad.length === 0) {
      setError('Debe ingresar al menos una cantidad')
      return
    }

    onSubmit({
      pabellonId,
      fecha,
      detalles: detallesConCantidad
    })
  }

  const calcularTotal = () => {
    return detalles.reduce((sum, d) => sum + d.totalUnidades, 0)
  }

  if (loadingSkus || loadingPabellones) {
    return <div className="text-center py-8">Cargando...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="danger" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card title="Información General">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pabellón Origen
            </label>
            <select
              value={pabellonId}
              onChange={(e) => setPabellonId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Seleccionar pabellón...</option>
              {pabellones.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Clasificación
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>
      </Card>

      <Card title="Clasificación por Calibre" subtitle="Ingrese las cantidades clasificadas">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">SKU</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Cajas</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Bandejas</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Unidades</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Total (U)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {detalles.map(detalle => {
                const sku = skus.find(s => s.codigo === detalle.sku)
                if (!sku) return null

                return (
                  <tr key={detalle.sku} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {sku.nombre}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        value={detalle.cajas}
                        onChange={(e) => actualizarDetalle(detalle.sku, 'cajas', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        value={detalle.bandejas}
                        onChange={(e) => actualizarDetalle(detalle.sku, 'bandejas', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        value={detalle.unidades}
                        onChange={(e) => actualizarDetalle(detalle.sku, 'unidades', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-semibold">
                      {detalle.totalUnidades.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                  TOTAL EMPAQUETADO:
                </td>
                <td className="px-4 py-2 text-right text-lg font-bold text-blue-600">
                  {calcularTotal().toLocaleString()} U
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit">
          Generar Vale de Ingreso
        </Button>
      </div>
    </form>
  )
}
