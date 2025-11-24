// frontend/src/utils/metricsHelpers.ts

import type { Pabellon, LineaProduccion } from '@/types'

// Define aquí LineaProduccionConEdad y PabellonMetrics si no están en tus tipos
export interface LineaProduccionConEdad extends LineaProduccion {
  semanasEdad: number
  porcentajeOcupacion: number
}

export interface PabellonMetrics {
  porcentajeOcupacion: number
  avesActivas: number
  semanasPromedioEdad: number
  produccionEsperadaDiaria: number
  lineas: number
}

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
 * Calcula métricas clave del pabellón (KPIs simples)
 * Maneja optional chaining para evitar error con propiedades opcionales
 */
export function calcularMetricasPabellon(pabellon: Pabellon): PabellonMetrics {
  const lineasActivas = (pabellon.lineas ?? []).filter(l => l.activa)
  const avesActivas = lineasActivas.reduce((sum, l) => sum + l.cantidadAves, 0)

  // Edad promedio ponderada
  const sumaEdadesPonderadas = lineasActivas.reduce((sum, linea) => {
    const edad = calcularEdadEnSemanas(linea.fechaNacimiento)
    return sum + (edad * linea.cantidadAves)
  }, 0)

  const semanasPromedioEdad = avesActivas > 0 ? sumaEdadesPonderadas / avesActivas : 0

  // Corrige a 'metaProduccion' que está en tus tipos
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
    lineas: (pabellon.lineas ?? []).length
  }
}

/**
 * Determina si la línea está en edad productiva óptima
 */
export function esEdadProductivaOptima(fechaNacimiento: string): boolean {
  const edad = calcularEdadEnSemanas(fechaNacimiento)
  return edad >= 20 && edad <= 70
}

/**
 * Nivel de alerta según ocupación
 */
export function nivelAlertaOcupacion(porcentaje: number): 'alto' | 'medio' | 'bajo' {
  if (porcentaje >= 85) return 'alto'
  if (porcentaje >= 65) return 'medio'
  return 'bajo'
}

/**
 * Obtiene todas las líneas activas de un pabellón
 */
export function obtenerLineasActivas(pabellon: Pabellon): LineaProduccion[] {
  return (pabellon.lineas ?? []).filter(l => l.activa)
}

/**
 * Total de aves activas en un pabellón
 */
export function calcularTotalAvesActivas(pabellon: Pabellon): number {
  return obtenerLineasActivas(pabellon).reduce((sum, l) => sum + l.cantidadAves, 0)
}
