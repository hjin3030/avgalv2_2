// scripts/reconciliarStock.ts

import { collection, getDocs, query, where, doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../src/lib/firebase'  // Usa la ruta relativa correcta

/**
 * Recalcula y actualiza el stock actual de cada SKU
 * a partir de TODOS los movimientos validados.
 * Crea un documento de stock por cada SKU si no existe.
 */
async function reconciliarStockDesdeMovimientos() {
  console.log('🔄 Iniciando reconciliación de stock...')

  // 1. Leer todos los movimientos validados
  const movimientosRef = collection(db, 'movimientos')
  const movimientosSnapshot = await getDocs(movimientosRef)

  // 2. Calcula el balance por SKU solo con vales validados
  const stockPorSku: Record<string, number> = {}

  movimientosSnapshot.forEach((docSnap) => {
    const mov = docSnap.data()
    if (mov.valeEstado !== 'validado') return
    const codigo = mov.skuCodigo
    if (!codigo || codigo === 'undefined') return

    if (!stockPorSku[codigo]) stockPorSku[codigo] = 0

    if (mov.tipo === 'ingreso' || mov.tipo === 'reingreso') stockPorSku[codigo] += mov.cantidad || 0
    else if (mov.tipo === 'egreso') stockPorSku[codigo] -= mov.cantidad || 0
  })

  console.log('📊 Stock calculado por SKU:', stockPorSku)

  // 3. Para cada SKU, crear o actualizar el documento en stock
  const stockRef = collection(db, 'stock')
  let creados = 0
  let actualizados = 0

  for (const [skuCodigo, cantidad] of Object.entries(stockPorSku)) {
    const q = query(stockRef, where('skuCodigo', '==', skuCodigo))
    const stockSnapshot = await getDocs(q)
    let docRef
    if (!stockSnapshot.empty) {
      docRef = stockSnapshot.docs[0].ref
      actualizados++
    } else {
      docRef = doc(stockRef)
      creados++
    }
    await setDoc(docRef, {
      skuCodigo,
      cantidad,
      updatedAt: Timestamp.now()
    }, { merge: true })
    console.log(`✅ ${skuCodigo}: ${cantidad} u.`)
  }

  console.log(`\n🎉 Reconciliación completada:`)
  console.log(`   - Documentos creados: ${creados}`)
  console.log(`   - Documentos actualizados: ${actualizados}`)
  console.log(`   - Total SKUs procesados: ${Object.keys(stockPorSku).length}`)
}

// Ejecuta la función principal
reconciliarStockDesdeMovimientos().catch(console.error)
