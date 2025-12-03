// frontend/src/lib/formatters.ts

/**
 * Formatea un número con separador de miles
 * Ej: 10200 → "10.200"
 */
export const formatNumber = (value: any): string => {
  if (typeof value !== 'number') return '-'
  return new Intl.NumberFormat('es-CL').format(value)
}

/**
 * Convierte booleano a texto legible
 * Ej: true → "Sí", false → "No"
 */
export const formatBoolean = (value: any): string => {
  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No'
  }
  return '-'
}

/**
 * Calcula porcentaje de ocupación
 * Ej: (9200 / 10000) * 100 = "92.0%"
 */
export const calcularOcupacion = (cantidad: number, capacidad: number): string => {
  if (!capacidad || capacidad === 0) return '-'
  const porcentaje = (cantidad / capacidad) * 100
  return `${porcentaje.toFixed(1)}%`
}

/**
 * Formatea fecha y hora para auditoría (incluye segundos)
 * Acepta:
 *  - Timestamp de Firebase (con método toDate())
 *  - Date
 *  - number (milisegundos)
 *  - string ISO
 * Ej: "06/11/2025 21:30:45"
 */
export const formatDateTime = (timestamp: any): string => {
  if (!timestamp) return '-'

  let date: Date

  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    // Timestamp de Firebase
    date = timestamp.toDate()
  } else if (timestamp instanceof Date) {
    date = timestamp
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp)
  } else if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp)
    if (isNaN(parsed.getTime())) return '-'
    date = parsed
  } else {
    return '-'
  }

  const pad = (num: number) => String(num).padStart(2, '0')

  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const year = date.getFullYear()
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

/**
 * Devuelve la fecha del día en formato "YYYY-MM-DD" usando zona horaria Chile.
 * Úsalo para todos los filtros por "hoy" en gráficos/tablas.
 */
export const todayDateString = (): string => {
  const now = new Date()
  const chile = now.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Santiago',
  })
  const clean = chile.replace(/\//g, '-')
  const [day, month, year] = clean.split('-')
  return `${year}-${month}-${day}`
}

/**
 * Recorta una fecha timestamp/ISO a sólo la fecha "YYYY-MM-DD"
 * Ej: justDate("2025-11-14T03:21:04.444Z") => "2025-11-14"
 */
export const justDate = (isoString: string): string => {
  if (!isoString) return ''
  return isoString.split('T')[0]
}

/**
 * Convierte una hora tipo "02:06 p. m.", "2:06 p. m." o "14:05"
 * a número de hora 0–23. Úsalo en gráficos por hora.
 */
export const parseHoraToHourNumber = (horaStr?: string): number | null => {
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
