// frontend/src/utils/constants.ts

// ========================================
// CONSTANTES DEL SISTEMA AVGAL v2.0
// ========================================
// Este archivo contiene SOLO datos INMUTABLES del sistema.
// Datos editables (Usuarios, Destinos, Transportistas, Pabellones, SKUs) están en Firestore.


// ===== ROLES Y PERMISOS =====

export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  COLABORADOR: 'colaborador',
  COLAB: 'colab'
} as const


export type UserRole = typeof ROLES[keyof typeof ROLES]


export interface RoleDef {
  key: UserRole
  label: string
  nivel: number
}


export const ROLES_DEFINITION: RoleDef[] = [
  { key: 'superadmin', label: 'Super Administrador', nivel: 5 },
  { key: 'admin', label: 'Administrador', nivel: 4 },
  { key: 'supervisor', label: 'Supervisor', nivel: 3 },
  { key: 'colaborador', label: 'Colaborador', nivel: 2 },
  { key: 'colab', label: 'Colab', nivel: 1 }
]


// ===== PERMISOS POR ROL =====

export const ROLE_PERMISSIONS = {
  superadmin: {
    canAccessAll: true,
    modules: ['home', 'dashboard', 'produccion', 'bodega', 'packing', 'exportaciones', 'reportes', 'analisis', 'historiales', 'configuracion'],
    actions: ['create', 'read', 'update', 'delete', 'approve', 'export']
  },
  admin: {
    canAccessAll: true,
    modules: ['home', 'dashboard', 'produccion', 'bodega', 'packing', 'exportaciones', 'reportes', 'analisis', 'historiales', 'configuracion'],
    actions: ['create', 'read', 'update', 'delete', 'approve', 'export']
  },
  supervisor: {
    canAccessAll: false,
    modules: ['home', 'dashboard', 'produccion', 'bodega', 'packing', 'exportaciones', 'reportes', 'analisis', 'historiales'],
    actions: ['create', 'read', 'update', 'export']
  },
  colaborador: {
    canAccessAll: false,
    modules: ['home', 'packing', 'produccion'], // Se asignan individualmente por usuario
    actions: ['read', 'create']
  },
    colab: {  
    canAccessAll: false,
    modules: ['home', 'bodega'],
    actions: ['read', 'create']
  }
}


// ===== MÓDULOS DEL SISTEMA =====

export const MODULES = {
  HOME: 'home',
  DASHBOARD: 'dashboard',
  PRODUCCION: 'produccion',
  BODEGA: 'bodega',
  PACKING: 'packing',
  EXPORTACIONES: 'exportaciones',
  REPORTES: 'reportes',
  ANALISIS: 'analisis',
  HISTORIALES: 'historiales',
  CONFIGURACION: 'configuracion'
} as const


export interface ModuloDef {
  key: string
  label: string
  icon: string
  descripcion: string
  requiereAprobacion?: boolean
}


export const MODULES_DEFINITION: ModuloDef[] = [
  { key: 'home', label: 'Inicio', icon: '🏠', descripcion: 'Página principal' },
  { key: 'dashboard', label: 'Dashboard', icon: '📊', descripcion: 'Resumen general del sistema' },
  { key: 'produccion', label: 'Producción', icon: '🥚', descripcion: 'Registro y gestión de producción' },
  { key: 'bodega', label: 'Bodega', icon: '📦', descripcion: 'Control de stock e inventario' },
  { key: 'packing', label: 'Packing', icon: '📋', descripcion: 'Gestión de empaque y clasificación' },
  { key: 'exportaciones', label: 'Exportaciones', icon: '📤', descripcion: 'Gestión de exportaciones' },
  { key: 'reportes', label: 'Reportes', icon: '📄', descripcion: 'Generación de reportes' },
  { key: 'analisis', label: 'Análisis', icon: '📈', descripcion: 'Análisis y datos' },
  { key: 'historiales', label: 'Historiales', icon: '🕒', descripcion: 'Historial de movimientos' },
  { key: 'configuracion', label: 'Configuración', icon: '⚙️', descripcion: 'Configuración del sistema' }
]


// ===== TIPOS DE VALES =====

export const TIPO_VALE = {
  INGRESO: 'ingreso',
  EGRESO: 'egreso',
  REINGRESO: 'reingreso'
} as const


export type TipoVale = typeof TIPO_VALE[keyof typeof TIPO_VALE]


export const TIPO_VALE_LABELS: Record<TipoVale, string> = {
  ingreso: 'Ingreso',
  egreso: 'Egreso',
  reingreso: 'Reingreso'
}


// ===== ESTADOS DE VALES =====

export const ESTADO_VALE = {
  PENDIENTE: 'pendiente',
  VALIDADO: 'validado',
  RECHAZADO: 'rechazado',
  ANULADO: 'anulado'
} as const


export type EstadoVale = typeof ESTADO_VALE[keyof typeof ESTADO_VALE]


export const ESTADO_VALE_LABELS: Record<EstadoVale, string> = {
  pendiente: 'Pendiente',
  validado: 'Validado',
  rechazado: 'Rechazado',
  anulado: 'Anulado'
}


export const ESTADO_VALE_COLORS: Record<EstadoVale, string> = {
  pendiente: '#FFA500',  // Naranja
  validado: '#00C851',   // Verde
  rechazado: '#ff4444',  // Rojo
  anulado: '#666666'     // Gris
}


// ===== LÓGICA DE APROBACIÓN DE VALES =====

export const VALES_CONFIG = {
  // INGRESO: requiere aprobación, cambia estado a "pendiente"
  ingreso: {
    requiereAprobacion: true,
    estadoInicial: 'pendiente',
    afectaStock: 'al_validar', // Suma stock cuando se valida
    requiereOrigen: false,
    requierePabellon: true,
    requiereDestino: false,
    requiereTransportista: false
  },
  // EGRESO: NO requiere aprobación, estado "validado" inmediato
  egreso: {
    requiereAprobacion: false,
    estadoInicial: 'validado',
    afectaStock: 'inmediato', // Resta stock al crear
    requiereOrigen: false,
    requierePabellon: true,
    requiereDestino: true,
    requiereTransportista: false // Opcional
  },
  // REINGRESO: requiere aprobación, estado "pendiente"
  reingreso: {
    requiereAprobacion: true,
    estadoInicial: 'pendiente',
    afectaStock: 'al_validar', // Suma stock cuando se valida
    requiereOrigen: true,
    requierePabellon: true,
    requiereDestino: true,
    requiereTransportista: false // Opcional
  }
}


// ===== TIPOS DE MOVIMIENTOS =====

export const TIPO_MOVIMIENTO = {
  INGRESO: 'ingreso',
  EGRESO: 'egreso',
  REINGRESO: 'reingreso',
  AJUSTE: 'ajuste'
} as const


export type TipoMovimiento = typeof TIPO_MOVIMIENTO[keyof typeof TIPO_MOVIMIENTO]


// ===== CONFIGURACIÓN GENERAL =====

export const APP_CONFIG = {
  nombre: 'AVGAL',
  version: '2.0.0',
  descripcion: 'Sistema de Gestión Avícola',
  empresa: 'AVGAL',
  
  // Valores por defecto
  defaults: {
    paginacion: 20,
    timeoutSession: 3600000, // 1 hora en ms
    formatoFecha: 'DD/MM/YYYY',
    formatoHora: 'HH:mm:ss',
    
    // Valores por defecto para producción
    metaProduccionPorAve: 0.85, // 85% promedio
    alertaMermaMax: 5, // 5% máximo
    
    // Stock mínimo por defecto
    stockMinimoDefault: 50
  },
  
  // Colores del sistema
  colors: {
    primary: '#1976d2',
    secondary: '#dc004e',
    success: '#00C851',
    warning: '#FFA500',
    error: '#ff4444',
    info: '#33b5e5',
    
    // Colores para SKUs (UI)
    skuBlanco: '#FFFFFF',
    skuColor: '#D4A574',
    skuMixto: '#CCCCCC'
  }
}


// ===== VALIDACIONES =====

export const VALIDATIONS = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Email inválido'
  },
  password: {
    minLength: 6,
    message: 'La contraseña debe tener al menos 6 caracteres'
  },
  telefono: {
    pattern: /^\+?[0-9]{8,15}$/,
    message: 'Teléfono inválido (8-15 dígitos)'
  },
  patente: {
    pattern: /^[A-Z0-9]{4,8}$/,
    message: 'Patente inválida (4-8 caracteres alfanuméricos)'
  },
  cantidades: {
    min: 0,
    message: 'La cantidad no puede ser negativa'
  }
}


// ===== FORMATOS DE EXPORTACIÓN =====

export const EXPORT_FORMATS = {
  PDF: 'pdf',
  EXCEL: 'excel',
  CSV: 'csv'
} as const


export type ExportFormat = typeof EXPORT_FORMATS[keyof typeof EXPORT_FORMATS]


// ===== MENSAJES DEL SISTEMA =====

export const MESSAGES = {
  success: {
    create: 'Registro creado exitosamente',
    update: 'Registro actualizado exitosamente',
    delete: 'Registro eliminado exitosamente',
    approve: 'Vale aprobado exitosamente',
    reject: 'Vale rechazado exitosamente'
  },
  error: {
    generic: 'Ha ocurrido un error. Por favor, intenta nuevamente.',
    notFound: 'Registro no encontrado',
    unauthorized: 'No tienes permisos para realizar esta acción',
    invalidData: 'Los datos ingresados no son válidos',
    stockInsuficiente: 'Stock insuficiente para realizar el egreso'
  },
  warning: {
    unsavedChanges: '¿Deseas salir sin guardar los cambios?',
    deleteConfirm: '¿Estás seguro de eliminar este registro?',
    lowStock: 'Stock bajo nivel mínimo'
  }
}


// ===== CATÁLOGO DE SKUs (INMUTABLE) =====
// Estos son los SKUs del sistema. Cuando se agrega/modifica uno en Firestore,
// debe reflejarse aquí para mantener consistencia.

export interface SkuCatalogItem {
  codigo: string
  nombre: string
  tipo: 'blanco' | 'color' | 'mixto'
  calibre: 'primera' | 'segunda' | 'tercera' | 'cuarta' | 'extra' | 'jumbo' | 'sucio' | 'super extra' | 'trizados' | 'merma' | 'sin calibre'
  unidadesPorCaja: number
  unidadesPorBandeja: number
}

export const SKU_CATALOG: Record<string, SkuCatalogItem> = {
  'BLA 1ERA': {
    codigo: 'BLA 1ERA',
    nombre: 'blanco 1era',
    tipo: 'blanco',
    calibre: 'primera',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },
  'BLA 2DA': {
    codigo: 'BLA 2DA',
    nombre: 'blanco 2da',
    tipo: 'blanco',
    calibre: 'segunda',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },
  'BLA 3ERA': {
    codigo: 'BLA 3ERA',
    nombre: 'blanco 3era',
    tipo: 'blanco',
    calibre: 'tercera',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },
  'BLA 4TA': {
    codigo: 'BLA 4TA',
    nombre: 'blanco 4ta',
    tipo: 'blanco',
    calibre: 'cuarta',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },
  'BLA EXTRA': {
    codigo: 'BLA EXTRA',
    nombre: 'blanco extra',
    tipo: 'blanco',
    calibre: 'extra',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },
  'BLA JUMBO': {
    codigo: 'BLA JUMBO',
    nombre: 'blanco jumbo',
    tipo: 'blanco',
    calibre: 'jumbo',
    unidadesPorCaja: 100,
    unidadesPorBandeja: 20
  },
  'BLA MAN': {
    codigo: 'BLA MAN',
    nombre: 'blanco sucio',
    tipo: 'blanco',
    calibre: 'sucio',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },
  'BLA SINCAL': {
    codigo: 'BLA SINCAL',
    nombre: 'blanco sin calibrar',
    tipo: 'blanco',
    calibre: 'sin calibre',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },
  'BLA SUPER': {
    codigo: 'BLA SUPER',
    nombre: 'blanco super',
    tipo: 'blanco',
    calibre: 'super extra',
    unidadesPorCaja: 100,
    unidadesPorBandeja: 20
  },
  'BLA TRI': {
    codigo: 'BLA TRI',
    nombre: 'blanco trizado',
    tipo: 'blanco',
    calibre: 'trizados',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },

  'COL 1ERA': {
    codigo: 'COL 1ERA',
    nombre: 'color 1era',
    tipo: 'color',
    calibre: 'primera',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },
  'COL 2DA': {
    codigo: 'COL 2DA',
    nombre: 'color 2da',
    tipo: 'color',
    calibre: 'segunda',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },
  'COL 3ERA': {
    codigo: 'COL 3ERA',
    nombre: 'color 3era',
    tipo: 'color',
    calibre: 'tercera',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },
  'COL 4TA': {
    codigo: 'COL 4TA',
    nombre: 'color 4ta',
    tipo: 'color',
    calibre: 'cuarta',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },
  'COL EXTRA': {
    codigo: 'COL EXTRA',
    nombre: 'color extra',
    tipo: 'color',
    calibre: 'extra',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },
  'COL JUMBO': {
    codigo: 'COL JUMBO',
    nombre: 'color jumbo',
    tipo: 'color',
    calibre: 'jumbo',
    unidadesPorCaja: 100,
    unidadesPorBandeja: 20
  },
  'COL MAN': {
    codigo: 'COL MAN',
    nombre: 'color sucio',
    tipo: 'color',
    calibre: 'sucio',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },
  'COL SINCAL': {
    codigo: 'COL SINCAL',
    nombre: 'color sin calibrar',
    tipo: 'color',
    calibre: 'sin calibre',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },
  'COL SUPER': {
    codigo: 'COL SUPER',
    nombre: 'color super',
    tipo: 'color',
    calibre: 'super extra',
    unidadesPorCaja: 100,
    unidadesPorBandeja: 20
  },
  'COL TRI': {
    codigo: 'COL TRI',
    nombre: 'color trizado',
    tipo: 'color',
    calibre: 'trizados',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },

  'DES': {
    codigo: 'DES',
    nombre: 'desecho',
    tipo: 'mixto',
    calibre: 'merma',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  },

  'OTRO': {
    codigo: 'OTRO',
    nombre: 'otro',
    tipo: 'mixto',
    calibre: 'merma',
    unidadesPorCaja: 180,
    unidadesPorBandeja: 30
  }
}




// Helper para obtener nombre del SKU
export const getSkuNombre = (codigo: string): string => {
  return SKU_CATALOG[codigo]?.nombre || 'Desconocido'
}


// Helper para obtener info completa del SKU
export const getSkuInfo = (codigo: string): SkuCatalogItem | null => {
  return SKU_CATALOG[codigo] || null
}


// Lista de códigos de SKU para validaciones
export const SKU_CODES = Object.keys(SKU_CATALOG)


/**
 * ✅ NUEVO: Factor de conversión para pérdida de producción
 * 1 unidad = 60 gramos
 * Usado para calcular unidades perdidas basado en peso de balde
 */
export const GRAMOS_POR_UNIDAD = 60


/**
 * Pabellones donde se aplica la pérdida por peso de balde
 */
export const PABELLONES_CON_PERDIDA = ['pabellon_13', 'pabellon_14', 'pabellon_15']


/**
 * ✅ CONFIGURACIÓN DE CONTADORES AUTOMÁTICOS DE PRODUCCIÓN
 * Cada pabellón automático tiene 3 líneas con 2 caras (A y B)
 * Total: 18 contadores (6 por pabellón)
 */

export interface ContadorConfig {
  id: number
  pabellonId: string
  pabellonNombre: string
  linea: number
  cara: 'A' | 'B'
  label: string
}


export const CONTADORES_PRODUCCION: ContadorConfig[] = [
  // Pabellón 14 (Contadores 1-6)
  { id: 1, pabellonId: 'pab14', pabellonNombre: 'Pabellón 14', linea: 1, cara: 'A', label: 'C1: Línea 1 Cara A' },
  { id: 2, pabellonId: 'pab14', pabellonNombre: 'Pabellón 14', linea: 1, cara: 'B', label: 'C2: Línea 1 Cara B' },
  { id: 3, pabellonId: 'pab14', pabellonNombre: 'Pabellón 14', linea: 2, cara: 'A', label: 'C3: Línea 2 Cara A' },
  { id: 4, pabellonId: 'pab14', pabellonNombre: 'Pabellón 14', linea: 2, cara: 'B', label: 'C4: Línea 2 Cara B' },
  { id: 5, pabellonId: 'pab14', pabellonNombre: 'Pabellón 14', linea: 3, cara: 'A', label: 'C5: Línea 3 Cara A' },
  { id: 6, pabellonId: 'pab14', pabellonNombre: 'Pabellón 14', linea: 3, cara: 'B', label: 'C6: Línea 3 Cara B' },
  
  // Pabellón 13 (Contadores 7-12)
  { id: 7, pabellonId: 'pab13', pabellonNombre: 'Pabellón 13', linea: 1, cara: 'A', label: 'C7: Línea 1 Cara A' },
  { id: 8, pabellonId: 'pab13', pabellonNombre: 'Pabellón 13', linea: 1, cara: 'B', label: 'C8: Línea 1 Cara B' },
  { id: 9, pabellonId: 'pab13', pabellonNombre: 'Pabellón 13', linea: 2, cara: 'A', label: 'C9: Línea 2 Cara A' },
  { id: 10, pabellonId: 'pab13', pabellonNombre: 'Pabellón 13', linea: 2, cara: 'B', label: 'C10: Línea 2 Cara B' },
  { id: 11, pabellonId: 'pab13', pabellonNombre: 'Pabellón 13', linea: 3, cara: 'A', label: 'C11: Línea 3 Cara A' },
  { id: 12, pabellonId: 'pab13', pabellonNombre: 'Pabellón 13', linea: 3, cara: 'B', label: 'C12: Línea 3 Cara B' },
  
  // Pabellón 15 (Contadores 13-18)
  { id: 13, pabellonId: 'pab15', pabellonNombre: 'Pabellón 15', linea: 1, cara: 'A', label: 'C13: Línea 1 Cara A' },
  { id: 14, pabellonId: 'pab15', pabellonNombre: 'Pabellón 15', linea: 1, cara: 'B', label: 'C14: Línea 1 Cara B' },
  { id: 15, pabellonId: 'pab15', pabellonNombre: 'Pabellón 15', linea: 2, cara: 'A', label: 'C15: Línea 2 Cara A' },
  { id: 16, pabellonId: 'pab15', pabellonNombre: 'Pabellón 15', linea: 2, cara: 'B', label: 'C16: Línea 2 Cara B' },
  { id: 17, pabellonId: 'pab15', pabellonNombre: 'Pabellón 15', linea: 3, cara: 'A', label: 'C17: Línea 3 Cara A' },
  { id: 18, pabellonId: 'pab15', pabellonNombre: 'Pabellón 15', linea: 3, cara: 'B', label: 'C18: Línea 3 Cara B' },
]


export const PABELLONES_AUTOMATICOS = ['pab14', 'pab13', 'pab15']
