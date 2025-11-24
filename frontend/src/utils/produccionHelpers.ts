// frontend/src/utils/produccionHelpers.ts

import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc, collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore'
import { todayDateString } from './formatHelpers'
import { CONTADORES_PRODUCCION} from './constants'

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
}

/**
 * Guarda los valores de los contadores del día (NO guarda peso balde aquí)
 */
export async function guardarContadores(
  valores: Record<number, number>,
  usuarioId: string,
  usuarioNombre: string
): Promise<void> {
  try {
    const hoy = todayDateString()
    const docRef = doc(db, 'contadoresProduccion', hoy)
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
      valor: valores[config.id] || 0
    }))
    const totalProduccion = contadores.reduce((sum, c) => sum + c.valor, 0)
    const ahora = new Date()
    const timestamp = Timestamp.fromDate(ahora)
    const registro: RegistroContadores = {
      fecha: hoy,
      contadores,
      totalProduccion,
      usuarioId,
      usuarioNombre,
      createdAt: timestamp,
      timestamp,
      confirmado: true
    }
    await setDoc(docRef, registro)
  } catch (error: any) {
    console.error('Error guardando contadores:', error)
    throw new Error(error.message || 'Error al guardar los contadores')
  }
}

/**
 * Verifica si los contadores del día ya fueron ingresados
 */
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

/**
 * Obtiene los contadores de una fecha específica
 */
export async function obtenerContadoresFecha(fecha: string): Promise<RegistroContadores | null> {
  try {
    const docRef = doc(db, 'contadoresProduccion', fecha)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return docSnap.data() as RegistroContadores
    }
    return null
  } catch (error) {
    console.error('Error obteniendo contadores:', error)
    return null
  }
}

/**
 * NUEVA: Obtiene el peso del balde desde la colección pesosBalde
 */
export async function obtenerPesoBalde(fecha: string): Promise<number | null> {
  try {
    const docRef = doc(db, 'pesosBalde', fecha)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      if (typeof data.peso === 'number') {
        return data.peso
      }
      if (typeof data.pesoBalde === 'number') {
        return data.pesoBalde
      }
    }
    return null
  } catch (error) {
    console.error('Error obteniendo peso del balde:', error)
    return null
  }
}

/**
 * NUEVA: Obtiene fecha anterior (día previo)
 */
export function obtenerFechaAnterior(fechaActual: string): string {
  const fecha = new Date(fechaActual + 'T00:00:00')
  fecha.setDate(fecha.getDate() - 1)
  return fecha.toISOString().split('T')[0]
}

/**
 * Calcular variación porcentual
 */
export function calcularVariacion(valorActual: number, valorAnterior: number): number {
  if (valorAnterior === 0) return 0
  return ((valorActual - valorAnterior) / valorAnterior) * 100
}

/**
 * Obtiene registros de contadores en un rango de fechas
 */
export async function obtenerContadoresRango(
  fechaInicio: string,
  fechaFin: string
): Promise<RegistroContadores[]> {
  try {
    const q = query(
      collection(db, 'contadoresProduccion'),
      where('fecha', '>=', fechaInicio),
      where('fecha', '<=', fechaFin),
      orderBy('fecha', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => doc.data() as RegistroContadores)
  } catch (error) {
    console.error('Error obteniendo rango de contadores:', error)
    return []
  }
}

/**
 * Filtra contadores por parámetros específicos
 */
export function filtrarContadores(
  registros: RegistroContadores[],
  filtros: {
    pabellonId?: string
    linea?: number
    cara?: 'A' | 'B'
    contadorId?: number
  }
): ContadorValor[] {
  const resultados: ContadorValor[] = []
  registros.forEach(registro => {
    const contadoresFiltrados = registro.contadores.filter(contador => {
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

/**
 * Calcula estadísticas de producción
 */
export function calcularEstadisticas(contadores: ContadorValor[]) {
  if (contadores.length === 0) {
    return {
      total: 0,
      promedio: 0,
      maximo: 0,
      minimo: 0
    }
  }
  const valores = contadores.map(c => c.valor)
  const total = valores.reduce((sum, v) => sum + v, 0)
  const promedio = total / valores.length
  const maximo = Math.max(...valores)
  const minimo = Math.min(...valores)
  return { total, promedio, maximo, minimo }
}
