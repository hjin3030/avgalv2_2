// frontend/src/utils/stockHelpers.ts

import { doc, updateDoc, increment, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * Formatea un desglose para mostrar en la UI.
 * Ejemplo: { cajas: 10, bandejas: 5, unidades: 12 } → "10C 5B 12U"
 */
export function formatearDesglose(desglose: { cajas: number, bandejas: number, unidades: number }): string {
  if (!desglose) return '-'
  const partes: string[] = []
  if (desglose.cajas > 0) partes.push(`${desglose.cajas}C`)
  if (desglose.bandejas > 0) partes.push(`${desglose.bandejas}B`)
  if (desglose.unidades > 0) partes.push(`${desglose.unidades}U`)
  return partes.length > 0 ? partes.join(' ') : '0U'
}

/**
 * Calcula el desglose de una cantidad en cajas, bandejas y unidades.
 */
export function calcularDesglose(
  cantidad: number,
  unidadesPorCaja: number,
  unidadesPorBandeja: number
): { cajas: number, bandejas: number, unidades: number } {
  const cajas = Math.floor(cantidad / unidadesPorCaja)
  const resto1 = cantidad % unidadesPorCaja
  const bandejas = Math.floor(resto1 / unidadesPorBandeja)
  const unidades = resto1 % unidadesPorBandeja
  return { cajas, bandejas, unidades }
}

/**
 * Aplica un movimiento de stock para un SKU en base a vale.
 * Actualiza Firestore y registra el movimiento para tracking/auditoría.
 */
export async function aplicarMovimiento(
  sku: string,
  cantidad: number,
  tipo: 'ingreso' | 'egreso' | 'reingreso',
  valeId: string
) {
  try {
    const stockRef = doc(db, 'stock', sku)
    const stockSnap = await getDoc(stockRef)

    if (!stockSnap.exists()) {
      // Crear stock si no existe
      await setDoc(stockRef, {
        cantidad: tipo === 'ingreso' ? cantidad : tipo === 'egreso' ? -cantidad : 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    } else {
      // Actualizar stock existente
      await updateDoc(stockRef, {
        cantidad: increment(tipo === 'ingreso'
          ? cantidad
          : tipo === 'egreso'
            ? -cantidad
            : 0),
        updatedAt: Timestamp.now(),
      })
    }

    // Registrar movimiento para historial/auditoría si así lo requiere la app
    const movimientoRef = doc(db, 'movimientos', `${valeId}_${sku}_${Date.now()}`)
    await setDoc(movimientoRef, {
      valeId,
      sku,
      cantidad,
      tipo,
      fecha: Timestamp.now(),
      referencia: 'Validación de Vale',
    })

  } catch (err) {
    // Manejo controlado de errores
    console.error('Error en aplicarMovimiento', err)
    throw err
  }
}
