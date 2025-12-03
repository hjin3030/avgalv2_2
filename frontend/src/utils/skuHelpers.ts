// frontend/src/utils/skuHelpers.ts

import type { Sku, ValeDetalle, Stock } from '@/types'

/**
 * Calcula el total de unidades de un detalle de vale
 */
export function calcularTotalUnidades(
  cajas: number,
  bandejas: number,
  unidades: number,
  sku: Sku
): number {
  const unidadesDeCajas = cajas * (sku.unidadesPorCaja || 1)
  const unidadesDeBandejas = bandejas * (sku.unidadesPorBandeja || 1)
  return unidadesDeCajas + unidadesDeBandejas + unidades
}

/**
 * Convierte unidades sueltas a formato cajas/bandejas/unidades
 * @example convertirUnidadesAFormato(250, sku) => { cajas: 1, bandejas: 2, unidades: 10 }
 */
export function convertirUnidadesAFormato(totalUnidades: number, sku: Sku) {
  const cajas = Math.floor(totalUnidades / (sku.unidadesPorCaja || 1))
  const restoDeCajas = totalUnidades % (sku.unidadesPorCaja || 1)
  const bandejas = Math.floor(restoDeCajas / (sku.unidadesPorBandeja || 1))
  const unidades = restoDeCajas % (sku.unidadesPorBandeja || 1)
  return { cajas, bandejas, unidades }
}

/**
 * Valida que un detalle de vale tenga cantidades válidas
 */
export function validarDetalleVale(detalle: ValeDetalle): { valido: boolean; error?: string } {
  if (detalle.cajas < 0 || detalle.bandejas < 0 || detalle.unidades < 0) {
    return { valido: false, error: 'Las cantidades no pueden ser negativas' }
  }
  if (detalle.totalUnidades === 0) {
    return { valido: false, error: 'El total de unidades debe ser mayor a 0' }
  }
  return { valido: true }
}

/**
 * Suma los totales de múltiples detalles de vale
 */
export function sumarDetallesVale(detalles: ValeDetalle[]): number {
  return detalles.reduce((sum, d) => sum + d.totalUnidades, 0)
}

/**
 * Filtra SKUs activos
 */
export function filtrarSkusActivos(skus: Sku[]): Sku[] {
  return skus.filter(sku => sku.activo)
}

/**
 * Ordena SKUs por el campo 'orden'
 */
export function ordenarSkus(skus: Sku[]): Sku[] {
  return [...skus].sort((a, b) => a.orden - b.orden)
}

/**
 * Agrupa SKUs por tipo (blanco/color/mixto)
 */
export function agruparSkusPorTipo(skus: Sku[]): Record<string, Sku[]> {
  return skus.reduce((acc, sku) => {
    if (!acc[sku.tipo]) acc[sku.tipo] = []
    acc[sku.tipo].push(sku)
    return acc
  }, {} as Record<string, Sku[]>)
}

/**
 * Busca un SKU por código o por id de documento
 * - Para vales de ingreso, detalle.sku suele ser el campo "codigo" (ej: "BLA 1ERA")
 * - Para vales de egreso, detalle.sku suele ser el id del documento (ej: "BLA-1ERA")
 */
export function buscarSkuPorCodigo(skus: Sku[], codigo: string): Sku | undefined {
  return skus.find(sku => sku.codigo === codigo || (sku as any).id === codigo)
}

/**
 * Obtiene el nombre del SKU usando el catálogo (acepta código o id)
 */
export function getSkuNombre(skus: Sku[], codigo: string): string {
  const skuObj = buscarSkuPorCodigo(skus, codigo)
  return skuObj?.nombre || 'Desconocido'
}

/**
 * Verifica si el stock está bajo el nivel mínimo
 */
export function stockBajoMinimo(stock: Stock): boolean {
  const disponible = stock.disponible ?? 0
  const nivelMinimo = stock.nivelMinimo ?? 0
  return disponible < nivelMinimo
}

/**
 * Calcula el porcentaje de stock disponible
 */
export function calcularPorcentajeDisponible(stock: Stock): number {
  const disponible = stock.disponible ?? 0
  const totalUnidades = stock.totalUnidades ?? 0
  if (totalUnidades === 0) return 0
  return (disponible / totalUnidades) * 100
}

/**
 * Determina el nivel de alerta de stock
 * @returns 'critico' (<25%), 'bajo' (25-50%), 'normal' (>50%)
 */
export function nivelAlertaStock(stock: Stock): 'critico' | 'bajo' | 'normal' {
  const porcentaje = calcularPorcentajeDisponible(stock)
  if (porcentaje < 25) return 'critico'
  if (porcentaje < 50) return 'bajo'
  return 'normal'
}
