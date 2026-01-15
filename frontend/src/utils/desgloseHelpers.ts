// src/utils/desgloseHelpers.ts

export type Desglose = {
  cajas: number
  bandejas: number
  unidades: number
}

/**
 * Calcula el desglose de una cantidad (unidades) en cajas, bandejas y unidades sueltas.
 * - Usa Math.abs para soportar cantidades negativas (egresos) sin romper el desglose.
 * - Protege divisores para evitar NaN / divisiones por 0.
 */
export function calcularDesglose(
  cantidad: number,
  unidadesPorCaja: number,
  unidadesPorBandeja: number,
): Desglose {
  const qty = Math.abs(Number(cantidad ?? 0))

  const upc = Number(unidadesPorCaja ?? 0)
  const upb = Number(unidadesPorBandeja ?? 0)

  // Fallback defensivo (si vienen 0/NaN)
  const unidadesCaja = Number.isFinite(upc) && upc > 0 ? upc : 180
  const unidadesBandeja = Number.isFinite(upb) && upb > 0 ? upb : 30

  const cajas = Math.floor(qty / unidadesCaja)
  const restoCaja = qty % unidadesCaja
  const bandejas = Math.floor(restoCaja / unidadesBandeja)
  const unidades = restoCaja % unidadesBandeja

  return { cajas, bandejas, unidades }
}

/**
 * Formatea un desglose para UI:
 * - Por defecto omite partes en 0 (igual que tu helper actual).
 * - Si todo es 0 => "0U"
 */
export function formatearDesglose(desglose: Desglose): string {
  if (!desglose) return '-'

  const partes: string[] = []
  if (desglose.cajas > 0) partes.push(`${desglose.cajas}C`)
  if (desglose.bandejas > 0) partes.push(`${desglose.bandejas}B`)
  if (desglose.unidades > 0) partes.push(`${desglose.unidades}U`)

  return partes.length > 0 ? partes.join(' ') : '0U'
}
