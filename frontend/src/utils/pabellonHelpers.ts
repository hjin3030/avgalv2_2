// frontend/src/utils/pabellonHelpers.ts

import type { 
  Pabellon, 
  LineaProduccion, 
  LineaProduccionConEdad
} from '@/types'

/**
 * Calcula la edad en semanas de una línea de producción
 */
export function calcularEdadEnSemanas(fechaNacimiento: string): number {
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  const diffMs = hoy.getTime() - nacimiento.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.floor(diffDays / 7)
}

/**
 * Calcula el porcentaje de ocupación de una línea
 */
export function calcularPorcentajeOcupacion(cantidadAves: number, capacidadAves: number): number {
  if (capacidadAves === 0) return 0
  return (cantidadAves / capacidadAves) * 100
}

/**
 * Convierte LineaProduccion a LineaProduccionConEdad agregando cálculos
 */
export function agregarEdadALinea(linea: LineaProduccion): LineaProduccionConEdad {
  return {
    ...linea,
    semanasEdad: calcularEdadEnSemanas(linea.fechaNacimiento),
    porcentajeOcupacion: calcularPorcentajeOcupacion(linea.cantidadAves, linea.capacidadAves)
  }
}

/**
 * Convierte Pabellon a Pabellon con edades agregando cálculos a todas las líneas
 * Maneja opcionalidad de lineas con ?? para evitar error posible undefined
 */
export function agregarEdadesAPabellon(pabellon: Pabellon): Pabellon & { porcentajeOcupacionTotal: number; lineas: LineaProduccionConEdad[] } {
  const lineasConEdad = (pabellon.lineas ?? []).map(agregarEdadALinea)
  const porcentajeOcupacionTotal = calcularPorcentajeOcupacion(
    pabellon.cantidadTotal,
    pabellon.capacidadTotal
  )

  return {
    ...pabellon,
    lineas: lineasConEdad,
    porcentajeOcupacionTotal
  }
}

/**
 * Calcula métricas clave del pabellón (KPIs simples)
 * Maneja optional chaining para evitar error con propiedades opcionales
 */
export function calcularMetricasPabellon(pabellon: Pabellon) {
  const lineasActivas = (pabellon.lineas ?? []).filter(l => l.activa)
  const avesActivas = lineasActivas.reduce((sum, l) => sum + l.cantidadAves, 0)

  const sumaEdadesPonderadas = lineasActivas.reduce((sum, linea) => {
    const edad = calcularEdadEnSemanas(linea.fechaNacimiento)
    return sum + (edad * linea.cantidadAves)
  }, 0)
  const semanasPromedioEdad = avesActivas > 0 ? sumaEdadesPonderadas / avesActivas : 0

  const produccionEsperadaDiaria = (pabellon.configuracion?.metaProduccion ?? 0) * avesActivas

  const porcentajeOcupacion = calcularPorcentajeOcupacion(
    pabellon.cantidadTotal,
    pabellon.capacidadTotal
  )

  return {
    porcentajeOcupacion,
    avesActivas,
    semanasPromedioEdad,
    produccionEsperadaDiaria,
    lineasActivas: lineasActivas.length
  }
}

/**
 * Determina si una línea está en edad productiva óptima (20-70 semanas)
 * Las gallinas producen mejor entre las 20 y 70 semanas de edad
 */
export function esEdadProductivaOptima(fechaNacimiento: string): boolean {
  const edad = calcularEdadEnSemanas(fechaNacimiento)
  return edad >= 20 && edad <= 70
}

/**
 * Calcula el nivel de alerta según ocupación
 * @returns 'alto' (>85%), 'medio' (65-85%), 'bajo' (<65%)
 */
export function nivelAlertaOcupacion(porcentaje: number): 'alto' | 'medio' | 'bajo' {
  if (porcentaje >= 85) return 'alto'
  if (porcentaje >= 65) return 'medio'
  return 'bajo'
}

/**
 * Obtiene todas las líneas activas de un pabellón
 * Maneja optional chaining para evitar error si lineas es undefined
 */
export function obtenerLineasActivas(pabellon: Pabellon): LineaProduccion[] {
  return (pabellon.lineas ?? []).filter(l => l.activa)
}

/**
 * Calcula el total de aves activas en un pabellón
 */
export function calcularTotalAvesActivas(pabellon: Pabellon): number {
  return obtenerLineasActivas(pabellon).reduce((sum, l) => sum + l.cantidadAves, 0)
}
