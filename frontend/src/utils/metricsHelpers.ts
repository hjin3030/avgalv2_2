// frontend/src/utils/metricsHelpers.ts

import type { Stock, Pabellon, DashboardMetrics } from '@/types'

/**
 * ========================================
 * KPIs DE PRODUCCIÓN
 * ========================================
 */

/**
 * Calcula la eficiencia de producción (% real vs esperado)
 * KPI: Production Efficiency
 */
export function calcularEficienciaProduccion(
  produccionReal: number,
  produccionEsperada: number
): number {
  if (produccionEsperada === 0) return 0
  return (produccionReal / produccionEsperada) * 100
}

/**
 * Calcula el porcentaje de merma
 * KPI: Waste Reduction
 */
export function calcularPorcentajeMerma(
  unidadesMerma: number,
  totalProducido: number
): number {
  if (totalProducido === 0) return 0
  return (unidadesMerma / totalProducido) * 100
}

/**
 * ========================================
 * KPIs DE INVENTARIO
 * ========================================
 */

/**
 * Calcula días de inventario disponible
 * KPI: Days Sales in Inventory (DSI)
 */
export function calcularDiasInventario(
  inventarioActual: number,
  ventasDiariasPromedio: number
): number {
  if (ventasDiariasPromedio === 0) return 0
  return inventarioActual / ventasDiariasPromedio
}

/**
 * Calcula el porcentaje de stock disponible
 * KPI: Stock Availability
 */
export function calcularDisponibilidadStock(stocks: Stock[]): number {
  if (stocks.length === 0) return 0
  const skusDisponibles = stocks.filter(s => s.disponible > 0).length
  return (skusDisponibles / stocks.length) * 100
}

/**
 * ========================================
 * KPIs DE OCUPACIÓN
 * ========================================
 */

/**
 * Calcula la tasa de ocupación de pabellones
 * KPI: Facility Utilization Rate
 */
export function calcularTasaOcupacionPabellones(pabellones: Pabellon[]): number {
  const totalCapacidad = pabellones.reduce((sum, p) => sum + p.capacidadTotal, 0)
  const totalOcupado = pabellones.reduce((sum, p) => sum + p.cantidadTotal, 0)
  
  if (totalCapacidad === 0) return 0
  return (totalOcupado / totalCapacidad) * 100
}

/**
 * ========================================
 * RESUMEN DASHBOARD
 * ========================================
 */

/**
 * Genera resumen de métricas para dashboard
 */
export function generarResumenDashboard(data: {
  produccionHoy: number
  metaDiaria: number
  stockTotal: number
  stocksBajoMinimo: number
  ingresosPendientes: number
  egresosHoy: number
  pabellonesActivos: number
  capacidadTotal: number
  ocupacionTotal: number
}): DashboardMetrics {
  const eficienciaPromedio = calcularEficienciaProduccion(
    data.produccionHoy,
    data.metaDiaria
  )

  const porcentajeOcupacionTotal = data.capacidadTotal > 0 
    ? (data.ocupacionTotal / data.capacidadTotal) * 100 
    : 0

  return {
    produccionHoy: data.produccionHoy,
    eficienciaPromedio,
    stockTotal: data.stockTotal,
    skusBajoMinimo: data.stocksBajoMinimo,
    ingresosPendientes: data.ingresosPendientes,
    egresosHoy: data.egresosHoy,
    pabellonesActivos: data.pabellonesActivos,
    porcentajeOcupacionTotal
  }
}

/**
 * Determina el estado de salud de una métrica
 */
export function estadoMetrica(porcentaje: number): 'excelente' | 'bueno' | 'regular' | 'malo' {
  if (porcentaje >= 90) return 'excelente'
  if (porcentaje >= 75) return 'bueno'
  if (porcentaje >= 50) return 'regular'
  return 'malo'
}
