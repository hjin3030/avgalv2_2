// Archivo: frontend/src/utils/packingHelpers.ts
import type { Vale, ValeDetalle, Sku } from '@/types'

/**
 * Calcula el total de unidades empaquetadas en un vale
 */
export function calcularTotalEmpaquetado(detalles: ValeDetalle[]): number {
  return detalles.reduce((total, detalle) => total + detalle.totalUnidades, 0)
}

/**
 * Calcula el desglose total de cajas, bandejas y unidades
 * Retorna las cantidades individuales Y el total convertido a unidades
 */
export function calcularDesgloseTotales(detalles: ValeDetalle[]) {
  const totalCajas = detalles.reduce((sum, d) => sum + d.cajas, 0)
  const totalBandejas = detalles.reduce((sum, d) => sum + d.bandejas, 0)
  const totalUnidades = detalles.reduce((sum, d) => sum + d.unidades, 0)
  
  return {
    cajas: totalCajas,
    bandejas: totalBandejas,
    unidades: totalUnidades,
    totalUnidadesConvertidas: calcularTotalEmpaquetado(detalles)
  }
}

/**
 * Formatea el desglose para mostrar en tabla
 * Ejemplo: "10C, 7B, 18U"
 */
export function formatearDesglose(detalles: ValeDetalle[]): string {
  const { cajas, bandejas, unidades } = calcularDesgloseTotales(detalles)
  return `${cajas}C, ${bandejas}B, ${unidades}U`
}

/**
 * Agrupa detalles por tipo de huevo (blanco/color)
 */
export function agruparPorTipo(detalles: ValeDetalle[], skus: Sku[]) {
  const blanco = detalles.filter(d => {
    const sku = skus.find(s => s.codigo === d.sku)
    return sku?.tipo === 'blanco'
  })

  const color = detalles.filter(d => {
    const sku = skus.find(s => s.codigo === d.sku)
    return sku?.tipo === 'color'
  })

  return {
    blanco: {
      detalles: blanco,
      total: calcularTotalEmpaquetado(blanco)
    },
    color: {
      detalles: color,
      total: calcularTotalEmpaquetado(color)
    }
  }
}

/**
 * Valida que un vale de packing tenga datos válidos
 */
export function validarValePacking(vale: Partial<Vale>): { valido: boolean; errores: string[] } {
  const errores: string[] = []

  if (!vale.fecha) errores.push('Fecha es requerida')
  if (!vale.origenId) errores.push('Pabellón es requerido')
  if (!vale.detalles || vale.detalles.length === 0) {
    errores.push('Debe agregar al menos un SKU')
  }

  vale.detalles?.forEach((detalle, index) => {
    if (detalle.cajas < 0 || detalle.bandejas < 0 || detalle.unidades < 0) {
      errores.push(`Detalle ${index + 1}: Las cantidades no pueden ser negativas`)
    }
    if (detalle.totalUnidades === 0) {
      errores.push(`Detalle ${index + 1}: Debe ingresar al menos una cantidad`)
    }
  })

  return {
    valido: errores.length === 0,
    errores
  }
}

/**
 * Genera resumen de empaque por calibre
 */
export function generarResumenCalibre(detalles: ValeDetalle[], skus: Sku[]) {
  const resumen: Record<string, number> = {}

  detalles.forEach(detalle => {
    const sku = skus.find(s => s.codigo === detalle.sku)
    if (sku) {
      const calibre = sku.calibre
      resumen[calibre] = (resumen[calibre] || 0) + detalle.totalUnidades
    }
  })

  return resumen
}

/**
 * Calcula merma vs producción esperada
 */
export function calcularMerma(totalEmpaquetado: number, produccionEsperada: number): number {
  if (produccionEsperada === 0) return 0
  const merma = ((produccionEsperada - totalEmpaquetado) / produccionEsperada) * 100
  return Math.max(0, merma)
}

/**
 * Formatea un vale para exportación (TXT)
 */
export function formatearValeParaExportacion(vale: Vale, nombrePabellon: string, getNombreSku: (codigo: string) => string): string {
  const desglose = calcularDesgloseTotales(vale.detalles)
  
  return `
═══════════════════════════════════════════════════════════
                    VALE DE INGRESO A BODEGA
═══════════════════════════════════════════════════════════

VALE N°: ${vale.numeroGlobal || 'N/A'}
TIPO: ${vale.tipo.toUpperCase()} #${vale.correlativoDia || 'N/A'}
ID Sistema: ${vale.id?.substring(0, 8).toUpperCase() || 'N/A'}
Estado: ${vale.estado.toUpperCase()}

═══════════════════════════════════════════════════════════
                    INFORMACIÓN GENERAL
═══════════════════════════════════════════════════════════

Fecha: ${vale.fecha}
Hora: ${vale.hora}
Usuario: ${vale.usuarioCreadorNombre}
Rol: ${vale.usuarioCreadorRol || 'N/A'}

═══════════════════════════════════════════════════════════
                    ORIGEN Y DESTINO
═══════════════════════════════════════════════════════════

ORIGEN
  Tipo: Packing
  Pabellón: ${nombrePabellon}

DESTINO
  Tipo: Bodega Principal

═══════════════════════════════════════════════════════════
                 PRODUCTOS EMPAQUETADOS
═══════════════════════════════════════════════════════════

${vale.detalles.map((d, idx) => `
${idx + 1}. ${d.sku} - ${getNombreSku(d.sku)}
   Cajas: ${d.cajas} | Bandejas: ${d.bandejas} | Unidades: ${d.unidades}
   TOTAL: ${d.totalUnidades.toLocaleString()} unidades
`).join('\n')}

═══════════════════════════════════════════════════════════
                    RESUMEN TOTAL
═══════════════════════════════════════════════════════════

Desglose: ${desglose.cajas}C, ${desglose.bandejas}B, ${desglose.unidades}U
TOTAL EMPAQUETADO: ${desglose.totalUnidadesConvertidas.toLocaleString()} UNIDADES

═══════════════════════════════════════════════════════════
${vale.comentario ? `
COMENTARIOS:
${vale.comentario}

═══════════════════════════════════════════════════════════
` : ''}

Documento generado: ${new Date().toLocaleString('es-CL')}
Sistema de Gestión Avícola - AVGAL v2
  `.trim()
}

/**
 * Formatea un vale para exportación CSV
 */
export function formatearValeParaCSV(vale: Vale, nombrePabellon: string, getNombreSku: (codigo: string) => string): string {
  const desglose = calcularDesgloseTotales(vale.detalles)
  
  const header = 'Vale N°,Tipo,Correlativo Día,Fecha,Hora,Usuario,Rol,Pabellón,SKU,Nombre SKU,Cajas,Bandejas,Unidades,Total Unidades,Estado,Comentario\n'
  
  const rows = vale.detalles.map(d => 
    `${vale.numeroGlobal || 'N/A'},${vale.tipo},${vale.correlativoDia || 'N/A'},${vale.fecha},${vale.hora},${vale.usuarioCreadorNombre},${vale.usuarioCreadorRol || 'N/A'},${nombrePabellon},${d.sku},${getNombreSku(d.sku)},${d.cajas},${d.bandejas},${d.unidades},${d.totalUnidades},${vale.estado},"${vale.comentario || ''}"`
  ).join('\n')
  
  const totalRow = `\nTOTAL,,,,,,,,TOTAL,${desglose.cajas},${desglose.bandejas},${desglose.unidades},${desglose.totalUnidadesConvertidas},,`
  
  return header + rows + totalRow
}
