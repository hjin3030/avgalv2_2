// frontend/src/lib/formatters.ts

/**
 * Formatea un número con separador de miles
 * Ej: 10200 → 10.200
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
 * Ej: (9200 / 10000) * 100 = 92%
 */
export const calcularOcupacion = (cantidad: number, capacidad: number): string => {
  if (!capacidad || capacidad === 0) return '-'
  const porcentaje = (cantidad / capacidad) * 100
  return `${porcentaje.toFixed(1)}%`
}

/**
 * Formatea fecha y hora para auditoría
 * Ej: "06/11/2025 21:30:45"
 */
export const formatDateTime = (timestamp: any): string => {
  if (!timestamp) return '-'
  
  let date: Date
  
  // Si es Timestamp de Firebase
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate()
  } else if (timestamp instanceof Date) {
    date = timestamp
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp)
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
