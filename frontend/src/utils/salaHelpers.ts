// frontend/src/utils/salaHelpers.ts

import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { todayDateString } from '@/utils/formatHelpers'
import { getSkuInfo, getSkuNombre, GRAMOS_POR_UNIDAD } from '@/utils/constants'

type UbicacionSalaL = 'SALA_L'

export type SkuSucioCodigo = 'BLA MAN' | 'COL MAN'
export type SkuSincalCodigo = 'BLA SINCAL' | 'COL SINCAL'

export type DetalleCBU = {
  cajas: number
  bandejas: number
  unidades: number
  totalUnidades: number
}

export type LoteEstado = 'EN_SALA' | 'LAVADO_REGISTRADO' | 'ENVIADO_A_CALIBRAR' | 'CERRADO'

export type LoteLimpieza = {
  id: string // valeId
  loteCodigo: string
  estado: LoteEstado

  valeIngresoId: string
  valeReferencia: string
  fechaVale: string
  correlativoDia: number

  // pabellón (idealmente viene en el vale)
  pabellonId?: string | null
  pabellonNombre?: string | null

  skuCodigoSucio: SkuSucioCodigo
  skuNombreSucio: string

  ingreso: DetalleCBU

  // se completa después
  lavado?: DetalleCBU
  desechoKg?: number
  desechoUnidades?: number
  porcentajeLavado?: number
  porcentajeDesecho?: number

  ubicacion: UbicacionSalaL

  timestampIngresoSalaL: any
  timestampLavado?: any
  timestampIngresoBodega?: any

  createdAt: any
  updatedAt: any
}

function horaChileHHmm(date: Date) {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function clampNonNeg(n: any): number {
  const v = Number(n ?? 0)
  return isNaN(v) ? 0 : Math.max(0, v)
}

export function esSkuSucio(codigo: string): codigo is SkuSucioCodigo {
  return codigo === 'BLA MAN' || codigo === 'COL MAN'
}

export function esSkuSalaLPermitido(codigo: string): codigo is SkuSucioCodigo | SkuSincalCodigo {
  return codigo === 'BLA MAN' || codigo === 'COL MAN' || codigo === 'BLA SINCAL' || codigo === 'COL SINCAL'
}

export function skuSincalDesdeSucio(skuSucio: SkuSucioCodigo): SkuSincalCodigo {
  return skuSucio === 'BLA MAN' ? 'BLA SINCAL' : 'COL SINCAL'
}

export function calcularTotalUnidadesDesdeCBU(skuCodigo: string, cajas: number, bandejas: number, unidades: number): number {
  const info = getSkuInfo(skuCodigo)
  const unidadesPorCaja = info?.unidadesPorCaja ?? 180
  const unidadesPorBandeja = info?.unidadesPorBandeja ?? 30

  return (
    clampNonNeg(cajas) * unidadesPorCaja +
    clampNonNeg(bandejas) * unidadesPorBandeja +
    clampNonNeg(unidades)
  )
}

export function detalleCBU(skuCodigo: string, cajas: number, bandejas: number, unidades: number): DetalleCBU {
  return {
    cajas: clampNonNeg(cajas),
    bandejas: clampNonNeg(bandejas),
    unidades: clampNonNeg(unidades),
    totalUnidades: calcularTotalUnidadesDesdeCBU(skuCodigo, cajas, bandejas, unidades),
  }
}

// Regla: vale sucio = ingreso pendiente con exactamente 1 detalle, y SKU es BLA MAN o COL MAN
export function esValeSucio(vale: any): boolean {
  if (!vale) return false
  if (String(vale.tipo || '').toLowerCase() !== 'ingreso') return false
  if (String(vale.estado || '').toLowerCase() !== 'pendiente') return false
  const detalles = Array.isArray(vale.detalles) ? vale.detalles : []
  if (detalles.length !== 1) return false
  const sku = String(detalles[0]?.sku || '')
  return esSkuSucio(sku)
}

// LoteCodigo legible basado en fecha + correlativo
export function generarLoteCodigo(fechaISO: string, correlativoDia: number): string {
  // Ejemplo: SL-2026-01-14-ING-08
  const n = String(correlativoDia ?? 0).padStart(2, '0')
  return `SL-${fechaISO}-ING-${n}`
}

// Conversión kg -> unidades (60g por huevo = 0.06kg)
export function desechoKgAUnidades(pesoKg: number, redondeo: 'round' | 'floor' | 'ceil' = 'round'): number {
  const kg = Number(pesoKg ?? 0)
  if (!isFinite(kg) || kg <= 0) return 0

  const unidades = (kg * 1000) / Number(GRAMOS_POR_UNIDAD || 60) // GRAMOS_POR_UNIDAD=60
  if (redondeo === 'floor') return Math.floor(unidades)
  if (redondeo === 'ceil') return Math.ceil(unidades)
  return Math.round(unidades)
}

// Upsert stockSalaL/{skuCodigo}
async function upsertStockSalaL(batch: any, skuCodigo: string, skuNombre: string, delta: number, timestamp: any) {
  const ref = doc(db, 'stockSalaL', skuCodigo)
  const snap = await getDoc(ref)

  const actual = snap.exists() ? Number(snap.data().cantidad ?? 0) : 0
  const nuevaCantidad = actual + Number(delta ?? 0)

  if (!snap.exists()) {
    batch.set(ref, {
      activo: true,
      skuCodigo,
      skuNombre,
      cantidad: nuevaCantidad,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  } else {
    batch.update(ref, {
      skuNombre, // por si cambió etiqueta
      cantidad: nuevaCantidad,
      updatedAt: timestamp,
    })
  }
}

// Crea movimiento estándar a colección movimientos
function crearMovimientoSalaL(params: {
  tipo: 'ingreso' | 'egreso' | 'reingreso' | 'ajuste'
  skuCodigo: string
  skuNombre: string
  cantidad: number
  origenId?: string
  origenNombre?: string
  destinoId?: string
  destinoNombre?: string
  valeId?: string
  valeReferencia?: string
  valeEstado?: string
  loteId?: string
  loteCodigo?: string
  usuarioId: string
  usuarioNombre: string
  createdAt: any
  fecha: string
  hora: string
}) {
  return {
    tipo: params.tipo,
    skuCodigo: params.skuCodigo,
    skuNombre: params.skuNombre,
    cantidad: params.cantidad,

    origenId: params.origenId || null,
    origenNombre: params.origenNombre || null,
    destinoId: params.destinoId || null,
    destinoNombre: params.destinoNombre || null,

    valeId: params.valeId || null,
    valeReferencia: params.valeReferencia || null,
    valeEstado: params.valeEstado || null,

    // nuevos campos opcionales
    loteId: params.loteId || null,
    loteCodigo: params.loteCodigo || null,

    fecha: params.fecha,
    hora: params.hora,

    usuarioId: params.usuarioId,
    usuarioNombre: params.usuarioNombre,

    createdAt: params.createdAt,
    timestamp: params.createdAt,
  }
}

// VALIDACIÓN: vale sucio -> entra a Sala L, crea lote, crea movimiento, NO toca stock bodega
export async function validarValeSucio(params: {
  valeId: string
  usuarioValidadorId: string
  usuarioValidadorNombre: string
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const valeRef = doc(db, 'vales', params.valeId)
    const valeSnap = await getDoc(valeRef)

    if (!valeSnap.exists()) return { success: false, error: 'Vale no encontrado' }

    const vale: any = valeSnap.data()

    if (!esValeSucio(vale)) {
      return { success: false, error: 'Este vale no califica como vale sucio (debe ser ingreso pendiente con 1 SKU sucio).' }
    }

    const detalle = vale.detalles[0]
    const skuCodigo = String(detalle.sku) as SkuSucioCodigo
    const skuNombre = String(detalle.skuNombre || getSkuNombre(skuCodigo) || 'Desconocido')

    // El ingreso viene con C/B/U, por lo tanto el total debería estar en detalle.totalUnidades
    const ingreso: DetalleCBU = {
      cajas: clampNonNeg(detalle.cajas),
      bandejas: clampNonNeg(detalle.bandejas),
      unidades: clampNonNeg(detalle.unidades),
      totalUnidades: clampNonNeg(detalle.totalUnidades),
    }

    if (ingreso.totalUnidades <= 0) {
      return { success: false, error: 'El vale sucio no tiene totalUnidades válido.' }
    }

    const hoy = todayDateString()
    const ahora = new Date()
    const timestamp = Timestamp.fromDate(ahora)

    const loteCodigo = generarLoteCodigo(String(vale.fecha || hoy), Number(vale.correlativoDia || 0))
    const valeReferencia = vale.correlativoDia ? `INGRESO #${vale.correlativoDia}` : 'INGRESO'

    // Pabellón: idealmente existe en el vale (desde NuevoValeModal), pero hoy no siempre está persistido
    const pabellonId = vale.pabellonId ?? null
    const pabellonNombre = vale.pabellonNombre ?? null

    const batch = writeBatch(db)

    // 1) actualizar vale a validado (igual que validación normal)
    batch.update(valeRef, {
      estado: 'validado',
      validadoPorId: params.usuarioValidadorId,
      validadoPorNombre: params.usuarioValidadorNombre,
      fechaValidacion: hoy,
      horaValidacion: horaChileHHmm(ahora),
      updatedAt: timestamp,
      // dejamos detalles tal cual (no tocamos)
    })

    // 2) stockSalaL suma SKU sucio
    // (lectura fuera del batch para evitar problemas, pero es ok si estás usando batch con reads previas)
    // Aquí lo hacemos con getDoc previo por helper
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    await upsertStockSalaL(batch as any, skuCodigo, skuNombre, ingreso.totalUnidades, timestamp)

    // 3) lote: docId = valeId (1:1)
    const loteRef = doc(db, 'lotesLimpieza', params.valeId)
    const loteSnap = await getDoc(loteRef)

    const loteData: LoteLimpieza = {
      id: params.valeId,
      loteCodigo,
      estado: 'EN_SALA',

      valeIngresoId: params.valeId,
      valeReferencia,
      fechaVale: String(vale.fecha || hoy),
      correlativoDia: Number(vale.correlativoDia || 0),

      pabellonId,
      pabellonNombre,

      skuCodigoSucio: skuCodigo,
      skuNombreSucio: skuNombre,

      ingreso,

      ubicacion: 'SALA_L',

      timestampIngresoSalaL: timestamp,

      createdAt: loteSnap.exists() ? (loteSnap.data() as any).createdAt || timestamp : timestamp,
      updatedAt: timestamp,
    }

    if (!loteSnap.exists()) batch.set(loteRef, loteData)
    else batch.update(loteRef, { ...loteData, createdAt: (loteSnap.data() as any).createdAt || timestamp })

    // 4) movimiento (ingreso -> Sala L)
    const movRef = doc(collection(db, 'movimientos'))
    batch.set(
      movRef,
      crearMovimientoSalaL({
        tipo: 'ingreso',
        skuCodigo,
        skuNombre,
        cantidad: ingreso.totalUnidades,
        origenId: vale.origenId || 'packing',
        origenNombre: vale.origenNombre || 'Packing',
        destinoId: 'sala_l',
        destinoNombre: 'Sala L',
        valeId: params.valeId,
        valeReferencia,
        valeEstado: 'validado',
        loteId: params.valeId,
        loteCodigo,
        usuarioId: params.usuarioValidadorId,
        usuarioNombre: params.usuarioValidadorNombre,
        createdAt: timestamp,
        fecha: hoy,
        hora: horaChileHHmm(ahora),
      }),
    )

    await batch.commit()
    return { success: true }
  } catch (e: any) {
    console.error('validarValeSucio error:', e)
    return { success: false, error: e?.message || 'Error al validar vale sucio' }
  }
}
