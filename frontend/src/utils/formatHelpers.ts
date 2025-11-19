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
 * NUEVO: Formatea un número como moneda CLP
 * @example formatCurrency(1234567) => "$1.234.567"
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(value)
}

/**
 * NUEVO: Formatea un número con decimales usando coma
 * @example formatDecimal(12.3456, 2) => "12,35"
 */
export function formatDecimal(value: number, decimals: number = 2): string {
    return value.toFixed(decimals).replace('.', ',')
}

/**
 * ✅ CORREGIDO: Devuelve la fecha del día en formato "YYYY-MM-DD" con la zona horaria Chile
 * @example todayDateString() => "2025-11-18"
 */
export function todayDateString(): string {
    const date = new Date();
    const chileDateString = date.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Santiago'
    });
    // Convierte DD-MM-YYYY a YYYY-MM-DD
    const [day, month, year] = chileDateString.split('-');
    return `${year}-${month}-${day}`;
}

/**
 * Recorta una fecha timestamp/ISO a sólo la fecha "YYYY-MM-DD"
 * @example justDate("2025-11-14T03:21:04.444Z") => "2025-11-14"
 */
export function justDate(isoString: string): string {
    return isoString.split('T')[0]
}

/**
 * NUEVA: Formatea un timestamp de Firestore o ISO a formato legible chileno
 * Compatible con Firestore Timestamp y Date
 * @example formatearFechaHora(timestamp) => "15/11/2025 14:30"
 */
export function formatearFechaHora(timestamp: any): string {
    if (!timestamp) return '-'
    // Si es un Timestamp de Firestore (tiene método toDate)
    const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    // Formato chileno: DD/MM/YYYY HH:mm
    const day = String(fecha.getDate()).padStart(2, '0')
    const month = String(fecha.getMonth() + 1).padStart(2, '0')
    const year = fecha.getFullYear()
    const hours = String(fecha.getHours()).padStart(2, '0')
    const minutes = String(fecha.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
}
