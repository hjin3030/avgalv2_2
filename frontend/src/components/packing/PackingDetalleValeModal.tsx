import React, { useMemo } from 'react'
import { useSkus } from '@/hooks/useSkus'
import { formatDate, formatearFechaHora } from '@/utils/formatHelpers'

interface DetalleValeModalProps {
  isOpen: boolean
  onClose: () => void
  valeData: any
}

export default function PackingDetalleValeModal({ isOpen, onClose, valeData }: DetalleValeModalProps) {
  const { skus } = useSkus()
  if (!isOpen || !valeData) return null

  const getSkuNombre = (codigo: string) => {
    const sku = skus.find(s => s.codigo === codigo)
    return sku?.nombre || 'Desconocido'
  }

  const obsCreacion = (valeData.comentario ?? '').toString().trim()
  const obsValidacion = (valeData.observaciones ?? '').toString().trim()

  const fechaCreacionLabel = useMemo(() => {
    if (valeData.createdAt || valeData.timestamp) return formatearFechaHora(valeData.createdAt || valeData.timestamp)
    const f = valeData.fecha ? formatDate(valeData.fecha) : '-'
    const h = valeData.hora || ''
    return `${f} ${h}`.trim()
  }, [valeData])

  const fechaValidacionLabel = useMemo(() => {
    if (valeData.updatedAt) return formatearFechaHora(valeData.updatedAt)
    const fv = valeData.fechaValidacion || '-'
    const hv = valeData.horaValidacion || ''
    return `${fv} ${hv}`.trim()
  }, [valeData])

  const imprimirVale = () => window.print()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto print:bg-white print:p-0">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; }
          .no-print { display: none !important; }
          .print-modal-overlay { position: static !important; inset: auto !important; background: transparent !important; padding: 0 !important; }
          .print-container { width: 80mm !important; max-width: 80mm !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          .print-area { padding: 8px !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { padding: 4px !important; font-size: 11px !important; }
          h2 { font-size: 14px !important; margin: 0 0 6px 0 !important; }
          h3 { font-size: 12px !important; margin: 8px 0 6px 0 !important; }
        }
      `}</style>

      <div className="print-modal-overlay bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative print-container">
        <button
          onClick={onClose}
          className="no-print absolute top-4 right-4 text-gray-600 hover:text-black text-3xl font-bold"
          aria-label="Cerrar"
        >
          &times;
        </button>

        <div className="print-area p-6">
          <h2 className="text-3xl font-bold mb-4">
            Detalle del Vale #{valeData.correlativoDia ?? 'N/A'}
          </h2>

          {/* Orden solicitado */}
          <section className="mb-6 grid grid-cols-2 gap-3 text-gray-700 text-sm">
            <div><strong>Tipo:</strong> {valeData.tipo?.toUpperCase() || '-'}</div>
            <div><strong>Estado:</strong> {valeData.estado?.toUpperCase() || '-'}</div>

            <div><strong>Origen:</strong> {valeData.origenNombre || '-'}</div>
            <div><strong>Destino:</strong> {valeData.destinoNombre || '-'}</div>

            <div><strong>Pabellón:</strong> {valeData.pabellonNombre || '-'}</div>
            <div><strong>Transportista:</strong> {valeData.transportistaNombre || 'No asignado'}</div>

            <div><strong>Fecha Creación:</strong> {fechaCreacionLabel}</div>
            <div><strong>Fecha Validación:</strong> {fechaValidacionLabel}</div>

            <div><strong>Usuario Creador:</strong> {valeData.usuarioCreadorNombre || '-'}</div>
            <div><strong>Usuario Validador:</strong> {valeData.validadoPorNombre || '-'}</div>

            <div className="col-span-2">
              <strong>Observaciones (creación):</strong> {obsCreacion || '-'}
            </div>
            <div className="col-span-2">
              <strong>Observaciones (validación):</strong> {obsValidacion || '-'}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">Detalle SKUs</h3>
            <table className="w-full border-collapse border border-gray-300 text-gray-800 mb-6">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 p-2 text-left">SKU</th>
                  <th className="border border-gray-300 p-2 text-left">Nombre</th>
                  <th className="border border-gray-300 p-2 text-center">Cajas</th>
                  <th className="border border-gray-300 p-2 text-center">Bandejas</th>
                  <th className="border border-gray-300 p-2 text-center">Unidades</th>
                  <th className="border border-gray-300 p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(valeData.detalles || []).map((detalle: any, i: number) => (
                  <tr key={i}>
                    <td className="border border-gray-300 p-2">{detalle.sku}</td>
                    <td className="border border-gray-300 p-2">{getSkuNombre(detalle.sku)}</td>
                    <td className="border border-gray-300 p-2 text-center">{detalle.cajas ?? 0}</td>
                    <td className="border border-gray-300 p-2 text-center">{detalle.bandejas ?? 0}</td>
                    <td className="border border-gray-300 p-2 text-center">{detalle.unidades ?? 0}</td>
                    <td className="border border-gray-300 p-2 text-right">{Number(detalle.totalUnidades || 0).toLocaleString('es-CL')}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-200">
                  <td colSpan={5} className="text-right p-2">Total General:</td>
                  <td className="text-right p-2">{Number(valeData.totalUnidades || 0).toLocaleString('es-CL')}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <div className="no-print flex justify-end gap-3">
            <button onClick={imprimirVale} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
              Imprimir
            </button>
            <button onClick={onClose} className="px-6 py-3 bg-gray-300 rounded-lg hover:bg-gray-400 font-semibold">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
