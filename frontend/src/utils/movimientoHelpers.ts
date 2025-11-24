// src/utils/movimientosHelpers.ts

import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Movimiento } from '@/types' // Asegúrate de que la ruta es correcta

// Crear movimiento nuevo
export async function crearMovimiento(movimientoData: Partial<Movimiento>) {
  if (!movimientoData.tipo || !movimientoData.skuCodigo || !movimientoData.cantidad || !movimientoData.valeId) {
    throw new Error('Faltan campos obligatorios para crear movimiento')
  }
  return await addDoc(collection(db, 'movimientos'), movimientoData)
}

// Obtener movimientos por SKU
export async function obtenerMovimientosPorSKU(skuCodigo: string): Promise<Movimiento[]> {
  const movRef = collection(db, 'movimientos')
  const q = query(movRef, where('skuCodigo', '==', skuCodigo))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Movimiento))
}

// Calcular stock balance a partir de movimientos validados
export async function calcularBalanceStock(skuCodigo: string): Promise<number> {
  const movimientos = await obtenerMovimientosPorSKU(skuCodigo)
  let balance = 0
  movimientos.forEach(mov => {
    if (mov.valeEstado !== 'validado') return
    if (mov.tipo === 'ingreso' || mov.tipo === 'reingreso') balance += mov.cantidad || 0
    else if (mov.tipo === 'egreso') balance -= mov.cantidad || 0
  })
  return balance
}
