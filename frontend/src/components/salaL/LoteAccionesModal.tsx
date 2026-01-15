// frontend/src/components/salaL/LoteAccionesModal.tsx

import { useMemo, useState } from 'react'
import { Timestamp, doc, runTransaction, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import type { UserProfile } from '@/types'

type Lote = {
  id: string
  loteCodigo: string
  estado: 'EN_SALA' | 'CERRADO' | string
  skuCodigoSucio: string
  skuNombreSucio: string
  pabellonNombre?: string | null

  ingreso?: { cajas?: number; bandejas?: number; unidades?: number; totalUnidades?: number }

  lavadoTotalUnidades?: number
  desechoKg?: number

  fechaIngresoSalaL?: string
  horaIngresoSalaL?: string
  usuarioIngresoSalaLNombre?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  lote: Lote
}

function horaChileHHmm(date: Date) {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function fmtDesglose(total: number, d?: { cajas?: number; bandejas?: number; unidades?: number }) {
  const cajas = Number(d?.cajas ?? 0)
  const bandejas = Number(d?.bandejas ?? 0)
  const unidades = Number(d?.unidades ?? 0)
  const partes: string[] = []
  if (cajas) partes.push(`${cajas}C`)
  if (bandejas) partes.push(`${bandejas}B`)
  if (unidades) partes.push(`${unidades}U`)
  return partes.length ? `${total} (${partes.join(', ')})` : String(total)
}

export default function LoteAccionesModal({ isOpen, onClose, onSaved, lote }: Props) {
  const { profile } = useAuth() as { profile: UserProfile | null }
  const [tab, setTab] = useState<'lavado' | 'desecho' | 'bodega' | 'cerrar'>('lavado')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [lavC, setLavC] = useState(0)
  const [lavB, setLavB] = useState(0)
  const [lavU, setLavU] = useState(0)

  const [desechoKg, setDesechoKg] = useState(0)

  const lavadoTotal = useMemo(() => Number(lavC) * 360 + Number(lavB) * 30 + Number(lavU), [lavC, lavB, lavU])

  const saldoActual = useMemo(() => {
    const ingreso = Number(lote.ingreso?.totalUnidades ?? 0)
    const lavado = Number(lote.lavadoTotalUnidades ?? 0)
    const usado = 0 // reservado para cuando implementemos “salidas” por evento
    return ingreso - usado
  }, [lote.ingreso?.totalUnidades, lote.lavadoTotalUnidades])

  if (!isOpen) return null

  const guardarEvento = async (evento: any) => {
    const ref = doc(collection(db, 'lotesLimpieza', lote.id, 'eventos'))
    return { ref, data: evento }
  }

  const onRegistrarLavado = async () => {
    if (lavadoTotal <= 0) {
      setError('Debe ingresar un lavado > 0')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const ahora = new Date()
      const ts = Timestamp.fromDate(ahora)
      const fecha = ahora.toISOString().split('T')[0]
      const hora = horaChileHHmm(ahora)

      await runTransaction(db, async (tx) => {
        const loteRef = doc(db, 'lotesLimpieza', lote.id)
        const loteSnap = await tx.get(loteRef)
        if (!loteSnap.exists()) throw new Error('Lote no existe')

        const data = loteSnap.data() as any
        const lavadoPrev = Number(data.lavadoTotalUnidades ?? 0)
        const lavadoNuevo = lavadoPrev + lavadoTotal

        // evento
        const { ref: evRef, data: evData } = await guardarEvento({
          tipo: 'LAVADO_REGISTRADO',
          cajas: Number(lavC),
          bandejas: Number(lavB),
          unidades: Number(lavU),
          totalUnidades: lavadoTotal,
          fecha,
          hora,
          usuarioId: profile?.uid || '',
          usuarioNombre: profile?.nombre || '',
          createdAt: ts,
        })

        // writes
        tx.set(evRef, evData)
        tx.update(loteRef, {
          lavadoTotalUnidades: lavadoNuevo,
          updatedAt: ts,
        })
      })

      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Error al registrar lavado')
    } finally {
      setLoading(false)
    }
  }

  const onRegistrarDesecho = async () => {
    if (Number(desechoKg) <= 0) {
      setError('Debe ingresar desecho > 0 kg')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const ahora = new Date()
      const ts = Timestamp.fromDate(ahora)
      const fecha = ahora.toISOString().split('T')[0]
      const hora = horaChileHHmm(ahora)

      await runTransaction(db, async (tx) => {
        const loteRef = doc(db, 'lotesLimpieza', lote.id)
        const loteSnap = await tx.get(loteRef)
        if (!loteSnap.exists()) throw new Error('Lote no existe')

        const data = loteSnap.data() as any
        const prev = Number(data.desechoKg ?? 0)
        const nuevo = prev + Number(desechoKg)

        const { ref: evRef, data: evData } = await guardarEvento({
          tipo: 'DESECHO_REGISTRADO',
          kg: Number(desechoKg),
          fecha,
          hora,
          usuarioId: profile?.uid || '',
          usuarioNombre: profile?.nombre || '',
          createdAt: ts,
        })

        tx.set(evRef, evData)
        tx.update(loteRef, { desechoKg: nuevo, updatedAt: ts })
      })

      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Error al registrar desecho')
    } finally {
      setLoading(false)
    }
  }

  const onEnviarBodega = async () => {
    // propuesta base: enviar TODO lo lavado acumulado a bodega.
    setLoading(true)
    setError(null)

    try {
      const ahora = new Date()
      const ts = Timestamp.fromDate(ahora)
      const fecha = ahora.toISOString().split('T')[0]
      const hora = horaChileHHmm(ahora)

      await runTransaction(db, async (tx) => {
        const loteRef = doc(db, 'lotesLimpieza', lote.id)
        const loteSnap = await tx.get(loteRef)
        if (!loteSnap.exists()) throw new Error('Lote no existe')

        const data = loteSnap.data() as any
        const lavado = Number(data.lavadoTotalUnidades ?? 0)
        if (lavado <= 0) throw new Error('No hay lavado registrado para enviar a bodega')

        // mover stock: stockSalaL -> stock
        const skuLavado =
          data.skuCodigoLavado ||
          (data.skuCodigoSucio === 'BLA MAN' ? 'BLA SINCAL' : data.skuCodigoSucio === 'COL MAN' ? 'COL SINCAL' : null)

        if (!skuLavado) throw new Error('No se pudo determinar SKU lavado')

        const stockSalaLRef = doc(db, 'stockSalaL', skuLavado)
        const stockBodegaRef = doc(db, 'stock', skuLavado)

        // READS
        const salaSnap = await tx.get(stockSalaLRef)
        const bodSnap = await tx.get(stockBodegaRef)

        const salaActual = salaSnap.exists() ? Number(salaSnap.data().cantidad ?? 0) : 0
        if (salaActual < lavado) throw new Error('Stock Sala L insuficiente para enviar')

        const bodegaActual = bodSnap.exists() ? Number(bodSnap.data().cantidad ?? 0) : 0

        // evento
        const { ref: evRef, data: evData } = await guardarEvento({
          tipo: 'ENVIADO_A_BODEGA',
          skuCodigo: skuLavado,
          totalUnidades: lavado,
          fecha,
          hora,
          usuarioId: profile?.uid || '',
          usuarioNombre: profile?.nombre || '',
          createdAt: ts,
        })

        // WRITES
        tx.set(evRef, evData)
        tx.update(stockSalaLRef, { cantidad: salaActual - lavado, updatedAt: ts })
        if (bodSnap.exists()) tx.update(stockBodegaRef, { cantidad: bodegaActual + lavado, updatedAt: ts })
        else {
          tx.set(stockBodegaRef, {
            skuCodigo: skuLavado,
            skuNombre: data.skuNombreLavado || data.skuNombreSucio || '',
            cantidad: bodegaActual + lavado,
            createdAt: ts,
            updatedAt: ts,
          })
        }

        // lote update
        tx.update(loteRef, {
          estado: 'CERRADO', // propuesta: al enviar a bodega se cierra
          skuCodigoLavado: skuLavado,
          updatedAt: ts,
        })
      })

      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Error al enviar a bodega')
    } finally {
      setLoading(false)
    }
  }

  const onCerrarLote = async () => {
    setLoading(true)
    setError(null)

    try {
      const ahora = new Date()
      const ts = Timestamp.fromDate(ahora)
      const fecha = ahora.toISOString().split('T')[0]
      const hora = horaChileHHmm(ahora)

      await runTransaction(db, async (tx) => {
        const loteRef = doc(db, 'lotesLimpieza', lote.id)
        const loteSnap = await tx.get(loteRef)
        if (!loteSnap.exists()) throw new Error('Lote no existe')

        const { ref: evRef, data: evData } = await guardarEvento({
          tipo: 'LOTE_CERRADO',
          fecha,
          hora,
          usuarioId: profile?.uid || '',
          usuarioNombre: profile?.nombre || '',
          createdAt: ts,
        })

        tx.set(evRef, evData)
        tx.update(loteRef, { estado: 'CERRADO', updatedAt: ts })
      })

      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Error al cerrar lote')
    } finally {
      setLoading(false)
    }
  }

  const ingresoTotal = Number(lote.ingreso?.totalUnidades ?? 0)

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 bg-gradient-to-r from-slate-700 to-slate-900 text-white flex justify-between items-center">
          <div>
            <div className="text-xl font-bold">Lote {lote.loteCodigo}</div>
            <div className="text-slate-200 text-sm">
              {lote.skuCodigoSucio} — {lote.skuNombreSucio} · Ingreso: {fmtDesglose(ingresoTotal, lote.ingreso)}
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="text-white hover:text-slate-200 text-3xl font-bold">
            ×
          </button>
        </div>

        <div className="p-4 border-b flex gap-2 bg-gray-50">
          <button className={`px-3 py-2 rounded ${tab === 'lavado' ? 'bg-blue-600 text-white' : 'bg-white border'}`} onClick={() => setTab('lavado')}>
            Lavado
          </button>
          <button className={`px-3 py-2 rounded ${tab === 'desecho' ? 'bg-blue-600 text-white' : 'bg-white border'}`} onClick={() => setTab('desecho')}>
            Desecho
          </button>
          <button className={`px-3 py-2 rounded ${tab === 'bodega' ? 'bg-blue-600 text-white' : 'bg-white border'}`} onClick={() => setTab('bodega')}>
            Enviar a bodega
          </button>
          <button className={`px-3 py-2 rounded ${tab === 'cerrar' ? 'bg-blue-600 text-white' : 'bg-white border'}`} onClick={() => setTab('cerrar')}>
            Cerrar
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {tab === 'lavado' && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Registrar lavado (se suma al acumulado). Total = cajas*360 + bandejas*30 + unidades.
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">Cajas</label>
                  <input type="number" className="w-full border rounded px-3 py-2" value={lavC} onChange={(e) => setLavC(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Bandejas</label>
                  <input type="number" className="w-full border rounded px-3 py-2" value={lavB} onChange={(e) => setLavB(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Unidades</label>
                  <input type="number" className="w-full border rounded px-3 py-2" value={lavU} onChange={(e) => setLavU(Number(e.target.value))} />
                </div>
              </div>

              <div className="text-sm">
                Total lavado: <b>{fmtDesglose(lavadoTotal, { cajas: lavC, bandejas: lavB, unidades: lavU })}</b>
              </div>

              {error && <div className="text-red-600 font-bold">{error}</div>}

              <button
                onClick={onRegistrarLavado}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded"
              >
                {loading ? 'Procesando...' : 'Guardar lavado'}
              </button>
            </div>
          )}

          {tab === 'desecho' && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">Registrar desecho en kg (se suma al acumulado).</div>

              <div>
                <label className="block text-sm font-semibold mb-1">Desecho (kg)</label>
                <input type="number" className="w-full border rounded px-3 py-2" value={desechoKg} onChange={(e) => setDesechoKg(Number(e.target.value))} />
              </div>

              {error && <div className="text-red-600 font-bold">{error}</div>}

              <button
                onClick={onRegistrarDesecho}
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded"
              >
                {loading ? 'Procesando...' : 'Guardar desecho'}
              </button>
            </div>
          )}

          {tab === 'bodega' && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Propuesta: enviar a bodega el total lavado acumulado (y cerrar el lote).
              </div>

              <div className="text-sm">
                Saldo estimado lote (ingreso): <b>{saldoActual}</b> unidades.
              </div>

              {error && <div className="text-red-600 font-bold">{error}</div>}

              <button
                onClick={onEnviarBodega}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded"
              >
                {loading ? 'Procesando...' : 'Enviar a bodega y cerrar lote'}
              </button>
            </div>
          )}

          {tab === 'cerrar' && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">Cierra el lote manualmente (sin mover stock).</div>

              {error && <div className="text-red-600 font-bold">{error}</div>}

              <button
                onClick={onCerrarLote}
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded"
              >
                {loading ? 'Procesando...' : 'Cerrar lote'}
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 text-xs text-gray-600">
          Ingreso Sala L: {lote.fechaIngresoSalaL || '-'} {lote.horaIngresoSalaL || ''} · {lote.usuarioIngresoSalaLNombre || '-'}
        </div>
      </div>
    </div>
  )
}
