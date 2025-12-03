// frontend/src/utils/formatHelpers.ts

/**
 * Formatea un número con separadores de miles
 * @example formatNumber(1234567) => "1.234.567"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CL').format(value)
}

/**
 * Formatea un número como porcentaje
 * @example formatPercent(0.856) => "86%"
 * @example formatPercent(0.856, 1) => "85.6%"
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Formatea una fecha en formato DD/MM/YYYY
 * @example formatDate("2025-10-29") => "29/10/2025"
 */
export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Formatea una hora en formato HH:mm
 * @example formatTime("14:30:45") => "14:30"
 */
export function formatTime(timeString: string): string {
  return timeString.substring(0, 5)
}

/**
 * Formatea un timestamp ISO a fecha y hora legible
 * @example formatDateTime("2025-10-29T14:30:45") => "29/10/2025 14:30"
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

/**
 * Formatea un número como moneda CLP
 * @example formatCurrency(1234567) => "$1.234.567"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(value)
}

/**
 * Formatea un número con decimales usando coma
 * @example formatDecimal(12.3456, 2) => "12,35"
 */
export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals).replace('.', ',')
}

/**
 * ✅ Devuelve la fecha del día en formato "YYYY-MM-DD" con la zona horaria Chile.
 * Usar SIEMPRE este helper para filtrar por "hoy" en todos los gráficos.
 */
export function todayDateString(): string {
  const date = new Date()
  const chileDateString = date.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Santiago',
  })
  const clean = chileDateString.replace(/\//g, '-')
  const [day, month, year] = clean.split('-')
  return `${year}-${month}-${day}`
}

/**
 * Recorta una fecha timestamp/ISO a sólo la fecha "YYYY-MM-DD"
 */
export function justDate(isoString: string): string {
  return isoString.split('T')[0]
}

/**
 * Formatea un timestamp de Firestore o ISO a formato legible chileno
 */
export function formatearFechaHora(timestamp: any): string {
  if (!timestamp) return '-'
  const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const day = String(fecha.getDate()).padStart(2, '0')
  const month = String(fecha.getMonth() + 1).padStart(2, '0')
  const year = fecha.getFullYear()
  const hours = String(fecha.getHours()).padStart(2, '0')
  const minutes = String(fecha.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

/**
 * Convierte una hora tipo "02:06 p. m.", "2:06 p. m." o "14:05"
 * a número de hora 0–23. Úsalo en gráficos por hora.
 */
export function parseHoraToHourNumber(horaStr?: string): number | null {
  if (!horaStr) return null
  let str = horaStr.trim().toLowerCase()

  const esPM = str.includes('p. m') || str.includes('pm') || str.includes('p.m')
  const esAM = str.includes('a. m') || str.includes('am') || str.includes('a.m')

  str = str
    .replace(/a\.? ?m\.?/g, '')
    .replace(/p\.? ?m\.?/g, '')
    .replace(/am/g, '')
    .replace(/pm/g, '')
    .trim()

  const partes = str.split(':')
  if (!partes.length) return null

  const h = parseInt(partes[0], 10)
  if (isNaN(h)) return null

  let hora = h
  if (esPM && h < 12) hora = h + 12
  if (esAM && h === 12) hora = 0
  if (hora < 0 || hora > 23) return null

  return hora
}

/**
 * Etiqueta estándar para "Hoy (DD/MM/YYYY)" en títulos de gráficos.
 */
export function hoyLabel(): string {
  return `Hoy (${formatDate(todayDateString())})`
}

/**
 * Formatea un rango de fechas "YYYY-MM-DD" para títulos.
 */
export function formatDateRange(desde: string, hasta: string): string {
  if (desde === hasta) return formatDate(desde)
  return `${formatDate(desde)} - ${formatDate(hasta)}`
}
