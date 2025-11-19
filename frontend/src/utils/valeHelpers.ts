import { db } from '@/lib/firebase'
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  runTransaction,
  Timestamp,
  getDoc
} from 'firebase/firestore'
import { todayDateString } from './formatHelpers'

interface DetalleVale {
  sku: string
  skuNombre?: string
  cajas: number
  bandejas: number
  unidades: number
  totalUnidades: number
}

interface CrearValeParams {
  tipo: 'ingreso' | 'egreso' | 'reingreso'
  origenId: string
  origenNombre: string
  destinoId: string
  destinoNombre: string
  transportistaId?: string
  transportistaNombre?: string
  detalles: DetalleVale[]
  comentario?: string
  usuarioCreadorId: string
  usuarioCreadorNombre: string
}

export async function crearVale(params: CrearValeParams): Promise<string> {
  const {
    tipo,
    origenId,
    origenNombre,
    destinoId,
    destinoNombre,
    transportistaId,
    transportistaNombre,
    detalles,
    comentario,
    usuarioCreadorId,
    usuarioCreadorNombre
  } = params

  if (
    !tipo ||
    !origenId || origenId.trim() === '' ||
    !origenNombre || origenNombre.trim() === '' ||
    !destinoId || destinoId.trim() === '' ||
    !destinoNombre || destinoNombre.trim() === '' ||
    !usuarioCreadorId || usuarioCreadorId.trim() === '' ||
    !usuarioCreadorNombre || usuarioCreadorNombre.trim() === '' ||
    !detalles || detalles.length === 0
  ) {
    throw new Error('Faltan datos obligatorios para crear el vale')
  }

  try {
    const totalUnidades = detalles.reduce((sum, d) => sum + d.totalUnidades, 0)
    const hoy = todayDateString()

    // Obtener correlativo FUERA de la transacción (solo lectura)
    const valesHoyQuery = query(
      collection(db, 'vales'),
      where('fecha', '==', hoy),
      where('tipo', '==', tipo)
    )
    const valesHoySnapshot = await getDocs(valesHoyQuery)
    const correlativoDia = valesHoySnapshot.size + 1

    const ahora = new Date()
    const timestamp = Timestamp.fromDate(ahora)
    const esIngreso = tipo.toLowerCase() === 'ingreso'
    const estado = esIngreso ? 'pendiente' : 'validado'

    const valeData: any = {
      tipo,
      estado,
      origenId,
      origenNombre,
      destinoId,
      destinoNombre,
      transportistaId: transportistaId || null,
      transportistaNombre: transportistaNombre || null,
      detalles,
      totalUnidades,
      comentario: comentario || null,
      usuarioCreadorId,
      usuarioCreadorNombre,
      fecha: hoy,
      hora: ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      correlativoDia,
      createdAt: timestamp,
      timestamp
    }

    if (!esIngreso) {
      valeData.updatedAt = timestamp
    }

    // ====== TODO EN UNA SOLA TRANSACCIÓN ======
    let valeId = ''
    
    await runTransaction(db, async (transaction) => {
      // 1. PRIMERO: todas las lecturas (si hay ajuste de stock)
      const stockReads: Array<{ ref: any; snap: any; detalle: DetalleVale }> = []
      
      if (!esIngreso) {
        for (const detalle of detalles) {
          const stockRef = doc(db, 'stock', detalle.sku)
          const stockSnap = await transaction.get(stockRef)
          stockReads.push({ ref: stockRef, snap: stockSnap, detalle })
        }
      }

      // 2. DESPUÉS: todas las escrituras
      // Crear el vale
      const valeRef = doc(collection(db, 'vales'))
      transaction.set(valeRef, valeData)
      valeId = valeRef.id

      // Ajustar stock y crear movimientos (solo si no es ingreso)
      if (!esIngreso) {
        for (const item of stockReads) {
          const { ref, snap, detalle } = item
          let stockActual = 0
          
          if (!snap.exists()) {
            transaction.set(ref, { 
              skuCodigo: detalle.sku,
              cantidad: 0, 
              updatedAt: timestamp 
            })
            stockActual = 0
          } else {
            stockActual = snap.data().cantidad || 0
          }

          const cantidadAjuste = tipo === 'egreso' ? -detalle.totalUnidades : detalle.totalUnidades
          const nuevaCantidad = stockActual + cantidadAjuste

          transaction.update(ref, { 
            cantidad: nuevaCantidad, 
            updatedAt: timestamp 
          })

          // Crear movimiento
          const movimientoRef = doc(collection(db, 'movimientos'))
          transaction.set(movimientoRef, {
            tipo,
            skuCodigo: detalle.sku,
            skuNombre: detalle.skuNombre || '',
            cantidad: Math.abs(cantidadAjuste),
            origenId,
            origenNombre,
            destinoId,
            destinoNombre,
            valeId: valeRef.id,
            valeReferencia: `${tipo.toUpperCase()} #${correlativoDia}`,
            valeEstado: estado,
            fecha: hoy,
            hora: ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            usuarioId: usuarioCreadorId,
            usuarioNombre: usuarioCreadorNombre,
            createdAt: timestamp,
            timestamp
          })
        }
      }
    })

    return valeId
  } catch (error: any) {
    console.error('Error en crearVale:', error)
    throw new Error(error.message || 'Error al crear el vale')
  }
}

export async function validarVale(
  valeId: string,
  usuarioValidadorId: string,
  usuarioValidadorNombre: string
): Promise<void> {
  try {
    const valeRef = doc(db, 'vales', valeId)
    const valeSnap = await getDoc(valeRef)
    if (!valeSnap.exists()) {
      throw new Error('Vale no encontrado')
    }
    const vale = valeSnap.data()
    if (vale.estado !== 'pendiente') {
      throw new Error('Solo se pueden validar vales pendientes')
    }
    if (vale.tipo !== 'ingreso') {
      throw new Error('Solo se pueden validar vales de tipo ingreso')
    }

    const ahora = new Date()
    const timestamp = Timestamp.fromDate(ahora)

    await runTransaction(db, async (transaction) => {
      // PRIMERO: todas las lecturas
      const stockReads: Array<{ ref: any; snap: any; detalle: any }> = []
      for (const detalle of vale.detalles) {
        const stockRef = doc(db, 'stock', detalle.sku)
        const stockSnap = await transaction.get(stockRef)
        stockReads.push({ ref: stockRef, snap: stockSnap, detalle })
      }

      // DESPUÉS: todas las escrituras
      transaction.update(valeRef, {
        estado: 'validado',
        usuarioValidadorId,
        usuarioValidadorNombre,
        fechaValidacion: todayDateString(),
        horaValidacion: ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        updatedAt: timestamp
      })

      for (const item of stockReads) {
        const { ref, snap, detalle } = item
        let stockActual = 0
        
        if (!snap.exists()) {
          transaction.set(ref, { 
            skuCodigo: detalle.sku,
            cantidad: 0, 
            updatedAt: timestamp 
          })
          stockActual = 0
        } else {
          stockActual = snap.data().cantidad || 0
        }
        
        const nuevaCantidad = stockActual + detalle.totalUnidades
        transaction.update(ref, { 
          cantidad: nuevaCantidad, 
          updatedAt: timestamp 
        })

        const movimientoRef = doc(collection(db, 'movimientos'))
        transaction.set(movimientoRef, {
          tipo: 'ingreso',
          skuCodigo: detalle.sku,
          skuNombre: detalle.skuNombre || '',
          cantidad: detalle.totalUnidades,
          origenId: vale.origenId,
          origenNombre: vale.origenNombre,
          destinoId: vale.destinoId,
          destinoNombre: vale.destinoNombre,
          valeId,
          valeReferencia: `INGRESO #${vale.correlativoDia}`,
          valeEstado: 'validado',
          fecha: todayDateString(),
          hora: ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          usuarioId: usuarioValidadorId,
          usuarioNombre: usuarioValidadorNombre,
          createdAt: timestamp,
          timestamp
        })
      }
    })
  } catch (error: any) {
    console.error('Error en validarVale:', error)
    throw new Error(error.message || 'Error al validar el vale')
  }
}
