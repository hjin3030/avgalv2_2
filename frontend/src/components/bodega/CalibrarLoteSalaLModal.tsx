import { useMemo, useState } from 'react'
import { collection, doc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { GRAMOS_POR_UNIDAD, getSkuInfo } from '@/utils/constants'
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
  cajas: number
  bandejas: number
  unidades: number
}

function n(v: any): number {
  const x = Number(v ?? 0)
  return Number.isFinite(x) ? x : 0
}

function int0(v: any): number {
  return Math.max(0, Math.trunc(n(v)))
}

function formatUds(v: any) {
  return n(v).toLocaleString('es-CL')
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

// MAN (origen real que se rebaja)
function inferSkuManDesdeSucio(skuCodigoSucio: string) {
  const sku = String(skuCodigoSucio || '').toUpperCase()
  if (sku.startsWith('BLA')) return 'BLA MAN'
  if (sku.startsWith('COL')) return 'COL MAN'
  return 'BLA MAN'
}

function nombreSkuBasico(codigo: string) {
  if (codigo === 'BLA SINCAL') return 'blanco sin calibrar'
  if (codigo === 'COL SINCAL') return 'color sin calibrar'
  if (codigo === 'BLA MAN') return 'blanco manual'
  if (codigo === 'COL MAN') return 'color manual'
  if (codigo === 'DES') return 'desecho'
  if (codigo === 'OTRO') return 'otro'
  return codigo
}

function horaChileHHmm(date: Date) {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

function getUdsPorCaja(skuCodigo: string) {
  return getSkuInfo(skuCodigo)?.unidadesPorCaja ?? 180
}

function getUdsPorBandeja(skuCodigo: string) {
  return getSkuInfo(skuCodigo)?.unidadesPorBandeja ?? 30
}

function totalUdsDesdeCBU(skuCodigo: string, cajas: any, bandejas: any, unidades: any) {
  const udsCaja = getUdsPorCaja(skuCodigo)
  const udsBandeja = getUdsPorBandeja(skuCodigo)
  return int0(cajas) * udsCaja + int0(bandejas) * udsBandeja + int0(unidades)
}

function desglosarCBU(skuCodigo: string, totalUds: number) {
  const udsCaja = getUdsPorCaja(skuCodigo)
  const udsBandeja = getUdsPorBandeja(skuCodigo)

  const t = Math.max(0, Math.trunc(n(totalUds)))
  const cajas = Math.floor(t / udsCaja)
  const resto1 = t - cajas * udsCaja
  const bandejas = Math.floor(resto1 / udsBandeja)
  const unidades = resto1 - bandejas * udsBandeja
  return { cajas, bandejas, unidades }
}

function formatCBU(skuCodigo: string, totalUds: number) {
  const d = desglosarCBU(skuCodigo, totalUds)
  return `${d.cajas}C · ${d.bandejas}B · ${d.unidades}U`
}

export default function CalibrarLoteSalaLModal(props: {
  isOpen: boolean
  onClose: () => void
  lote: LoteLimpieza | null
  skuOptions: Array<{ codigo: string; nombre: string }>
}) {
  const { isOpen, onClose, lote, skuOptions } = props
  const { profile } = useAuth() as { profile: UserProfile | null }

  const [lineas, setLineas] = useState<LineaCalibracion[]>([
    { skuCodigo: '', skuNombre: '', cajas: 0, bandejas: 0, unidades: 0 }
  ])
  const [desechoKgBodega, setDesechoKgBodega] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Evitar romper hooks cuando el modal está cerrado
  const loteSafe = lote ??
    ({
      id: '',
      loteCodigo: '',
      estado: '',
      skuCodigoSucio: ''
    } as LoteLimpieza)

  const skuSincal = loteSafe.skuDestinoSincal || inferSkuSincalDesdeSucio(loteSafe.skuCodigoSucio)
  const skuManOrigen = inferSkuManDesdeSucio(loteSafe.skuCodigoSucio)

  // MAN del lote (lo que se rebaja) — fuente: ingreso.totalUnidades
  const manLoteUds = useMemo(() => n(loteSafe.ingreso?.totalUnidades), [loteSafe])

  // SINCAL generado por Sala L (neto) — fuente: netoSincal o lavado.totalUnidades
  const sincalGeneradoUds = useMemo(() => {
    if (typeof loteSafe.netoSincal === 'number') return n(loteSafe.netoSincal)
    if (loteSafe.lavado?.totalUnidades != null) return n(loteSafe.lavado.totalUnidades)
    return 0
  }, [loteSafe])

  // Desecho Sala L (ya viene en uds; si no viene, derivar de kg si existiera)
  const desechoSalaLUds = useMemo(() => {
    if (loteSafe.desechoUnidades != null) return n(loteSafe.desechoUnidades)
    if (loteSafe.desechoKg != null) return udsDesdeKg(loteSafe.desechoKg)
    return 0
  }, [loteSafe])

  // Referencia MAN → (SINCAL + DES Sala L) solo para mostrar
  const referenciaSalidaDesdeMan = useMemo(
    () => sincalGeneradoUds + desechoSalaLUds,
    [sincalGeneradoUds, desechoSalaLUds]
  )

  const desechoUdsBodega = useMemo(() => udsDesdeKg(desechoKgBodega), [desechoKgBodega])

  const lineasLimpias = useMemo(() => {
    return lineas
      .map((l) => {
        const skuCodigo = String(l.skuCodigo || '').trim()
        const skuNombre = String(l.skuNombre || nombreSkuBasico(l.skuCodigo)).trim()
        const unidades = totalUdsDesdeCBU(skuCodigo, l.cajas, l.bandejas, l.unidades)
        return { skuCodigo, skuNombre, unidades }
      })
      .filter((l) => l.skuCodigo && l.unidades > 0)
  }, [lineas])

  const totalCalibradoUds = useMemo(() => lineasLimpias.reduce((sum, l) => sum + l.unidades, 0), [lineasLimpias])
  const totalSalidaSincalUds = useMemo(
    () => totalCalibradoUds + desechoUdsBodega,
    [totalCalibradoUds, desechoUdsBodega]
  )

  const porcCal = useMemo(() => pct(totalCalibradoUds, sincalGeneradoUds), [totalCalibradoUds, sincalGeneradoUds])
  const porcDes = useMemo(() => pct(desechoUdsBodega, sincalGeneradoUds), [desechoUdsBodega, sincalGeneradoUds])

  // retorno temprano después de hooks
  if (!isOpen || !lote) return null

  const addLinea = () =>
    setLineas((prev) => [...prev, { skuCodigo: '', skuNombre: '', cajas: 0, bandejas: 0, unidades: 0 }])

  const removeLinea = (idx: number) => setLineas((prev) => prev.filter((_, i) => i !== idx))

  const updateLineaSku = (idx: number, skuCodigo: string) => {
    const opt = skuOptions.find((s) => s.codigo === skuCodigo)
    setLineas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, skuCodigo, skuNombre: opt?.nombre || nombreSkuBasico(skuCodigo) } : l))
    )
  }

  const updateLineaField = (
    idx: number,
    field: keyof Pick<LineaCalibracion, 'cajas' | 'bandejas' | 'unidades'>,
    v: any
  ) => {
    const value = int0(v)
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }

  const validarBasico = async () => {
    if (!profile?.uid || !profile?.nombre) return 'No hay usuario autenticado.'
    if (!lote?.id) return 'Lote inválido.'
    if (lineasLimpias.length === 0) return 'Debes ingresar al menos 1 SKU calibrado con cantidad > 0.'
    if (lineasLimpias.some((l) => l.skuCodigo === skuSincal)) return 'No puedes calibrar hacia un SKU SINCAL.'
    if (lineasLimpias.some((l) => l.skuCodigo === 'DES')) return 'El DES se ingresa en el campo de desecho (kg).'
    if (n(desechoKgBodega) < 0) return 'Desecho (kg) no puede ser negativo.'
    if (totalSalidaSincalUds <= 0) return 'Total salida desde SINCAL debe ser > 0.'
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

      await runTransaction(db, async (tx) => {
        // =========================
        // (A) READS: TODO PRIMERO
        // =========================
        const loteRef = doc(db, 'lotesLimpieza', lote.id)
        const loteSnap = await tx.get(loteRef)
        if (!loteSnap.exists()) throw new Error('Lote no existe')
        const data = loteSnap.data() as any
        if (data.calibracion?.timestampCalibracion) throw new Error('Este lote ya fue calibrado y no puede recalibrarse.')

        const stockManRef = doc(db, 'stock', skuManOrigen)
        const stockSincalRef = doc(db, 'stock', skuSincal)
        const stockDesRef = doc(db, 'stock', 'DES')

        const stockManSnap = await tx.get(stockManRef)
        const stockSincalSnap = await tx.get(stockSincalRef)
        const stockDesSnap = await tx.get(stockDesRef)

        const stockManActual = stockManSnap.exists() ? n((stockManSnap.data() as any).cantidad) : 0
        const stockSincalActual = stockSincalSnap.exists() ? n((stockSincalSnap.data() as any).cantidad) : 0
        const stockDesActual = stockDesSnap.exists() ? n((stockDesSnap.data() as any).cantidad) : 0

        // leer todos los stocks destino ANTES de escribir
        const destinoRefs = lineasLimpias.map((d) => doc(db, 'stock', d.skuCodigo))
        const destinoSnaps = await Promise.all(destinoRefs.map((r) => tx.get(r)))

        const destinoActualMap: Record<string, number> = {}
        destinoSnaps.forEach((snap, idx) => {
          const codigo = lineasLimpias[idx]?.skuCodigo
          destinoActualMap[codigo] = snap.exists() ? n((snap.data() as any).cantidad) : 0
        })

        // =========================
        // (B) WRITES: DESPUÉS
        // =========================

        // (1) Rebajar MAN del lote (sin bloqueo)
        tx.set(
          stockManRef,
          {
            skuCodigo: skuManOrigen,
            skuNombre: nombreSkuBasico(skuManOrigen),
            cantidad: stockManActual - manLoteUds,
            updatedAt: ts,
            ...(stockManSnap.exists() ? {} : { createdAt: ts })
          },
          { merge: true }
        )

        // (2) Generar SINCAL neto (sin bloqueo)
        tx.set(
          stockSincalRef,
          {
            skuCodigo: skuSincal,
            skuNombre: nombreSkuBasico(skuSincal),
            cantidad: stockSincalActual + sincalGeneradoUds,
            updatedAt: ts,
            ...(stockSincalSnap.exists() ? {} : { createdAt: ts })
          },
          { merge: true }
        )

        // (3) Sumar DES Sala L
        if (desechoSalaLUds > 0) {
          tx.set(
            stockDesRef,
            {
              skuCodigo: 'DES',
              skuNombre: nombreSkuBasico('DES'),
              cantidad: stockDesActual + desechoSalaLUds,
              updatedAt: ts,
              ...(stockDesSnap.exists() ? {} : { createdAt: ts })
            },
            { merge: true }
          )
        }

        // (4) Consumir desde SINCAL lo que se calibra + DES bodega (sin bloqueo)
        const sincalDisponibleEnTx = stockSincalActual + sincalGeneradoUds
        tx.set(
          stockSincalRef,
          {
            skuCodigo: skuSincal,
            skuNombre: nombreSkuBasico(skuSincal),
            cantidad: sincalDisponibleEnTx - totalSalidaSincalUds,
            updatedAt: ts,
            ...(stockSincalSnap.exists() ? {} : { createdAt: ts })
          },
          { merge: true }
        )

        // (5) Sumar SKUs calibrados finales (usando mapa leído antes)
        for (const d of lineasLimpias) {
          const sRef = doc(db, 'stock', d.skuCodigo)
          const actual = destinoActualMap[d.skuCodigo] ?? 0
          tx.set(
            sRef,
            {
              skuCodigo: d.skuCodigo,
              skuNombre: d.skuNombre || nombreSkuBasico(d.skuCodigo),
              cantidad: actual + d.unidades,
              updatedAt: ts
              // createdAt se agrega solo si el doc no existía; no lo sabemos acá sin guardar exists(),
              // pero no es crítico. Si lo necesitas exacto, guardamos `existsMap` al leer.
            },
            { merge: true }
          )
        }

        // (6) Sumar DES bodega (por calibración) — usa stockDesActual leído antes
        if (desechoUdsBodega > 0) {
          const desBase = stockDesActual + (desechoSalaLUds > 0 ? desechoSalaLUds : 0)
          tx.set(
            stockDesRef,
            {
              skuCodigo: 'DES',
              skuNombre: nombreSkuBasico('DES'),
              cantidad: desBase + desechoUdsBodega,
              updatedAt: ts,
              ...(stockDesSnap.exists() ? {} : { createdAt: ts })
            },
            { merge: true }
          )
        }

        // (7) Guardar snapshot calibración en el lote
        tx.update(loteRef, {
          estado: 'CALIBRADO_OK',
          calibracion: {
            detalles: lineasLimpias,
            desechoKg: n(desechoKgBodega),
            desechoUnidades: desechoUdsBodega,
            totalCalibradoUnidades: totalCalibradoUds,
            totalSalidaUnidades: totalSalidaSincalUds,
            porcCalibradoVsSincal: porcCal,
            porcDesechoVsSincal: porcDes,
            timestampCalibracion: ts,
            usuarioId: profile!.uid,
            usuarioNombre: profile!.nombre
          },
          updatedAt: ts
        })

        // (8) Evento lote
        const evRef = doc(collection(db, 'lotesLimpieza', lote.id, 'eventos'))
        tx.set(evRef, {
          tipo: 'CALIBRACION_CONFIRMADA',
          skuManOrigen,
          manLoteUds,
          skuSincalGenerado: skuSincal,
          sincalGeneradoUds,
          desechoSalaLUds,
          totalSalidaSincalUds,
          porcCalibradoVsSincalGenerado: porcCal,
          porcDesechoVsSincalGenerado: porcDes,
          desechoKgBodega: n(desechoKgBodega),
          desechoUdsBodega,
          detalles: lineasLimpias,
          fecha,
          hora,
          usuarioId: profile!.uid,
          usuarioNombre: profile!.nombre,
          createdAt: ts
        })

        // (9) Movimientos
        const movManOutRef = doc(collection(db, 'movimientos'))
        tx.set(movManOutRef, {
          tipo: 'egreso',
          skuCodigo: skuManOrigen,
          skuNombre: nombreSkuBasico(skuManOrigen),
          cantidad: -manLoteUds,
          origenNombre: 'Bodega (MAN)',
          destinoNombre: 'Sala L (Lavado)',
          valeId: lote.id,
          valeReferencia: lote.loteCodigo || lote.id,
          valeEstado: 'validado',
          loteId: lote.id,
          fecha,
          hora,
          usuarioId: profile!.uid,
          usuarioNombre: profile!.nombre,
          createdAt: serverTimestamp(),
          timestamp: serverTimestamp()
        })

        const movSincalInRef = doc(collection(db, 'movimientos'))
        tx.set(movSincalInRef, {
          tipo: 'ingreso',
          skuCodigo: skuSincal,
          skuNombre: nombreSkuBasico(skuSincal),
          cantidad: sincalGeneradoUds,
          origenNombre: 'Sala L (Lavado)',
          destinoNombre: 'Bodega (SINCAL)',
          valeId: lote.id,
          valeReferencia: lote.loteCodigo || lote.id,
          valeEstado: 'validado',
          loteId: lote.id,
          fecha,
          hora,
          usuarioId: profile!.uid,
          usuarioNombre: profile!.nombre,
          createdAt: serverTimestamp(),
          timestamp: serverTimestamp()
        })

        if (desechoSalaLUds > 0) {
          const movDesSalaLRef = doc(collection(db, 'movimientos'))
          tx.set(movDesSalaLRef, {
            tipo: 'ingreso',
            skuCodigo: 'DES',
            skuNombre: nombreSkuBasico('DES'),
            cantidad: desechoSalaLUds,
            origenNombre: 'Sala L (Desecho lavado)',
            destinoNombre: 'Bodega (DES)',
            valeId: lote.id,
            valeReferencia: lote.loteCodigo || lote.id,
            valeEstado: 'validado',
            loteId: lote.id,
            metadata: { origen: 'SALA_L', desechoKgSalaL: n(lote.desechoKg ?? 0), gramosPorUnidad: GRAMOS_POR_UNIDAD },
            fecha,
            hora,
            usuarioId: profile!.uid,
            usuarioNombre: profile!.nombre,
            createdAt: serverTimestamp(),
            timestamp: serverTimestamp()
          })
        }

        const movSincalOutRef = doc(collection(db, 'movimientos'))
        tx.set(movSincalOutRef, {
          tipo: 'egreso',
          skuCodigo: skuSincal,
          skuNombre: nombreSkuBasico(skuSincal),
          cantidad: -totalSalidaSincalUds,
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
          timestamp: serverTimestamp()
        })

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
            timestamp: serverTimestamp()
          })
        }

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
            timestamp: serverTimestamp()
          })
        }
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
              Origen real: {skuManOrigen} ({formatUds(manLoteUds)} uds) → Genera: {skuSincal} ({formatUds(
                sincalGeneradoUds
              )} uds) + DES Sala L ({formatUds(desechoSalaLUds)} uds)
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
              <b>SINCAL</b> (generado) se distribuye en calibrados + DES (bodega). No se fuerza cuadratura.
            </div>
            <div className="text-xs text-gray-500 mt-2">Conversión: 1 unidad = {GRAMOS_POR_UNIDAD} g.</div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white border rounded p-3">
                <div className="text-xs text-gray-500">MAN lote (se rebaja)</div>
                <div className="font-bold">
                  {formatUds(manLoteUds)} uds{' '}
                  <span className="text-gray-600 font-normal">({formatCBU(skuManOrigen, manLoteUds)})</span>
                </div>
              </div>

              <div className="bg-white border rounded p-3">
                <div className="text-xs text-gray-500">SINCAL generado (Sala L)</div>
                <div className="font-bold">
                  {formatUds(sincalGeneradoUds)} uds{' '}
                  <span className="text-gray-600 font-normal">({formatCBU(skuSincal, sincalGeneradoUds)})</span>
                </div>
              </div>

              <div className="bg-white border rounded p-3">
                <div className="text-xs text-gray-500">Salida desde SINCAL (declarada)</div>
                <div className="font-bold">{formatUds(totalSalidaSincalUds)} uds</div>
              </div>

              <div className="bg-white border rounded p-3">
                <div className="text-xs text-gray-500">Referencia MAN → (SINCAL + DES Sala L)</div>
                <div className="font-bold">{formatUds(referenciaSalidaDesdeMan)} uds</div>
              </div>

              <div className="bg-white border rounded p-3">
                <div className="text-xs text-gray-500">% Calibrado vs SINCAL generado</div>
                <div className="font-bold">{porcCal.toFixed(1)}%</div>
              </div>

              <div className="bg-white border rounded p-3">
                <div className="text-xs text-gray-500">% Desecho bodega vs SINCAL generado</div>
                <div className="font-bold">{porcDes.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          <div className="border rounded-xl p-4">
            <div className="text-sm font-bold text-gray-700 mb-3">Ingresar calibración</div>

            <div className="space-y-2">
              {lineas.map((l, idx) => {
                const totalLineaUds = totalUdsDesdeCBU(l.skuCodigo, l.cajas, l.bandejas, l.unidades)
                const udsCaja = getUdsPorCaja(l.skuCodigo)
                const udsBandeja = getUdsPorBandeja(l.skuCodigo)

                return (
                  <div key={idx} className="border rounded-lg p-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
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

                      <div className="col-span-4 text-right text-xs text-gray-600">
                        Total: <span className="font-bold">{formatUds(totalLineaUds)} uds</span>
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

                    <div className="grid grid-cols-12 gap-2 mt-2">
                      <div className="col-span-4">
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">
                          Cajas ({udsCaja}U)
                        </label>
                        <input
                          className="w-full border rounded-lg px-3 py-2 text-right"
                          type="number"
                          value={l.cajas}
                          onChange={(e) => updateLineaField(idx, 'cajas', e.target.value)}
                          disabled={saving}
                          min={0}
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">
                          Bandejas ({udsBandeja}U)
                        </label>
                        <input
                          className="w-full border rounded-lg px-3 py-2 text-right"
                          type="number"
                          value={l.bandejas}
                          onChange={(e) => updateLineaField(idx, 'bandejas', e.target.value)}
                          disabled={saving}
                          min={0}
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Unidades</label>
                        <input
                          className="w-full border rounded-lg px-3 py-2 text-right"
                          type="number"
                          value={l.unidades}
                          onChange={(e) => updateLineaField(idx, 'unidades', e.target.value)}
                          disabled={saving}
                          min={0}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              <button
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold"
                onClick={addLinea}
                disabled={saving}
              >
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
            </div>

            <div className="mt-3 text-sm">
              Calibrados: <b>{formatUds(totalCalibradoUds)}</b> uds · Total salida desde SINCAL:{' '}
              <b>{formatUds(totalSalidaSincalUds)}</b> uds
            </div>

            {error && <div className="mt-3 text-red-700 font-bold text-sm">{error}</div>}

            <button
              onClick={confirmarCalibracion}
              disabled={saving}
              className={`mt-4 w-full py-3 rounded-lg font-bold text-white ${
                saving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {saving ? 'Guardando...' : 'Confirmar calibración (mueve stock)'}
            </button>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
