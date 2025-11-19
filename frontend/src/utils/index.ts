// frontend/src/utils/helpers/index.ts
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Sku, Pabellon, Destino, Origen, Transportista } from '@/types'

export async function registrarMovimientos(
  valeId: string,
  valeEstado: 'pendiente' | 'validado' | 'rechazado',
  tipo: 'ingreso' | 'egreso' | 'reingreso',
  detalles: Array<{
    sku: string
    skuNombre: string
    totalUnidades: number
  }>,
  metadata: {
    fecha: string
    hora: string
    valeReferencia: string
    origenNombre?: string
    destinoNombre?: string
    usuarioNombre: string
  }
) {
  const batch = writeBatch(db)

  detalles.forEach((detalle) => {
    const movRef = doc(collection(db, 'movimientos'))

    const movimiento: any = {
      valeId,
      valeEstado,
      tipo,
      skuCodigo: detalle.sku,
      skuNombre: detalle.skuNombre,
      cantidad: detalle.totalUnidades,
      fecha: metadata.fecha,
      hora: metadata.hora,
      valeReferencia: metadata.valeReferencia,
      usuarioNombre: metadata.usuarioNombre,
      createdAt: serverTimestamp()
    }

    if (metadata.origenNombre) movimiento.origenNombre = metadata.origenNombre
    if (metadata.destinoNombre) movimiento.destinoNombre = metadata.destinoNombre

    batch.set(movRef, movimiento)
  })

  await batch.commit()
}

export async function actualizarEstadoMovimientos(valeId: string, nuevoEstado: 'validado' | 'rechazado') {
  const q = query(collection(db, 'movimientos'), where('valeId', '==', valeId))
  const snapshot = await getDocs(q)

  const batch = writeBatch(db)

  snapshot.forEach((movDoc) => {
    batch.update(doc(db, 'movimientos', movDoc.id), {
      valeEstado: nuevoEstado
    })
  })

  await batch.commit()
}

export async function crearSku(sku: Omit<Sku, 'id'>): Promise<string> {
  const skusRef = collection(db, 'skus')
  const newSkuRef = doc(skusRef)

  await setDoc(newSkuRef, {
    ...sku,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  return newSkuRef.id
}

export async function actualizarSku(id: string, sku: Partial<Sku>): Promise<void> {
  const skuRef = doc(db, 'skus', id)
  await updateDoc(skuRef, {
    ...sku,
    updatedAt: serverTimestamp()
  })
}

export async function eliminarSku(id: string): Promise<void> {
  const skuRef = doc(db, 'skus', id)
  await deleteDoc(skuRef)
}

export async function crearPabellon(pabellon: Omit<Pabellon, 'id'>): Promise<string> {
  const pabellonesRef = collection(db, 'pabellones')
  const newPabellonRef = doc(pabellonesRef)

  await setDoc(newPabellonRef, {
    ...pabellon,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  return newPabellonRef.id
}

export async function actualizarPabellon(id: string, pabellon: Partial<Pabellon>): Promise<void> {
  const pabellonRef = doc(db, 'pabellones', id)
  await updateDoc(pabellonRef, {
    ...pabellon,
    updatedAt: serverTimestamp()
  })
}

export async function eliminarPabellon(id: string): Promise<void> {
  const pabellonRef = doc(db, 'pabellones', id)
  await deleteDoc(pabellonRef)
}

export async function crearDestino(destino: Omit<Destino, 'id'>): Promise<string> {
  const destinosRef = collection(db, 'destinos')
  const newDestinoRef = doc(destinosRef)

  await setDoc(newDestinoRef, {
    ...destino,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  return newDestinoRef.id
}

export async function actualizarDestino(id: string, destino: Partial<Destino>): Promise<void> {
  const destinoRef = doc(db, 'destinos', id)
  await updateDoc(destinoRef, {
    ...destino,
    updatedAt: serverTimestamp()
  })
}

export async function eliminarDestino(id: string): Promise<void> {
  const destinoRef = doc(db, 'destinos', id)
  await deleteDoc(destinoRef)
}

export async function crearOrigen(origen: Omit<Origen, 'id'>): Promise<string> {
  const origenesRef = collection(db, 'origenes')
  const newOrigenRef = doc(origenesRef)

  await setDoc(newOrigenRef, {
    ...origen,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  return newOrigenRef.id
}

export async function actualizarOrigen(id: string, origen: Partial<Origen>): Promise<void> {
  const origenRef = doc(db, 'origenes', id)
  await updateDoc(origenRef, {
    ...origen,
    updatedAt: serverTimestamp()
  })
}

export async function eliminarOrigen(id: string): Promise<void> {
  const origenRef = doc(db, 'origenes', id)
  await deleteDoc(origenRef)
}

export async function crearTransportista(transportista: Omit<Transportista, 'id'>): Promise<string> {
  const transportistasRef = collection(db, 'transportistas')
  const newTransportistaRef = doc(transportistasRef)

  await setDoc(newTransportistaRef, {
    ...transportista,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  return newTransportistaRef.id
}

export async function actualizarTransportista(id: string, transportista: Partial<Transportista>): Promise<void> {
  const transportistaRef = doc(db, 'transportistas', id)
  await updateDoc(transportistaRef, {
    ...transportista,
    updatedAt: serverTimestamp()
  })
}

export async function eliminarTransportista(id: string): Promise<void> {
  const transportistaRef = doc(db, 'transportistas', id)
  await deleteDoc(transportistaRef)
}

export function convertirTimestampAFecha(timestamp: any): string {
  if (!timestamp) return ''
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toLocaleDateString('es-CL')
  }
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleDateString('es-CL')
  }
  return ''
}

export function formatearNumero(numero: number): string {
  return new Intl.NumberFormat('es-CL').format(numero)
}

export function calcularPorcentaje(valor: number, total: number): number {
  if (total === 0) return 0
  return Math.round((valor / total) * 100)
}
