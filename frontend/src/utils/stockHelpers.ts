// src/utils/stockHelpers.ts

import { db } from '@/lib/firebase'
import { doc, getDoc, collection, Timestamp, writeBatch } from 'firebase/firestore'

// Compatibilidad: si ya había imports desde stockHelpers.ts, no se rompen.
export { calcularDesglose, formatearDesglose } from './desgloseHelpers'

type TipoAjuste = 'incrementar' | 'decrementar' | 'establecer'

export async function aplicarAjusteStock(params: {
  skuCodigo: string // docId en /stock
  skuNombre: string
  tipoAjuste: TipoAjuste
  cantidad: number
  razon: string
  observaciones?: string
  usuarioId: string
  usuarioNombre: string
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const {
      skuCodigo,
      skuNombre,
      tipoAjuste,
      cantidad,
      razon,
      observaciones,
      usuarioId,
      usuarioNombre,
    } = params

    if (!skuCodigo?.trim()) return { success: false, error: 'SKU inválido' }
    if (!razon?.trim()) return { success: false, error: 'La razón es obligatoria' }

    const stockRef = doc(db, 'stock', skuCodigo)
    const stockSnap = await getDoc(stockRef)
    const actual = stockSnap.exists() ? Number(stockSnap.data().cantidad ?? 0) : 0

    const qty = Number(cantidad ?? 0)

    let nuevaCantidad = actual
    if (tipoAjuste === 'establecer') nuevaCantidad = qty
    else if (tipoAjuste === 'incrementar') nuevaCantidad = actual + qty
    else if (tipoAjuste === 'decrementar') nuevaCantidad = actual - qty

    const delta = nuevaCantidad - actual

    const ahora = new Date()
    const timestamp = Timestamp.fromDate(ahora)
    const fecha = ahora.toISOString().split('T')[0]
    const hora = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })

    const batch = writeBatch(db)

    // 1) Upsert de stock (set si no existe, update si existe)
    if (!stockSnap.exists()) {
      batch.set(stockRef, {
        skuCodigo,
        skuNombre: skuNombre || 'Desconocido',
        cantidad: nuevaCantidad,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    } else {
      batch.update(stockRef, {
        cantidad: nuevaCantidad,
        updatedAt: timestamp,
      })
    }

    // 2) Movimiento SIEMPRE (aunque el stock no existiera antes)
    const movimientoRef = doc(collection(db, 'movimientos'))
    batch.set(movimientoRef, {
      tipo: 'ajuste',
      skuCodigo,
      skuNombre: skuNombre || 'Desconocido',
      cantidad: delta, // delta real (+ o -)
      origenNombre: 'Sistema',
      destinoNombre: 'Bodega',
      valeId: movimientoRef.id, // no hay vale real; usamos el id del movimiento
      valeReferencia: 'AJUSTE',
      valeEstado: 'validado',
      fecha,
      hora,
      usuarioId,
      usuarioNombre,
      razon: razon.trim(),
      observaciones: observaciones?.trim() || '',
      createdAt: timestamp,
      timestamp, // compat: algunos componentes aún leen timestamp
    })

    await batch.commit()
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al aplicar ajuste' }
  }
}
