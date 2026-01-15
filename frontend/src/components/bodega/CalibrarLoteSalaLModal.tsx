import { useMemo, useState } from 'react'
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { GRAMOS_POR_UNIDAD } from '@/utils/constants'
import { useAuth } from '@/hooks/useAuth'
import type { UserProfile } from '@/types'

type DetalleCBU = { totalUnidades?: number; cajas?: number; bandejas?: number; unidades?: number }

type LoteLimpieza = {
  id: string
  loteCodigo: string
  estado: string
  skuCodigoSucio: string

  // Sala L (referencia)
  ingreso?: DetalleCBU // MAN (sucio)
  lavado?: DetalleCBU // si lo usas como "SINCAL observado" en Sala L
  desechoKg?: number
  desechoUnidades?: number // desecho Sala L (uds)

  skuDestinoSincal?: string // BLA SINCAL / COL SINCAL
  netoSincal?: number // si lo guardas como "SINCAL observado"

  calibracion?: {
    detalles?: Array<{ skuCodigo: string; skuNombre: string; unidades: number }>
    desechoKg?: number
    desechoUnidades?: number
    totalCalibradoUnidades?: number
    totalSalidaUnidades?: number
    diferenciaVsSincal?: number
    porcCalibradoVsSincal?: number
    porcDesechoVsSincal?: number
    timestampCalibracion?: any
    usuarioId?: string
    usuarioNombre?: string
  }
}

type LineaCalibracion = {
  skuCodigo: string
  skuNombre: string
  unidades: number
}

function n(v: any): number {
  const x = Number(v ?? 0)
  return isNaN(x) ? 0 : x
}

function formatUds(v: any) {
  return n(v).toLocaleString('es-CL')
}

function formatKg(v: any) {
  return n(v).toLocaleString('es-CL', { maximumFractionDigits: 2 })
}

function udsDesdeKg(kg: any) {
  const gramos = n(kg) * 1000
  if (GRAMOS_POR_UNIDAD <= 0) return 0
  return Math.round(gramos / GRAMOS_POR_UNIDAD)
}

function pct(num: number, den: number): number {
  if (den <= 0) return 0
  return (num / den) * 100
}

function inferSkuSincalDesdeSucio(skuCodigoSucio: string) {
  const sku = String(skuCodigoSucio || '').toUpperCase()
  if (sku.startsWith('BLA')) return 'BLA SINCAL'
  if (sku.startsWith('COL')) return 'COL SINCAL'
  return 'BLA SINCAL'
}

function nombreSkuBasico(codigo: string) {
  if (codigo === 'BLA SINCAL') return 'blanco sin calibrar'
  if (codigo === 'COL SINCAL') return 'color sin calibrar'
  if (codigo === 'DES') return 'desecho'
  return codigo
}

function horaChileHHmm(date: Date) {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export default function CalibrarLoteSalaLModal(props: {
  isOpen: boolean
  onClose: () => void
  lote: LoteLimpieza | null
  skuOptions: Array<{ codigo: string; nombre: string }>
}) {
  const { isOpen, onClose, lote, skuOptions } = props
  const { profile } = useAuth() as { profile: UserProfile | null }

  const [lineas, setLineas] = useState<LineaCalibracion[]>([{ skuCodigo: '', skuNombre: '', unidades: 0 }])
  const [desechoKgBodega, setDesechoKgBodega] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !lote) return null

  const skuSincal = lote.skuDestinoSincal || inferSkuSincalDesdeSucio(lote.skuCodigoSucio)

  // “SINCAL de referencia” para control (lo observado en Sala L).
  // No se asume exacto: se usa para % y diferencias.
  const sincalReferencia = useMemo(() => {
    if (typeof lote.netoSincal === 'number') return n(lote.netoSincal)
    // fallback: si estás usando lavado.totalUnidades como SINCAL observado:
    if (lote.lavado?.totalUnidades != null) return n(lote.lavado.totalUnidades)
    return 0
  }, [lote])

  const desechoUdsBodega = useMemo(() => udsDesdeKg(desechoKgBodega), [desechoKgBodega])

  const lineasLimpias = useMemo(() => {
    return lineas
      .map((l) => ({
        skuCodigo: String(l.skuCodigo || '').trim(),
        skuNombre: String(l.skuNombre || nombreSkuBasico(l.skuCodigo)).trim(),
        unidades: n(l.unidades),
      }))
      .filter((l) => l.skuCodigo && l.unidades > 0)
  }, [lineas])

  const totalCalibradoUds = useMemo(() => lineasLimpias.reduce((sum, l) => sum + l.unidades, 0), [lineasLimpias])

  const totalSalidaUds = useMemo(() => totalCalibradoUds + desechoUdsBodega, [totalCalibradoUds, desechoUdsBodega])

  const diffVsSincal = useMemo(() => totalSalidaUds - sincalReferencia, [totalSalidaUds, sincalReferencia])

  const porcCal = useMemo(() => pct(totalCalibradoUds, sincalReferencia), [totalCalibradoUds, sincalReferencia])
  const porcDes = useMemo(() => pct(desechoUdsBodega, sincalReferencia), [desechoUdsBodega, sincalReferencia])

  const addLinea = () => setLineas((prev) => [...prev, { skuCodigo: '', skuNombre: '', unidades: 0 }])
  const removeLinea = (idx: number) => setLineas((prev) => prev.filter((_, i) => i !== idx))

  const updateLineaSku = (idx: number, skuCodigo: string) => {
    const opt = skuOptions.find((s) => s.codigo === skuCodigo)
    setLineas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, skuCodigo, skuNombre: opt?.nombre || nombreSkuBasico(skuCodigo) } : l)),
    )
  }

  const updateLineaUds = (idx: number, unidades: number) => {
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, unidades } : l)))
  }

  const validarBasico = async () => {
    if (!profile?.uid || !profile?.nombre) return 'No hay usuario autenticado.'
    if (lineasLimpias.length === 0) return 'Debes ingresar al menos 1 SKU calibrado con unidades > 0.'
    if (lineasLimpias.some((l) => l.skuCodigo === skuSincal)) return 'No puedes calibrar hacia un SKU SINCAL.'
    if (lineasLimpias.some((l) => l.skuCodigo === 'DES')) return 'El DES se ingresa en el campo de desecho (kg).'
    if (n(desechoKgBodega) < 0) return 'Desecho (kg) no puede ser negativo.'
    if (totalSalidaUds <= 0) return 'Total salida debe ser > 0.'
    return null
  }

  const confirmarCalibracion = async () => {
    setError(null)
    const msg = await validarBasico()
    if (msg) {
      setError(msg)
      return
    }

    setSaving(true)

    try {
      const ahora = new Date()
      const ts = Timestamp.fromDate(ahora)
      const fecha = ahora.toISOString().split('T')[0]
      const hora = horaChileHHmm(ahora)

      // 1) Ajuste stock + movimientos en una transacción para evitar descalces
      await runTransaction(db, async (tx) => {
        // Validar stock SINCAL disponible
        const stockSincalRef = doc(db, 'stock', skuSincal)
        const stockSincalSnap = await tx.get(stockSincalRef)
        const stockSincalActual = stockSincalSnap.exists() ? n((stockSincalSnap.data() as any).cantidad) : 0

        if (totalSalidaUds > stockSincalActual) {
          throw new Error(
            `Stock insuficiente en ${skuSincal}. Disponible ${formatUds(stockSincalActual)} uds, salida ${formatUds(totalSalidaUds)} uds.`,
          )
        }

        // Descontar SINCAL
        tx.set(
          stockSincalRef,
          {
            skuCodigo: skuSincal,
            skuNombre: nombreSkuBasico(skuSincal),
            cantidad: stockSincalActual - totalSalidaUds,
            updatedAt: ts,
            ...(stockSincalSnap.exists() ? {} : { createdAt: ts }),
          },
          { merge: true },
        )

        // Sumar SKUs calibrados
        for (const d of lineasLimpias) {
          const sRef = doc(db, 'stock', d.skuCodigo)
          const sSnap = await tx.get(sRef)
          const actual = sSnap.exists() ? n((sSnap.data() as any).cantidad) : 0
          tx.set(
            sRef,
            {
              skuCodigo: d.skuCodigo,
              skuNombre: d.skuNombre || nombreSkuBasico(d.skuCodigo),
              cantidad: actual + d.unidades,
              updatedAt: ts,
              ...(sSnap.exists() ? {} : { createdAt: ts }),
            },
            { merge: true },
          )
        }

        // Sumar DES (desecho bodega)
        if (desechoUdsBodega > 0) {
          const desRef = doc(db, 'stock', 'DES')
          const desSnap = await tx.get(desRef)
          const desActual = desSnap.exists() ? n((desSnap.data() as any).cantidad) : 0
          tx.set(
            desRef,
            {
              skuCodigo: 'DES',
              skuNombre: nombreSkuBasico('DES'),
              cantidad: desActual + desechoUdsBodega,
              updatedAt: ts,
              ...(desSnap.exists() ? {} : { createdAt: ts }),
            },
            { merge: true },
          )
        }

        // Guardar “snapshot” de calibración en el lote (para auditoría/control)
        const loteRef = doc(db, 'lotesLimpieza', lote.id)
        const loteSnap = await tx.get(loteRef)
        if (!loteSnap.exists()) throw new Error('Lote no existe')

        const data = loteSnap.data() as any
        if (data.calibracion?.timestampCalibracion) {
          throw new Error('Este lote ya fue calibrado y no puede recalibrarse.')
        }

        tx.update(loteRef, {
          estado: 'CALIBRADO_OK',
          calibracion: {
            detalles: lineasLimpias,
            desechoKg: n(desechoKgBodega),
            desechoUnidades: desechoUdsBodega,
            totalCalibradoUnidades: totalCalibradoUds,
            totalSalidaUnidades: totalSalidaUds,
            diferenciaVsSincal: diffVsSincal,
            porcCalibradoVsSincal: porcCal,
            porcDesechoVsSincal: porcDes,
            timestampCalibracion: ts,
            usuarioId: profile!.uid,
            usuarioNombre: profile!.nombre,
          },
          updatedAt: ts,
        })

        // eventos + movimientos (en subcolección y movimientos)
        const evRef = doc(collection(db, 'lotesLimpieza', lote.id, 'eventos'))
        tx.set(evRef, {
          tipo: 'CALIBRACION_CONFIRMADA',
          skuSincalOrigen: skuSincal,
          sincalReferencia,
          totalCalibradoUds,
          desechoKgBodega: n(desechoKgBodega),
          desechoUdsBodega,
          totalSalidaUds,
          diferenciaVsSincal: diffVsSincal,
          porcCalibradoVsSincal: porcCal,
          porcDesechoVsSincal: porcDes,
          detalles: lineasLimpias,
          fecha,
          hora,
          usuarioId: profile!.uid,
          usuarioNombre: profile!.nombre,
          createdAt: ts,
        })

        // movimientos (1 por SKU calibrado)
        for (const d of lineasLimpias) {
          const movRef = doc(collection(db, 'movimientos'))
          tx.set(movRef, {
            tipo: 'ingreso',
            skuCodigo: d.skuCodigo,
            skuNombre: d.skuNombre || nombreSkuBasico(d.skuCodigo),
            cantidad: d.unidades,
            origenNombre: 'Bodega (Calibrado desde SINCAL)',
            destinoNombre: 'Bodega',
            valeId: lote.id,
            valeReferencia: lote.loteCodigo || lote.id,
            valeEstado: 'validado',
            loteId: lote.id,
            fecha,
            hora,
            usuarioId: profile!.uid,
            usuarioNombre: profile!.nombre,
            createdAt: serverTimestamp(),
            timestamp: serverTimestamp(),
          })
        }

        // movimiento DES de calibración
        if (desechoUdsBodega > 0) {
          const movDesRef = doc(collection(db, 'movimientos'))
          tx.set(movDesRef, {
            tipo: 'ingreso',
            skuCodigo: 'DES',
            skuNombre: nombreSkuBasico('DES'),
            cantidad: desechoUdsBodega,
            origenNombre: 'Bodega (Desecho calibración desde SINCAL)',
            destinoNombre: 'Bodega (DES)',
            valeId: lote.id,
            valeReferencia: lote.loteCodigo || lote.id,
            valeEstado: 'validado',
            loteId: lote.id,
            metadata: { desechoKgBodega: n(desechoKgBodega), gramosPorUnidad: GRAMOS_POR_UNIDAD },
            fecha,
            hora,
            usuarioId: profile!.uid,
            usuarioNombre: profile!.nombre,
            createdAt: serverTimestamp(),
            timestamp: serverTimestamp(),
          })
        }

        // movimiento EGRESO desde SINCAL (para que Cartola muestre la salida de SINCAL)
        const movOutRef = doc(collection(db, 'movimientos'))
        tx.set(movOutRef, {
          tipo: 'egreso',
          skuCodigo: skuSincal,
          skuNombre: nombreSkuBasico(skuSincal),
          cantidad: -totalSalidaUds,
          origenNombre: 'Bodega (SINCAL)',
          destinoNombre: 'Bodega (Calibración)',
          valeId: lote.id,
          valeReferencia: lote.loteCodigo || lote.id,
          valeEstado: 'validado',
          loteId: lote.id,
          fecha,
          hora,
          usuarioId: profile!.uid,
          usuarioNombre: profile!.nombre,
          createdAt: serverTimestamp(),
          timestamp: serverTimestamp(),
        })
      })

      onClose()
    } catch (e: any) {
      setError(e?.message || 'Error al confirmar calibración')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 bg-gradient-to-r from-slate-700 to-slate-900 text-white flex justify-between items-center">
          <div>
            <div className="text-xl font-bold">Calibrar lote {lote.loteCodigo}</div>
            <div className="text-slate-200 text-sm">
              Origen: {skuSincal} · Referencia SINCAL (Sala L): {formatUds(sincalReferencia)} uds
            </div>
          </div>
          <button onClick={onClose} disabled={saving} className="text-white hover:text-slate-200 text-3xl font-bold">
            ×
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border rounded-xl p-4 bg-gray-50">
            <div className="text-sm font-bold text-gray-700 mb-2">Control (orientación)</div>
            <div className="text-sm text-gray-700">
              <b>SINCAL</b> ≈ Calibrados + DES (Bodega). No se fuerza cuadratura, pero se muestra diferencia y %.
            </div>
            <div className="text-xs text-gray-500 mt-2">Conversión: 1 unidad = {GRAMOS_POR_UNIDAD} g.</div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white border rounded p-3">
                <div className="text-xs text-gray-500">Referencia SINCAL (Sala L)</div>
                <div className="font-bold">{formatUds(sincalReferencia)} uds</div>
              </div>
              <div className="bg-white border rounded p-3">
                <div className="text-xs text-gray-500">Salida declarada</div>
                <div className="font-bold">{formatUds(totalSalidaUds)} uds</div>
              </div>

              <div className="bg-white border rounded p-3">
                <div className="text-xs text-gray-500">% Calibrado vs SINCAL</div>
                <div className="font-bold">{porcCal.toFixed(1)}%</div>
              </div>
              <div className="bg-white border rounded p-3">
                <div className="text-xs text-gray-500">% Desecho vs SINCAL</div>
                <div className="font-bold">{porcDes.toFixed(1)}%</div>
              </div>

              <div className="bg-white border rounded p-3 col-span-2">
                <div className="text-xs text-gray-500">Diferencia (salida - SINCAL)</div>
                <div className={`font-bold ${diffVsSincal !== 0 ? 'text-amber-700' : 'text-green-700'}`}>
                  {formatUds(diffVsSincal)} uds
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-600">
              Importante: el sistema solo valida que no excedas el stock SINCAL disponible al confirmar.
            </div>
          </div>

          <div className="border rounded-xl p-4">
            <div className="text-sm font-bold text-gray-700 mb-3">Ingresar calibración</div>

            <div className="space-y-2">
              {lineas.map((l, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-7">
                    <select
                      className="w-full border rounded-lg px-3 py-2"
                      value={l.skuCodigo}
                      onChange={(e) => updateLineaSku(idx, e.target.value)}
                      disabled={saving}
                    >
                      <option value="">Selecciona SKU...</option>
                      {skuOptions.map((s) => (
                        <option key={s.codigo} value={s.codigo}>
                          {s.codigo} — {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <input
                      className="w-full border rounded-lg px-3 py-2 text-right"
                      type="number"
                      value={l.unidades}
                      onChange={(e) => updateLineaUds(idx, n(e.target.value))}
                      disabled={saving}
                      placeholder="Uds"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      className="text-red-700 font-bold"
                      onClick={() => removeLinea(idx)}
                      disabled={saving || lineas.length <= 1}
                      title="Eliminar línea"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold" onClick={addLinea} disabled={saving}>
                + Agregar SKU
              </button>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-gray-600 mb-1">Desecho (kg) en bodega</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                type="number"
                value={desechoKgBodega}
                onChange={(e) => setDesechoKgBodega(n(e.target.value))}
                disabled={saving}
              />
              <div className="text-xs text-gray-600 mt-1">
                Equivale a: <span className="font-bold">{formatUds(desechoUdsBodega)} uds</span> (SKU DES)
              </div>
            </div>

            <div className="mt-3 text-sm">
              Calibrados: <b>{formatUds(totalCalibradoUds)}</b> uds · Desecho: <b>{formatUds(desechoUdsBodega)}</b> uds · Total salida:{' '}
              <b>{formatUds(totalSalidaUds)}</b> uds
            </div>

            {error && <div className="mt-3 text-red-700 font-bold text-sm">{error}</div>}

            <button
              onClick={confirmarCalibracion}
              disabled={saving}
              className={`mt-4 w-full py-3 rounded-lg font-bold text-white ${saving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {saving ? 'Guardando...' : 'Confirmar calibración (mueve stock)'}
            </button>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <button onClick={onClose} disabled={saving} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
