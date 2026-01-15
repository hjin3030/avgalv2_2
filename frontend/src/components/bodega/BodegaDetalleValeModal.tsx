// frontend/src/components/bodega/DetalleValeModal.tsx

import React from 'react'
import { useSkus } from '@/hooks/useSkus'
import { formatDate } from '@/utils/formatHelpers'
import { getSkuNombre as getSkuNombreHelper } from '@/utils/skuHelpers'
import type { ValeDetalle } from '@/types'

interface DetalleValeModalProps {
  isOpen: boolean
  onClose: () => void
  valeData: any
}

export default function DetalleValeModal({ isOpen, onClose, valeData }: DetalleValeModalProps) {
  const { skus } = useSkus()

  if (!isOpen || !valeData) return null

  const getSkuNombre = (codigo: string) => {
    return getSkuNombreHelper(skus, codigo)
  }

  const imprimirVale = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] p-6 overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-black text-3xl font-bold"
          aria-label="Cerrar Detalle de Vale"
        >
          &times;
        </button>

        <h2 className="text-3xl font-bold mb-4">
          Detalle del Vale #{valeData.correlativoDia}
        </h2>

        <section className="mb-6 grid grid-cols-2 gap-4 text-gray-700">
          <div>
            <strong>Tipo:</strong> {valeData.tipo?.toUpperCase() || '-'}
          </div>
          <div>
            <strong>Estado:</strong> {valeData.estado?.toUpperCase() || '-'}
          </div>
          <div>
            <strong>Fecha Creación:</strong> {formatDate(valeData.fecha)} {valeData.hora || ''}
          </div>
          <div>
            <strong>Fecha Validación:</strong> {valeData.fechaValidacion || '-'}{' '}
            {valeData.horaValidacion || ''}
          </div>
          <div>
            <strong>Origen:</strong> {valeData.origenNombre || '-'}
          </div>
          <div>
            <strong>Destino:</strong> {valeData.destinoNombre || '-'}
          </div>
          <div>
            <strong>Transportista:</strong> {valeData.transportistaNombre || 'No asignado'}
          </div>
          <div>
            <strong>Usuario creador:</strong> {valeData.usuarioCreadorNombre || '-'}
          </div>
          <div>
            <strong>Usuario validador:</strong> {valeData.validadoPorNombre || '-'}
          </div>
          <div>
            <strong>Observaciones:</strong> {valeData.observaciones || '-'}
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold mb-2">Detalle SKUs</h3>
          <table className="w-full border-collapse border border-gray-300 text-gray-800 mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 p-2 text-left">SKU</th>
                <th className="border border-gray-300 p-2 text-center">Nombre</th>
                <th className="border border-gray-300 p-2 text-center">Cajas</th>
                <th className="border border-gray-300 p-2 text-center">Bandejas</th>
                <th className="border border-gray-300 p-2 text-center">Unidades</th>
                <th className="border border-gray-300 p-2 text-right">Total Unidades</th>
              </tr>
            </thead>
            <tbody>
              {valeData.detalles?.map((detalle: ValeDetalle, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2">{detalle.sku}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    {getSkuNombre(detalle.sku)}
                  </td>
                  <td className="border border-gray-300 p-2 text-center">
                    {detalle.cajas}
                  </td>
                  <td className="border border-gray-300 p-2 text-center">
                    {detalle.bandejas}
                  </td>
                  <td className="border border-gray-300 p-2 text-center">
                    {detalle.unidades}
                  </td>
                  <td className="border border-gray-300 p-2 text-right">
                    {detalle.totalUnidades.toLocaleString('es-CL')}
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-200">
                <td colSpan={5} className="text-right p-2">
                  Total General:
                </td>
                <td className="text-right p-2">
                  {valeData.totalUnidades?.toLocaleString('es-CL')}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <div className="flex justify-end gap-3">
          <button
            onClick={imprimirVale}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Imprimir
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
