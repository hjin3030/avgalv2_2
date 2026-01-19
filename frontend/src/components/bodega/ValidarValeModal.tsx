// frontend/src/components/bodega/ValidarValeModal.tsx

import { useMemo, useState } from 'react'
import { doc, updateDoc, collection, Timestamp, runTransaction } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import type { Vale, ValeDetalle, UserProfile } from '@/types'
import { getSkuNombre } from '@/utils/skuHelpers'

interface ValidarValeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  vale: Vale
}

function horaChileHHmm(date: Date) {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

const SKUS_SALA_L = new Set(['BLA MAN', 'COL MAN', 'BLA SINCAL', 'COL SINCAL'])
const SKUS_SUCIOS = new Set(['BLA MAN', 'COL MAN'])

function esValeSalaL(vale: Vale): boolean {
  const detalles = (vale.detalles || []) as any[]
  if (vale.tipo !== 'ingreso') return false
  if (vale.estado !== 'pendiente') return false
  if (detalles.length !== 1) return false
  return SKUS_SALA_L.has(String(detalles[0]?.sku || ''))
}

function generarLoteCodigo(fechaISO: string, correlativoDia: number) {
  const n = String(correlativoDia ?? 0).padStart(2, '0')
  return `SL-${fechaISO}-ING-${n}`
}

export default function ValidarValeModal({ isOpen, onClose, onConfirm, vale }: ValidarValeModalProps) {
  const { profile } = useAuth() as { profile: UserProfile | null }
  const [accion, setAccion] = useState<'validar' | 'rechazar'>('validar')
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const salaL = esValeSalaL(vale)

  const imprimir = () => window.print()

  const fechaCreacion = (vale as any).fecha || ''
  const horaCreacion = (vale as any).hora || ''
  const fechaCreacionLabel = `${fechaCreacion || '-'} ${horaCreacion || ''}`.trim()

  const obsCreacion = ((vale as any).comentario ?? '').toString().trim()
  const obsValidacionGuardada = ((vale as any).observaciones ?? '').toString().trim()

  const detalles: ValeDetalle[] = ((vale as any).detalles || []) as ValeDetalle[]

  const totales = useMemo(() => {
    const t = { cajas: 0, bandejas: 0, unidades: 0, totalUnidades: 0 }
    for (const d of detalles) {
      t.cajas += Number((d as any).cajas ?? 0)
      t.bandejas += Number((d as any).bandejas ?? 0)
      t.unidades += Number((d as any).unidades ?? 0)
      t.totalUnidades += Number((d as any).totalUnidades ?? 0)
    }
    return t
  }, [detalles])

  const formatSkuNombre = (d: ValeDetalle) => {
    return (d as any).skuNombre || getSkuNombre((d as any).sku)
  }

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
      const timestamp = Timestamp.fromDate(ahora)

      const updateData: any = {
        estado: accion === 'validar' ? 'validado' : 'rechazado',
        updatedAt: timestamp,
      }

      if (vale.estado === 'pendiente') {
        updateData.fechaValidacion = ahora.toISOString().split('T')[0] // YYYY-MM-DD
        updateData.horaValidacion = horaChileHHmm(ahora) // HH:mm
      }

      if (profile?.uid) updateData.validadoPorId = profile.uid
      if (profile?.nombre) updateData.validadoPorNombre = profile.nombre
      if (profile?.rol) updateData.validadoPorRol = profile.rol

      // observaciones = anotación de validación/rechazo (NO es el comentario de creación)
      if (observaciones.trim()) updateData.observaciones = observaciones.trim()

      // ===== VALIDAR INGRESO =====
      if (accion === 'validar' && vale.estado === 'pendiente' && vale.tipo === 'ingreso') {
        // ===== SALA L =====
        if (esValeSalaL(vale)) {
          await runTransaction(db, async (transaction) => {
            const detalle = (vale.detalles as ValeDetalle[])[0]
            const sku = String((detalle as any).sku || '')
            const skuNombre = (detalle as any).skuNombre || getSkuNombre((detalle as any).sku)

            const cantidad = Number((detalle as any).totalUnidades ?? 0)
            const cajas = Number((detalle as any).cajas ?? 0)
            const bandejas = Number((detalle as any).bandejas ?? 0)
            const unidades = Number((detalle as any).unidades ?? 0)

            if (!sku || cantidad <= 0) throw new Error('Detalle inválido: SKU o totalUnidades.')

            const esSucio = SKUS_SUCIOS.has(sku)

            // ===== 1) READS FIRST =====
            const stockSalaLRef = doc(db, 'stockSalaL', sku)
            const stockSalaLSnap = await transaction.get(stockSalaLRef)

            let loteRef: any = null
            let loteSnap: any = null
            if (esSucio) {
              loteRef = doc(db, 'lotesLimpieza', vale.id) // id del lote = valeId
              loteSnap = await transaction.get(loteRef)
            }

            // ===== 2) WRITES =====

            // 2.1) vale -> validado
            transaction.update(valeRef, updateData)

            // 2.2) stockSalaL/{sku} += cantidad
            const stockActual = stockSalaLSnap.exists() ? Number(stockSalaLSnap.data().cantidad ?? 0) : 0
            const nuevaCantidad = stockActual + cantidad

            if (stockSalaLSnap.exists()) {
              transaction.update(stockSalaLRef, {
                skuNombre,
                cantidad: nuevaCantidad,
                updatedAt: timestamp,
              })
            } else {
              transaction.set(stockSalaLRef, {
                activo: true,
                skuCodigo: sku,
                skuNombre,
                cantidad: nuevaCantidad,
                createdAt: timestamp,
                updatedAt: timestamp,
              })
            }

            // 2.3) lote (solo si sucio)
            if (esSucio && loteRef) {
              const fechaVale = String((vale as any).fecha || updateData.fechaValidacion || '')
              const correlativoDia = Number((vale as any).correlativoDia ?? 0)
              const loteCodigo = generarLoteCodigo(fechaVale, correlativoDia)

              const ingresoData = {
                cajas,
                bandejas,
                unidades,
                totalUnidades: cantidad,
              }

              const loteData: any = {
                loteCodigo,
                estado: 'EN_SALA',

                valeIngresoId: vale.id,
                valeReferencia: `INGRESO #${correlativoDia}`,
                fechaVale,
                correlativoDia,

                pabellonId: (vale as any).pabellonId ?? null,
                pabellonNombre: (vale as any).pabellonNombre ?? null,

                skuCodigoSucio: sku,
                skuNombreSucio: skuNombre,

                ingreso: ingresoData,

                fechaIngresoSalaL: updateData.fechaValidacion,
                horaIngresoSalaL: updateData.horaValidacion,
                usuarioIngresoSalaLId: profile?.uid || '',
                usuarioIngresoSalaLNombre: profile?.nombre || '',

                ubicacion: 'SALA_L',
                timestampIngresoSalaL: timestamp,

                createdAt: loteSnap?.exists() ? (loteSnap.data() as any).createdAt ?? timestamp : timestamp,
                updatedAt: timestamp,
              }

              if (!loteSnap?.exists()) transaction.set(loteRef, loteData)
              else transaction.update(loteRef, loteData)
            }

            // 2.4) movimiento -> Sala L (con pabellón)
            const movimientoRef = doc(collection(db, 'movimientos'))
            transaction.set(movimientoRef, {
              tipo: 'ingreso',
              skuCodigo: sku,
              skuNombre,
              cantidad,

              desglose: { cajas, bandejas, unidades },

              origenId: (vale as any).origenId || '',
              origenNombre: vale.origenNombre,

              destinoId: 'sala_l',
              destinoNombre: 'Sala L',

              pabellonId: (vale as any).pabellonId ?? null,
              pabellonNombre: (vale as any).pabellonNombre ?? null,

              valeId: vale.id,
              valeReferencia: vale.correlativoDia ? `${vale.tipo.toUpperCase()} #${vale.correlativoDia}` : '',
              valeEstado: 'validado',

              fecha: updateData.fechaValidacion,
              hora: updateData.horaValidacion,

              usuarioId: profile?.uid || '',
              usuarioNombre: profile?.nombre || '',

              createdAt: timestamp,
              timestamp,
            })
          })
        } else {
          // ===== BODEGA NORMAL =====
          await runTransaction(db, async (transaction) => {
            // READS
            const stockReads: { ref: any; snap: any; detalle: ValeDetalle }[] = []
            for (const detalle of vale.detalles as ValeDetalle[]) {
              const stockRef = doc(db, 'stock', (detalle as any).sku)
              const stockSnap = await transaction.get(stockRef)
              stockReads.push({ ref: stockRef, snap: stockSnap, detalle })
            }

            // WRITES
            transaction.update(valeRef, updateData)

            for (const item of stockReads) {
              const cantidad = Number((item.detalle as any).totalUnidades ?? 0)
              const cajas = Number((item.detalle as any).cajas ?? 0)
              const bandejas = Number((item.detalle as any).bandejas ?? 0)
              const unidades = Number((item.detalle as any).unidades ?? 0)

              if (item.snap.exists()) {
                const stockActual = Number(item.snap.data().cantidad ?? 0)
                transaction.update(item.ref, { cantidad: stockActual + cantidad, updatedAt: timestamp })
              } else {
                transaction.set(item.ref, {
                  skuCodigo: (item.detalle as any).sku,
                  skuNombre: (item.detalle as any).skuNombre || getSkuNombre((item.detalle as any).sku),
                  cantidad,
                  createdAt: timestamp,
                  updatedAt: timestamp,
                })
              }

              const movimientoRef = doc(collection(db, 'movimientos'))
              transaction.set(movimientoRef, {
                tipo: 'ingreso',
                skuCodigo: (item.detalle as any).sku,
                skuNombre: (item.detalle as any).skuNombre || getSkuNombre((item.detalle as any).sku),
                cantidad,
                desglose: { cajas, bandejas, unidades },

                origenId: (vale as any).origenId || '',
                origenNombre: vale.origenNombre,
                destinoId: (vale as any).destinoId || '',
                destinoNombre: vale.destinoNombre,

                pabellonId: (vale as any).pabellonId ?? null,
                pabellonNombre: (vale as any).pabellonNombre ?? null,

                valeId: vale.id,
                valeReferencia: vale.correlativoDia ? `${vale.tipo.toUpperCase()} #${vale.correlativoDia}` : '',
                valeEstado: 'validado',

                fecha: updateData.fechaValidacion,
                hora: updateData.horaValidacion,

                usuarioId: profile?.uid || '',
                usuarioNombre: profile?.nombre || '',

                createdAt: timestamp,
                timestamp,
              })
            }
          })
        }
      } else {
        await updateDoc(valeRef, updateData)
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
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 print:bg-white print:p-0">
      {/* Impresión térmica (80mm) para el bodeguero */}
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; }
          .no-print { display: none !important; }
          .print-overlay { position: static !important; inset: auto !important; background: transparent !important; padding: 0 !important; }
          .print-container { width: 80mm !important; max-width: 80mm !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          .print-area { padding: 8px !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { padding: 4px !important; font-size: 11px !important; }
          h2 { font-size: 14px !important; margin: 0 0 6px 0 !important; }
          h3 { font-size: 12px !important; margin: 8px 0 6px 0 !important; }
        }
      `}</style>

      <div className="print-overlay bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col print-container">
        {/* Header (no imprime) */}
        <div className="no-print p-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold">Validar Vale</h2>
            <p className="text-blue-100 mt-1">Confirma si deseas validar o rechazar el vale de ingreso.</p>
            {salaL && (
              <p className="text-blue-100 mt-1 text-sm">
                Detectado como ingreso a <b>Sala L</b> (no suma stock en bodega).
              </p>
            )}
          </div>

          <button onClick={onClose} disabled={loading} className="text-white hover:text-blue-200 text-3xl font-bold">
            ×
          </button>
        </div>

        {/* Contenido imprimible + usable */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50 print-area">
          {/* Ficha ordenada */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Detalle del Vale #{(vale as any).correlativoDia ?? 'N/A'}
                </h3>
                <div className="text-xs text-gray-500 mt-1">
                  ID: {(vale as any).id?.slice(0, 8) || '-'}
                </div>
              </div>

              <div className="no-print flex gap-2">
                <button
                  onClick={imprimir}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
                >
                  Imprimir
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-700">
              <div><strong>Tipo:</strong> {(vale as any).tipo?.toUpperCase() || '-'}</div>
              <div><strong>Estado:</strong> {(vale as any).estado?.toUpperCase() || '-'}</div>

              <div><strong>Origen:</strong> {(vale as any).origenNombre || '-'}</div>
              <div><strong>Destino:</strong> {(vale as any).destinoNombre || '-'}</div>

              <div><strong>Pabellón:</strong> {(vale as any).pabellonNombre || '-'}</div>
              <div><strong>Transportista:</strong> {(vale as any).transportistaNombre || 'No asignado'}</div>

              <div><strong>Fecha Creación:</strong> {fechaCreacionLabel}</div>
              <div><strong>Fecha Validación:</strong> {((vale as any).fechaValidacion || '-') + ' ' + ((vale as any).horaValidacion || '')}</div>

              <div><strong>Usuario Creador:</strong> {(vale as any).usuarioCreadorNombre || '-'}</div>
              <div><strong>Usuario Validador:</strong> {(vale as any).validadoPorNombre || '-'}</div>

              <div className="col-span-2">
                <strong>Observaciones (creación):</strong> {obsCreacion || '-'}
              </div>
              <div className="col-span-2">
                <strong>Observaciones (validación):</strong> {obsValidacionGuardada || '-'}
              </div>
            </div>

            {/* Tabla SKUs */}
            <div className="mt-4">
              <h3 className="text-base font-bold text-gray-900 mb-2">Detalle SKUs</h3>

              <table className="w-full border-collapse border border-gray-300 text-gray-800">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 p-2 text-left">SKU</th>
                    <th className="border border-gray-300 p-2 text-left">Nombre</th>
                    <th className="border border-gray-300 p-2 text-center">C</th>
                    <th className="border border-gray-300 p-2 text-center">B</th>
                    <th className="border border-gray-300 p-2 text-center">U</th>
                    <th className="border border-gray-300 p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.map((d: any, i: number) => (
                    <tr key={i}>
                      <td className="border border-gray-300 p-2">{d.sku}</td>
                      <td className="border border-gray-300 p-2">{formatSkuNombre(d)}</td>
                      <td className="border border-gray-300 p-2 text-center">{Number(d.cajas ?? 0)}</td>
                      <td className="border border-gray-300 p-2 text-center">{Number(d.bandejas ?? 0)}</td>
                      <td className="border border-gray-300 p-2 text-center">{Number(d.unidades ?? 0)}</td>
                      <td className="border border-gray-300 p-2 text-right">{Number(d.totalUnidades ?? 0).toLocaleString('es-CL')}</td>
                    </tr>
                  ))}

                  <tr className="font-bold bg-gray-200">
                    <td colSpan={5} className="text-right p-2">Total General:</td>
                    <td className="text-right p-2">{Number((vale as any).totalUnidades ?? totales.totalUnidades ?? 0).toLocaleString('es-CL')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Acción (no imprime) */}
          <div className="no-print mt-4 bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col gap-3">
              <div>
                <label className="block font-semibold mb-1">Acción</label>
                <select
                  className="rounded border px-3 py-2 w-full"
                  value={accion}
                  onChange={(e) => setAccion(e.target.value as 'validar' | 'rechazar')}
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
                    onChange={(e) => setObservaciones(e.target.value)}
                    disabled={loading}
                    maxLength={400}
                  />
                </div>
              )}

              {error && <div className="text-red-600 font-bold">{error}</div>}
            </div>
          </div>
        </div>

        {/* Footer acciones (no imprime) */}
        <div className="no-print px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-4">
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
            className={`flex-1 px-6 py-3 rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 ${
              accion === 'validar'
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
            }`}
          >
            {loading ? 'Procesando...' : accion === 'validar' ? 'Validar e Ingresar' : 'Rechazar Vale'}
          </button>
        </div>
      </div>
    </div>
  )
}
