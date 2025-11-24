// frontend/src/types/index.ts


// ========================================
// TIPOS BASE
// ========================================
export type UserRole = 'superadmin' | 'admin' | 'supervisor' | 'colaborador'


// ========================================
// USERS
// ========================================
export interface UserProfile {
  uid: string
  nombre: string
  email: string
  rol: UserRole
  activo: boolean
  modulosPermitidos?: string[]
  createdAt?: Date
  updatedAt?: Date
}


// ========================================
// SKUS
// ========================================
export interface Sku {
  id: string
  codigo: string
  nombre: string
  calibre: 'sera' | '2da' | '3ra' | 'pico' | 'cascado'
  tipo: 'blanco' | 'color' | 'mixto'
  unidadesPorCaja: number
  unidadesPorBandeja: number
  activo: boolean
  orden: number
  observaciones?: string
  createdAt?: any
  updatedAt?: any
}


// ========================================
// PABELLONES
// ========================================
export interface LineaProduccion {
  numeroLinea: number
  capacidadAves: number
  cantidadAves: number
  fechaNacimiento: string
  activa: boolean
}


export interface LineaProduccionConEdad extends LineaProduccion {
  semanasEdad: number
  porcentajeOcupacion: number
}


export interface PabellonConfiguracion {
  razaAves: string
  metaProduccion: number
  densidadPajaros: number
  temperaturaOptima: number
  humedad: number
}


export interface Pabellon {
  id: string
  nombre: string
  activo: boolean
  automatico: boolean
  capacidadTotal: number
  cantidadTotal: number
  totalLineas: number
  carasPorLinea: number
  lineas?: LineaProduccion[]
  configuracion?: PabellonConfiguracion
  observaciones?: string
  createdAt?: any
  updatedAt?: any
}


// ========================================
// DESTINOS
// ========================================
export interface Destino {
  id: string
  nombre: string
  tipo: string
  comuna?: string
  direccion?: string
  telefono?: string
  activo: boolean
  observaciones?: string
  createdAt?: any
  updatedAt?: any
}


// ========================================
// ORÍGENES
// ========================================
export interface Origen {
  id: string
  nombre: string
  activo: boolean
  observaciones?: string
  createdAt?: any
  updatedAt?: any
}


// ========================================
// TRANSPORTISTAS
// ========================================
export interface Transportista {
  id: string
  nombre: string
  vehiculo?: string
  patente?: string
  interno?: boolean
  telefono?: string
  rut?: string
  activo: boolean
  observaciones?: string
  createdAt?: any
  updatedAt?: any
}


// ========================================
// VALES
// ========================================
export interface ValeDetalle {
  id?: string
  skuId: string
  skuCodigo: string
  sku: string
  skuNombre: string
  cajas: number
  bandejas: number
  unidades: number
  totalUnidades: number
}


export interface Vale {
  id: string
  correlativoDia: number
  numeroGlobal?: string | number
  tipo: string
  fecha: string
  hora?: string
  estado: 'pendiente' | 'validado' | 'rechazado' | 'completado' | 'anulado'
  origenId?: string
  origenNombre?: string
  pabellonId?: string
  pabellonNombre?: string
  destinoId?: string
  destinoNombre?: string
  transportistaId?: string
  transportistaNombre?: string
  detalles: ValeDetalle[]
  totalCajas?: number
  totalBandejas?: number
  totalUnidades?: number
  observaciones?: string
  comentario?: string
  creadoPor?: string
  usuarioCreadorNombre?: string
  usuarioCreadorRol?: string
  validadoPor?: string
  usuarioValidadorNombre?: string
  fechaValidacion?: string
  horaValidacion?: string
  timestamp?: any
  createdAt?: any
  updatedAt?: any
}


// ========================================
// STOCK (ACTUALIZADO PARA BODEGA)
// ========================================
export interface Desglose {
  cajas: number
  bandejas: number
  unidades: number
}


export interface UltimoMovimiento {
  cantidad: number
  desglose: Desglose
  fecha: any
  valeId?: string
  valeCorrelativo?: string
  origenNombre?: string
  destinoNombre?: string
}


export interface Stock {
  id: string
  skuId: string
  skuCodigo: string
  skuNombre: string
  cantidad: number
  disponible?: number
  nivelMinimo?: number
  totalUnidades?: number
  minimo: number
  maximo: number
  ubicacion: string
  ultimoIngreso?: UltimoMovimiento
  ultimoReingreso?: UltimoMovimiento
  ultimoEgreso?: UltimoMovimiento
  createdAt?: any
  updatedAt?: any
}


// ========================================
// MOVIMIENTOS (NUEVO PARA BODEGA)
// ========================================
export type TipoMovimiento = 'ingreso' | 'egreso' | 'reingreso' | 'ajuste'


export interface Movimiento {
  id: string
  skuId: string
  skuCodigo: string
  skuNombre: string
  tipo: TipoMovimiento
  cantidad: number
  desglose: Desglose
  origenId?: string
  origenNombre?: string
  destinoId?: string
  destinoNombre?: string
  valeId?: string
  valeCorrelativo?: string
  valeReferencia?: string
  hora?: string
  stockAnterior?: number
  stockNuevo?: number
  razon?: string
  usuarioId: string
  usuarioNombre: string
  fecha: any
  timestamp?: any
  observaciones?: string
}


// ========================================
// AUDITORÍA
// ========================================
export interface AuditLog {
  id: string
  timestamp: any
  usuarioId: string
  usuarioNombre: string
  accion: 'create' | 'update' | 'delete' | 'view'
  modulo: 'skus' | 'pabellones' | 'destinos' | 'origenes' | 'transportistas' | 'vales' | 'stock' | 'usuarios' | 'bodega'
  documentoId: string
  cambios?: {
    antes?: any
    despues?: any
  }
  ip?: string
  navegador?: string
  prioridad?: 'ALTA' | 'MEDIA' | 'BAJA'
}


// ========================================
// MÉTRICAS Y REPORTES
// ========================================
export interface MetricaProductividad {
  fecha: string
  pabellonId: string
  totalAves: number
  mortalidad: number
  huevosProducidos: number
  huevosPorAve: number
  eficiencia: number
}


export interface MetricaStock {
  sku: string
  cantidad: number
  minimo: number
  maximo: number
  estado: 'bajo' | 'normal' | 'alto'
}


// ========================================
// SYSTEM CONFIG
// ========================================
export interface SystemConfig {
  id: string
  nombreEmpresa: string
  direccion: string
  telefono: string
  email: string
  logo?: string
  tema: 'light' | 'dark'
  moneda: string
  idioma: string
  parametros?: {
    diasRetenciónAuditoria: number
    backupAutomaticoActivo: boolean
    frecuenciaBackup: 'diaria' | 'semanal' | 'mensual'
    notificacionesActivas: boolean
    mantenimientoActivo: boolean
  }
  createdAt?: any
  updatedAt?: any
}
