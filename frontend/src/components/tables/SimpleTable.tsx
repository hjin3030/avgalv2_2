// frontend/src/components/tables/SimpleTable.tsx
import { useState, useMemo } from 'react'
import { formatNumber, formatBoolean, calcularOcupacion } from '@/lib/formatters'
import type { UserRole } from '@/types'

interface SimpleTableProps<T extends { id: string; activo: boolean }> {
  data: T[]
  columns: Array<{
    key: string
    label: string
    type?: 'number' | 'boolean' | 'text' | 'ocupacion'
  }>
  loading: boolean
  userRole?: UserRole
  renderCell?: (item: T, key: string) => React.ReactNode
  onToggleActive: (id: string, activo: boolean) => Promise<void>
  showFooter?: boolean
}

export default function SimpleTable<T extends { id: string; activo: boolean }>({
  data,
  columns,
  loading,
  userRole = 'colaborador',
  renderCell,
  onToggleActive,
  showFooter = true
}: SimpleTableProps<T>) {
  const [ordenCol, setOrdenCol] = useState<string>('')
  const [ordenAsc, setOrdenAsc] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)

  const canEdit = userRole === 'admin' || userRole === 'superadmin'

  // ========================================
  // ORDENAR DATOS
  // ========================================
  const datosOrdenados = useMemo(() => {
    if (!ordenCol) return data

    return [...data].sort((a, b) => {
      const aVal = (a as any)[ordenCol]
      const bVal = (b as any)[ordenCol]

      if (aVal === undefined || aVal === null) return 1
      if (bVal === undefined || bVal === null) return -1

      if (typeof aVal === 'string') {
        return ordenAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      if (aVal > bVal) return ordenAsc ? 1 : -1
      if (aVal < bVal) return ordenAsc ? -1 : 1
      return 0
    })
  }, [data, ordenCol, ordenAsc])

  // ========================================
  // RENDERIZAR VALOR DE CELDA
  // ========================================
  const renderCellValue = (item: T, col: any): React.ReactNode => {
    const value = (item as any)[col.key]

    if (renderCell) {
      return renderCell(item, col.key)
    }

    // Tipo ocupación (especial para pabellones)
    if (col.type === 'ocupacion') {
      const cantidad = (item as any)['cantidadTotal']
      const capacidad = (item as any)['capacidadTotal']
      return calcularOcupacion(cantidad, capacidad)
    }

    // Tipo número con separador de miles
    if (col.type === 'number' || typeof value === 'number') {
      return formatNumber(value)
    }

    // Tipo booleano (excepto activo)
    if (col.type === 'boolean' && typeof value === 'boolean') {
      return formatBoolean(value)
    }

    return value || '-'
  }

  // ========================================
  // CALCULAR TOTALES (FOOTER)
  // ========================================
  const totales = useMemo(() => {
    const result: any = {}

    columns.forEach((col) => {
      const valores = datosOrdenados.map((item) => (item as any)[col.key])

      // Sumar números
      if (col.type === 'number' || (valores && typeof valores[0] === 'number')) {
        result[col.key] = valores.reduce((sum, val) => {
          return sum + (typeof val === 'number' ? val : 0)
        }, 0)
      }
      // Contar no nulos
      else {
        result[col.key] = valores.filter((v) => v && v !== '-').length
      }
    })

    return result
  }, [datosOrdenados, columns])

  // ========================================
  // HANDLERS
  // ========================================
  const handleOrdenar = (col: string) => {
    setOrdenCol(col === ordenCol ? '' : col)
    setOrdenAsc(col === ordenCol ? !ordenAsc : true)
  }

  const handleToggle = async (id: string, nuevoEstado: boolean) => {
    if (!canEdit) return
    setProcesando(id)
    try {
      await onToggleActive(id, nuevoEstado)
    } finally {
      setProcesando(null)
    }
  }

  // ========================================
  // RENDER - ESTADOS
  // ========================================
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
      </div>
    )
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-gray-500">No hay datos</div>
  }

  // ========================================
  // RENDER - TABLA
  // ========================================
  return (
    <div className="overflow-x-auto border border-gray-200 rounded">
      <table className="w-full border-collapse text-sm" style={{ tableLayout: 'auto' }}>
        {/* HEADER */}
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleOrdenar(col.key)}
                className="px-4 py-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 border-b border-gray-200"
                style={{
                  textAlign: col.type === 'number' || col.type === 'ocupacion' ? 'right' : 'left'
                }}
              >
                <div className="flex items-center gap-2" style={{
                  justifyContent: col.type === 'number' || col.type === 'ocupacion' ? 'flex-end' : 'flex-start'
                }}>
                  {col.label}
                  {ordenCol === col.key && (
                    <span className="text-blue-600 text-xs">{ordenAsc ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
            ))}
            <th 
              className="px-4 py-3 font-semibold text-gray-700 cursor-default border-b border-gray-200"
              style={{ textAlign: 'center' }}
            >
              Activo
            </th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody>
          {datosOrdenados.map((item, idx) => (
            <tr
              key={item.id}
              className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}
            >
              {columns.map((col) => (
                <td
                  key={`${item.id}-${col.key}`}
                  className="px-4 py-3 text-gray-900"
                  style={{
                    textAlign: col.type === 'number' || col.type === 'ocupacion' ? 'right' : 'left'
                  }}
                >
                  {renderCellValue(item, col)}
                </td>
              ))}
              <td 
                className="px-4 py-3"
                style={{ textAlign: 'center' }}
              >
                <button
                  onClick={() => handleToggle(item.id, !item.activo)}
                  disabled={!canEdit || procesando === item.id}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                    item.activo ? 'bg-blue-600' : 'bg-gray-300'
                  } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      item.activo ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </td>
            </tr>
          ))}
        </tbody>

        {/* FOOTER - TOTALES */}
        {showFooter && (
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-300">
              {columns.map((col) => (
                <td
                  key={`total-${col.key}`}
                  className="px-4 py-3 font-semibold text-gray-900"
                  style={{
                    textAlign: col.type === 'number' || col.type === 'ocupacion' ? 'right' : 'left'
                  }}
                >
                  {col.key === columns[0].key ? 'TOTAL' : formatNumber(totales[col.key])}
                </td>
              ))}
              <td 
                className="px-4 py-3 font-semibold text-gray-900"
                style={{ textAlign: 'center' }}
              >
                {datosOrdenados.length}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
