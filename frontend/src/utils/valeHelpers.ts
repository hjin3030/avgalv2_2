// frontend/src/utils/valeHelpers.ts

import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  Timestamp,
  getDoc,
  writeBatch
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
  skusCatalogo?: any[]
}

function getSkuNombreFromCatalogo(skusCatalogo: any[], codigo: string): string {
  const sku = skusCatalogo.find(s => s.codigo === codigo)
  return sku?.nombre || 'Desconocido'
}

function enriquecerDetallesConNombre(detalles: DetalleVale[], skusCatalogo: any[]): DetalleVale[] {
  return detalles.map(detalle => ({
    ...detalle,
    skuNombre: detalle.skuNombre || getSkuNombreFromCatalogo(skusCatalogo, detalle.sku)
  }))
}

// FUNCIÓN CRÍTICA: Normaliza códigos SKU para que coincidan con IDs de stock
function normalizarCodigoSku(codigo: string): string {
  // Convierte guiones a espacios para que coincida con los IDs de documentos de stock
  return codigo.replace(/-/g, ' ')
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
    usuarioCreadorNombre,
    skusCatalogo = []
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

  const detallesConNombre = enriquecerDetallesConNombre(detalles, skusCatalogo)
  const totalUnidades = detallesConNombre.reduce((sum, d) => sum + d.totalUnidades, 0)
  const hoy = todayDateString()

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
    detalles: detallesConNombre,
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
    valeData.fechaValidacion = hoy
    valeData.horaValidacion = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    valeData.updatedAt = timestamp
  }

  let valeId = ''

  if (!esIngreso) {
    const stockRefs: Map<string, any> = new Map()
    
    for (const detalle of detallesConNombre) {
      // CORRECCIÓN: Normalizar código SKU (guiones → espacios)
      const codigoNormalizado = normalizarCodigoSku(detalle.sku)
      const stockRef = doc(db, 'stock', codigoNormalizado)
      const stockSnap = await getDoc(stockRef)
      
      stockRefs.set(detalle.sku, {
        ref: stockRef,
        existe: stockSnap.exists(),
        cantidad: stockSnap.exists() ? (stockSnap.data().cantidad || 0) : 0
      })
    }

    const batch = writeBatch(db)
    const valeRef = doc(collection(db, 'vales'))
    batch.set(valeRef, valeData)
    valeId = valeRef.id

    for (const detalle of detallesConNombre) {
      const stockData = stockRefs.get(detalle.sku)!
      const cantidadAjuste = tipo === 'egreso' ? -detalle.totalUnidades : detalle.totalUnidades
      const nuevaCantidad = stockData.cantidad + cantidadAjuste

      if (!stockData.existe) {
        batch.set(stockData.ref, {
          skuCodigo: normalizarCodigoSku(detalle.sku),
          cantidad: nuevaCantidad,
          createdAt: timestamp,
          updatedAt: timestamp
        })
      } else {
        batch.update(stockData.ref, {
          cantidad: nuevaCantidad,
          updatedAt: timestamp
        })
      }

      const movimientoRef = doc(collection(db, 'movimientos'))
      batch.set(movimientoRef, {
        tipo,
        skuCodigo: normalizarCodigoSku(detalle.sku),
        skuNombre: detalle.skuNombre || getSkuNombreFromCatalogo(skusCatalogo, detalle.sku),
        cantidad: cantidadAjuste,
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

    await batch.commit()
  } else {
    const valeRef = doc(collection(db, 'vales'))
    const batch = writeBatch(db)
    batch.set(valeRef, valeData)
    await batch.commit()
    valeId = valeRef.id
  }

  return valeId
}

export async function validarVale(
  valeId: string,
  usuarioValidadorId: string,
  usuarioValidadorNombre: string,
  skusCatalogo: any[]
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
    const detallesConNombre = enriquecerDetallesConNombre(vale.detalles, skusCatalogo)

    const stockRefs: Map<string, any> = new Map()
    
    for (const detalle of detallesConNombre) {
      // CORRECCIÓN: Normalizar código SKU
      const codigoNormalizado = normalizarCodigoSku(detalle.sku)
      const stockRef = doc(db, 'stock', codigoNormalizado)
      const stockSnap = await getDoc(stockRef)
      
      stockRefs.set(detalle.sku, {
        ref: stockRef,
        existe: stockSnap.exists(),
        cantidad: stockSnap.exists() ? (stockSnap.data().cantidad || 0) : 0
      })
    }

    const batch = writeBatch(db)
    
    batch.update(valeRef, {
      estado: 'validado',
      validadoPorId: usuarioValidadorId,
      validadoPorNombre: usuarioValidadorNombre,
      fechaValidacion: todayDateString(),
      horaValidacion: ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      updatedAt: timestamp,
      detalles: detallesConNombre
    })

    for (const detalle of detallesConNombre) {
      const stockData = stockRefs.get(detalle.sku)!
      const nuevaCantidad = stockData.cantidad + detalle.totalUnidades

      if (!stockData.existe) {
        batch.set(stockData.ref, {
          skuCodigo: normalizarCodigoSku(detalle.sku),
          cantidad: nuevaCantidad,
          createdAt: timestamp,
          updatedAt: timestamp
        })
      } else {
        batch.update(stockData.ref, {
          cantidad: nuevaCantidad,
          updatedAt: timestamp
        })
      }

      const movimientoRef = doc(collection(db, 'movimientos'))
      batch.set(movimientoRef, {
        tipo: 'ingreso',
        skuCodigo: normalizarCodigoSku(detalle.sku),
        skuNombre: detalle.skuNombre || getSkuNombreFromCatalogo(skusCatalogo, detalle.sku),
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

    await batch.commit()
  } catch (error: any) {
    console.error('Error en validarVale:', error)
    throw new Error(error.message || 'Error al validar el vale')
  }
}
