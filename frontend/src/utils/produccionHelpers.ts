// frontend/src/utils/produccionHelpers.ts

import { db } from '@/lib/firebase'
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { todayDateString } from './formatHelpers'
import { CONTADORES_PRODUCCION, PABELLONES_AUTOMATICOS } from './constants'

export interface ContadorValor {
  contadorId: number
  pabellonId: string
  pabellonNombre: string
  linea: number
  cara: 'A' | 'B'
  label: string
  valor: number
}

export interface RegistroContadores {
  fecha: string
  contadores: ContadorValor[]
  totalProduccion: number
  usuarioId: string
  usuarioNombre: string
  createdAt: any
  timestamp: any
  confirmado: boolean
  // NUEVO: estado incremental por pabellón (para UI)
  pabellonesCompletos?: string[]
}

export type PesosPorPabellon = Record<string, number>

export interface RegistroPesosBalde {
  fecha: string
  pesosPorPabellon: PesosPorPabellon
  pesoTotal: number
  usuarioId: string
  usuarioNombre: string
  createdAt: any
  updatedAt: any
}

function sumarPesos(pesos: PesosPorPabellon): number {
  return Object.values(pesos || {}).reduce((sum, n) => sum + (Number(n) || 0), 0)
}

function normalizarPesoDecimal(input: number): number {
  // Firestore guarda number; el parse de coma/punto debe ocurrir en UI.
  // Aquí solo aseguramos que sea finito y >= 0.
  const n = Number(input)
  if (!Number.isFinite(n)) return 0
  return n < 0 ? 0 : n
}

function validarFechaHoy(fecha: string) {
  const hoy = todayDateString()
  if (fecha !== hoy) {
    throw new Error('Solo se pueden ingresar datos para el día de hoy')
  }
}

function contadoresConfigPorPabellon(pabellonId: string) {
  const arr = CONTADORES_PRODUCCION.filter((c) => c.pabellonId === pabellonId).sort((a, b) => a.id - b.id)
  return arr
}

function idsContadoresPabellon(pabellonId: string) {
  return contadoresConfigPorPabellon(pabellonId).map((c) => c.id)
}

/**
 * NUEVO (principal):
 * Guarda producción por pabellón (6 contadores + peso) en modo incremental.
 *
 * - Escribe/merge en contadoresProduccion/{fecha}
 * - Escribe/merge en pesosBalde/pb-{fecha}
 * - Inhabilita por lógica (UI) al detectar que ese pabellón ya quedó guardado (existe en doc)
 *
 * Regla: solo hoy.
 */
export async function guardarProduccionPorPabellon(
  fecha: string,
  pabellonId: string,
  valoresContadores: Record<number, number>,
  pesoKg: number,
  usuarioId: string,
  usuarioNombre: string,
): Promise<void> {
  try {
    validarFechaHoy(fecha)

    if (!(PABELLONES_AUTOMATICOS as readonly string[]).includes(pabellonId)) {
      throw new Error(`Pabellón no válido para automático: ${pabellonId}`)
    }

    const contadoresIds = idsContadoresPabellon(pabellonId)
    if (contadoresIds.length !== 6) {
      throw new Error(`Configuración inválida: ${pabellonId} no tiene 6 contadores`)
    }

    // Validar que vienen los 6 contadores (permitimos 0 como valor válido, pero deben estar presentes)
    for (const id of contadoresIds) {
      const v = valoresContadores[id]
      if (v === undefined || v === null || Number.isNaN(Number(v))) {
        throw new Error(`Falta el contador C${id} (${pabellonId})`)
      }
      if (Number(v) < 0) {
        throw new Error(`El contador C${id} no puede ser negativo`)
      }
    }

    const pesoNormalizado = normalizarPesoDecimal(pesoKg)
    // Si quieres exigir peso > 0, cambia a: if (pesoNormalizado <= 0) throw...
    if (!Number.isFinite(pesoNormalizado)) {
      throw new Error('Peso inválido')
    }

    // 1) Leer doc contadoresProduccion/{fecha} (para saber si el pabellón ya está guardado)
    const contDocRef = doc(db, 'contadoresProduccion', fecha)
    const contSnap = await getDoc(contDocRef)

    if (contSnap.exists()) {
      const data: any = contSnap.data()
      const yaGuardado = Array.isArray(data?.pabellonesCompletos) && data.pabellonesCompletos.includes(pabellonId)
      if (yaGuardado) {
        throw new Error(`Este pabellón (${pabellonId}) ya fue ingresado hoy y quedó bloqueado`)
      }
    }

    // 2) Construir contadores completos “del día” para el doc legacy:
    // - Si ya existe doc, se mezclan contadores previos + los nuevos de este pabellón
    // - Si no existe, se crea doc con solo los del pabellón (los faltantes quedarán 0 hasta completar otros)
    const prevContadores: ContadorValor[] = contSnap.exists() ? ((contSnap.data() as any).contadores || []) : []

    // Construimos mapa para reemplazar solo los ids del pabellón
    const mapPrev = new Map<number, ContadorValor>()
    prevContadores.forEach((c) => mapPrev.set(c.contadorId, c))

    // Reemplazar/crear los 6 contadores del pabellón
    contadoresConfigPorPabellon(pabellonId).forEach((config) => {
      mapPrev.set(config.id, {
        contadorId: config.id,
        pabellonId: config.pabellonId,
        pabellonNombre: config.pabellonNombre,
        linea: config.linea,
        cara: config.cara,
        label: config.label,
        valor: Number(valoresContadores[config.id] || 0),
      })
    })

    // Para mantener consistencia del array, rellenamos TODOS los contadores (1..18) en base a CONTADORES_PRODUCCION
    // usando lo que ya tengamos en mapPrev o 0.
    const contadoresFinal: ContadorValor[] = CONTADORES_PRODUCCION.map((config) => {
      const found = mapPrev.get(config.id)
      return (
        found || {
          contadorId: config.id,
          pabellonId: config.pabellonId,
          pabellonNombre: config.pabellonNombre,
          linea: config.linea,
          cara: config.cara,
          label: config.label,
          valor: 0,
        }
      )
    })

    const totalProduccion = contadoresFinal.reduce((sum, c) => sum + (Number(c.valor) || 0), 0)

    // 3) Actualizar pabellonesCompletos (bloqueo por pabellón)
    const prevCompletos: string[] =
      contSnap.exists() && Array.isArray((contSnap.data() as any)?.pabellonesCompletos)
        ? (contSnap.data() as any).pabellonesCompletos
        : []

    const nuevosCompletos = Array.from(new Set([...prevCompletos, pabellonId]))

    const ahora = Timestamp.fromDate(new Date())

    const registroContadores: Partial<RegistroContadores> = {
      fecha,
      contadores: contadoresFinal,
      totalProduccion,
      usuarioId,
      usuarioNombre,
      timestamp: ahora,
      // createdAt: mantener el original si existe
      confirmado: nuevosCompletos.length === (PABELLONES_AUTOMATICOS as readonly string[]).length,
      pabellonesCompletos: nuevosCompletos,
    }

    const payload: any = {
      ...registroContadores,
      updatedAt: serverTimestamp(),
    }

    if (!contSnap.exists()) {
      payload.createdAt = ahora
    } else {
      // mantener createdAt original si existe
      const prevCreatedAt = (contSnap.data() as any)?.createdAt
      if (prevCreatedAt) payload.createdAt = prevCreatedAt
    }

    await setDoc(contDocRef, payload, { merge: true })

    // 4) Guardar/merge pesos en pesosBalde/pb-{fecha}
    const pbId = `pb-${fecha}`
    const pbRef = doc(db, 'pesosBalde', pbId)
    const pbSnap = await getDoc(pbRef)

    const prevPesos: PesosPorPabellon =
      pbSnap.exists() &&
      pbSnap.data() &&
      typeof (pbSnap.data() as any).pesosPorPabellon === 'object' &&
      !Array.isArray((pbSnap.data() as any).pesosPorPabellon)
        ? ((pbSnap.data() as any).pesosPorPabellon as PesosPorPabellon)
        : {}

    const pesosActualizados: PesosPorPabellon = {
      ...prevPesos,
      [pabellonId]: pesoNormalizado,
    }

    const registroPesos: Partial<RegistroPesosBalde> = {
      fecha,
      pesosPorPabellon: pesosActualizados,
      pesoTotal: sumarPesos(pesosActualizados),
      usuarioId,
      usuarioNombre,
      updatedAt: serverTimestamp(),
    }

    if (!pbSnap.exists()) {
      registroPesos.createdAt = ahora
    }

    await setDoc(pbRef, registroPesos, { merge: true })
  } catch (error: any) {
    console.error('Error guardando producción por pabellón:', error)
    throw new Error(error.message || 'Error al guardar producción por pabellón')
  }
}

/**
 * Compat (mantener): guarda contadores del día “completo”.
 * Se deja para compat con el modal viejo, pero RECOMENDACIÓN: dejar de usarlo.
 *
 * Regla: SOLO hoy y si doc NO existe.
 */
export async function guardarContadores(
  fecha: string,
  valores: Record<number, number>,
  usuarioId: string,
  usuarioNombre: string,
): Promise<void> {
  try {
    const hoy = todayDateString()
    if (fecha !== hoy) {
      throw new Error('Solo se pueden ingresar contadores para el día de hoy')
    }

    const docRef = doc(db, 'contadoresProduccion', fecha)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      throw new Error('Los contadores de hoy ya fueron registrados y no pueden ser modificados')
    }

    const contadores: ContadorValor[] = CONTADORES_PRODUCCION.map((config) => ({
      contadorId: config.id,
      pabellonId: config.pabellonId,
      pabellonNombre: config.pabellonNombre,
      linea: config.linea,
      cara: config.cara,
      label: config.label,
      valor: Number(valores[config.id] || 0),
    }))

    const totalProduccion = contadores.reduce((sum, c) => sum + (Number(c.valor) || 0), 0)
    const ahora = new Date()
    const timestamp = Timestamp.fromDate(ahora)

    const registro: RegistroContadores = {
      fecha,
      contadores,
      totalProduccion,
      usuarioId,
      usuarioNombre,
      createdAt: timestamp,
      timestamp,
      confirmado: true,
      pabellonesCompletos: [...(PABELLONES_AUTOMATICOS as readonly string[])],
    }

    await setDoc(docRef, registro)
  } catch (error: any) {
    console.error('Error guardando contadores:', error)
    throw new Error(error.message || 'Error al guardar los contadores')
  }
}

/**
 * Compat (mantener): guarda pesos de balde por pabellón (1 vez al día).
 * Ahora se recomienda usar guardarProduccionPorPabellon que hace merge incremental.
 */
export async function guardarPesosBaldePorPabellon(
  fecha: string,
  pesosPorPabellon: PesosPorPabellon,
  usuarioId: string,
  usuarioNombre: string,
): Promise<void> {
  try {
    const hoy = todayDateString()
    if (fecha !== hoy) {
      throw new Error('Solo se pueden ingresar pesos de balde para el día de hoy')
    }

    const docId = `pb-${fecha}`
    const docRef = doc(db, 'pesosBalde', docId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      throw new Error('Los pesos de balde de hoy ya fueron registrados y no pueden ser modificados')
    }

    const ahora = new Date()
    const ts = Timestamp.fromDate(ahora)

    const normalizado: PesosPorPabellon = {}
    Object.entries(pesosPorPabellon || {}).forEach(([pabId, peso]) => {
      normalizado[pabId] = normalizarPesoDecimal(Number(peso || 0))
    })

    const registro: RegistroPesosBalde = {
      fecha,
      pesosPorPabellon: normalizado,
      pesoTotal: sumarPesos(normalizado),
      usuarioId,
      usuarioNombre,
      createdAt: ts,
      updatedAt: ts,
    }

    await setDoc(docRef, registro)
  } catch (error: any) {
    console.error('Error guardando pesos de balde:', error)
    throw new Error(error.message || 'Error al guardar pesos de balde')
  }
}

export async function obtenerPesosBaldePorPabellon(fecha: string): Promise<RegistroPesosBalde | null> {
  try {
    const docId = `pb-${fecha}`
    const docRef = doc(db, 'pesosBalde', docId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null

    const data: any = docSnap.data()

    const pesosPorPabellon: PesosPorPabellon =
      data && typeof data.pesosPorPabellon === 'object' && !Array.isArray(data.pesosPorPabellon)
        ? data.pesosPorPabellon
        : {}

    const pesoTotal = typeof data.pesoTotal === 'number' ? data.pesoTotal : sumarPesos(pesosPorPabellon)

    return {
      fecha: data.fecha || fecha,
      pesosPorPabellon,
      pesoTotal,
      usuarioId: data.usuarioId || '',
      usuarioNombre: data.usuarioNombre || '',
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null,
    }
  } catch (error) {
    console.error('Error obteniendo pesos por pabellón:', error)
    return null
  }
}

/**
 * Compat: retorna peso total (si existe en pesosBalde/pb-fecha)
 */
export async function obtenerPesoBalde(fecha: string): Promise<number | null> {
  const registro = await obtenerPesosBaldePorPabellon(fecha)
  return registro?.pesoTotal ?? null
}

export async function verificarContadoresIngresados(fecha: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'contadoresProduccion', fecha)
    const docSnap = await getDoc(docRef)
    return docSnap.exists()
  } catch (error) {
    console.error('Error verificando contadores:', error)
    return false
  }
}

export async function obtenerContadoresFecha(fecha: string): Promise<RegistroContadores | null> {
  try {
    const docRef = doc(db, 'contadoresProduccion', fecha)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) return docSnap.data() as RegistroContadores
    return null
  } catch (error) {
    console.error('Error obteniendo contadores:', error)
    return null
  }
}

/**
 * NUEVO: indica si un pabellón ya fue guardado (para deshabilitar inputs en UI).
 */
export async function verificarPabellonIngresado(fecha: string, pabellonId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'contadoresProduccion', fecha)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return false

    const data: any = docSnap.data()
    const completos: string[] = Array.isArray(data?.pabellonesCompletos) ? data.pabellonesCompletos : []
    return completos.includes(pabellonId)
  } catch (error) {
    console.error('Error verificando pabellón ingresado:', error)
    return false
  }
}

export function obtenerFechaAnterior(fechaActual: string): string {
  const fecha = new Date(fechaActual + 'T00:00:00')
  fecha.setDate(fecha.getDate() - 1)
  return fecha.toISOString().split('T')[0]
}

export function calcularVariacion(valorActual: number, valorAnterior: number): number {
  if (valorAnterior === 0) return 0
  return ((valorActual - valorAnterior) / valorAnterior) * 100
}

export async function obtenerContadoresRango(fechaInicio: string, fechaFin: string): Promise<RegistroContadores[]> {
  try {
    const q = query(
      collection(db, 'contadoresProduccion'),
      where('fecha', '>=', fechaInicio),
      where('fecha', '<=', fechaFin),
      orderBy('fecha', 'asc'),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => d.data() as RegistroContadores)
  } catch (error) {
    console.error('Error obteniendo rango de contadores:', error)
    return []
  }
}

export function filtrarContadores(
  registros: RegistroContadores[],
  filtros: { pabellonId?: string; linea?: number; cara?: 'A' | 'B'; contadorId?: number },
): ContadorValor[] {
  const resultados: ContadorValor[] = []
  registros.forEach((registro) => {
    const contadoresFiltrados = registro.contadores.filter((contador) => {
      if (filtros.pabellonId && contador.pabellonId !== filtros.pabellonId) return false
      if (filtros.linea !== undefined && contador.linea !== filtros.linea) return false
      if (filtros.cara && contador.cara !== filtros.cara) return false
      if (filtros.contadorId !== undefined && contador.contadorId !== filtros.contadorId) return false
      return true
    })
    resultados.push(...contadoresFiltrados)
  })
  return resultados
}

export function calcularEstadisticas(contadores: ContadorValor[]) {
  if (contadores.length === 0) {
    return { total: 0, promedio: 0, maximo: 0, minimo: 0 }
  }
  const valores = contadores.map((c) => c.valor)
  const total = valores.reduce((sum, v) => sum + v, 0)
  const promedio = total / valores.length
  const maximo = Math.max(...valores)
  const minimo = Math.min(...valores)
  return { total, promedio, maximo, minimo }
}
