import { db } from '@/lib/firebase'
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore'

export async function limpiarYReconstruirTodo() {
  console.log('🔧 PASO 1/4: Corrigiendo movimientos con signos incorrectos...')
  
  const movimientosSnapshot = await getDocs(collection(db, 'movimientos'))
  const batch1 = writeBatch(db)
  let corregidosCount = 0
  
  movimientosSnapshot.docs.forEach((docSnap) => {
    const mov = docSnap.data()
    let nuevaCantidad = mov.cantidad
    let corregir = false
    
    // INGRESO: debe ser siempre POSITIVO
    if (mov.tipo === 'ingreso' && mov.cantidad < 0) {
      nuevaCantidad = Math.abs(mov.cantidad)
      corregir = true
    }
    
    // EGRESO: debe ser siempre NEGATIVO
    if (mov.tipo === 'egreso' && mov.cantidad > 0) {
      nuevaCantidad = -Math.abs(mov.cantidad)
      corregir = true
    }
    
    // REINGRESO: debe ser siempre POSITIVO
    if (mov.tipo === 'reingreso' && mov.cantidad < 0) {
      nuevaCantidad = Math.abs(mov.cantidad)
      corregir = true
    }
    
    if (corregir) {
      batch1.update(doc(db, 'movimientos', docSnap.id), {
        cantidad: nuevaCantidad
      })
      corregidosCount++
      console.log(`  ✏️ Corrigiendo ${mov.tipo} ${mov.skuCodigo}: ${mov.cantidad} → ${nuevaCantidad}`)
    }
  })
  
  if (corregidosCount > 0) {
    await batch1.commit()
    console.log(`✅ Corregidos ${corregidosCount} movimientos`)
  } else {
    console.log('✅ No hay movimientos que corregir')
  }
  
  console.log('🔧 PASO 2/4: Eliminando documentos de stock corruptos...')
  
  const stockSnapshot = await getDocs(collection(db, 'stock'))
  const batch2 = writeBatch(db)
  let deletedCount = 0
  
  stockSnapshot.docs.forEach((docSnap) => {
    const id = docSnap.id
    const data = docSnap.data()
    
    // Eliminar documentos con guiones (autogenerados) o con cantidad negativa
    if (id.includes('-') || data.cantidad < 0) {
      batch2.delete(doc(db, 'stock', id))
      deletedCount++
      console.log(`  🗑️ Eliminando: ${id} (cantidad: ${data.cantidad})`)
    }
  })
  
  if (deletedCount > 0) {
    await batch2.commit()
    console.log(`✅ Eliminados ${deletedCount} documentos corruptos`)
  }
  
  console.log('🔧 PASO 3/4: Recalculando stock desde movimientos CORREGIDOS...')
  
  // Volver a leer movimientos (ahora corregidos)
  const movimientosSnapshot2 = await getDocs(collection(db, 'movimientos'))
  const stockCalculado: Record<string, number> = {}
  
  movimientosSnapshot2.docs.forEach((docSnap) => {
    const mov = docSnap.data()
    if (!mov.skuCodigo || mov.cantidad === undefined) return
    
    if (!stockCalculado[mov.skuCodigo]) {
      stockCalculado[mov.skuCodigo] = 0
    }
    
    stockCalculado[mov.skuCodigo] += mov.cantidad
  })
  
  console.log('📊 Stock calculado por SKU:')
  Object.entries(stockCalculado).forEach(([sku, cantidad]) => {
    console.log(`  ${sku}: ${cantidad}`)
  })
  
  console.log('🔧 PASO 4/4: Actualizando documentos de stock...')
  
  const stockSnapshot2 = await getDocs(collection(db, 'stock'))
  const batch3 = writeBatch(db)
  const timestamp = new Date()
  const skusActualizados = new Set<string>()
  
  // Actualizar stocks existentes
  stockSnapshot2.docs.forEach((docSnap) => {
    const data = docSnap.data()
    const skuCodigo = data.skuCodigo
    
    if (skuCodigo && stockCalculado[skuCodigo] !== undefined) {
      batch3.update(doc(db, 'stock', docSnap.id), {
        cantidad: stockCalculado[skuCodigo],
        updatedAt: timestamp
      })
      console.log(`  ✅ Actualizado ${skuCodigo}: ${stockCalculado[skuCodigo]}`)
      skusActualizados.add(skuCodigo)
    }
  })
  
  // Crear documentos para SKUs que no existen (solo si cantidad > 0)
  Object.entries(stockCalculado).forEach(([skuCodigo, cantidad]) => {
    if (!skusActualizados.has(skuCodigo) && cantidad >= 0) {
      batch3.set(doc(db, 'stock', skuCodigo), {
        skuCodigo,
        cantidad,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      console.log(`  ➕ Creado ${skuCodigo}: ${cantidad}`)
    }
  })
  
  await batch3.commit()
  console.log('✅ PROCESO COMPLETADO')
  console.log('⚠️ IMPORTANTE: Refresca la página (F5) para ver los cambios')
}
