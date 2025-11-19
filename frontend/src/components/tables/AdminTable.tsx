// frontend/src/components/tables/AdminTable.tsx
import { useState, useMemo } from 'react'
import type { UserRole } from '@/types'

// ========================================
// TIPOS Y CONFIGURACIÓN
// ========================================

export interface ColumnConfig<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
  width?: string
}

interface AdminTableProps<T extends { id: string; activo: boolean }> {
  data: T[]
  columns: ColumnConfig<T>[]
  loading: boolean
  searchPlaceholder?: string
  emptyMessage?: string
  userRole?: UserRole
  onToggleActive: (id: string, activo: boolean) => Promise<void>
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  searchKeys?: (keyof T)[] // Campos por los cuales se puede buscar
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function AdminTable<T extends { id: string; activo: boolean }>({
  data,
  columns,
  loading,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No hay datos para mostrar',
  userRole = 'colaborador',
  onToggleActive,
  onEdit,
  onDelete,
  searchKeys = []
}: AdminTableProps<T>) {
  // ========================================
  // ESTADOS
  // ========================================
  const [busqueda, setBusqueda] = useState('')
  const [ordenCol, setOrdenCol] = useState<string>('')
  const [ordenAsc, setOrdenAsc] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)

  // ========================================
  // PERMISOS POR ROL
  // ========================================
  const canEdit = userRole === 'admin' || userRole === 'superadmin'
  const canDelete = userRole === 'superadmin'

  // ========================================
  // BÚSQUEDA Y ORDENAMIENTO
  // ========================================
  const datosFiltrados = useMemo(() => {
    let resultado = [...data]

    // 🔍 FILTRADO POR BÚSQUEDA
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase().trim()
      resultado = resultado.filter((item) => {
        // Buscar en todos los campos especificados
        return searchKeys.some((key) => {
          const valor = item[key]
          if (typeof valor === 'string') {
            return valor.toLowerCase().includes(busquedaLower)
          }
          if (typeof valor === 'number') {
            return valor.toString().includes(busquedaLower)
          }
          return false
        })
      })
    }

    // 📊 ORDENAMIENTO POR COLUMNA
    if (ordenCol) {
      resultado.sort((a, b) => {
        const aVal = (a as any)[ordenCol]
        const bVal = (b as any)[ordenCol]

        // Manejar valores undefined/null
        if (aVal === undefined || aVal === null) return 1
        if (bVal === undefined || bVal === null) return -1

        // Comparar strings
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const comparison = aVal.localeCompare(bVal)
          return ordenAsc ? comparison : -comparison
        }

        // Comparar números o booleanos
        if (aVal > bVal) return ordenAsc ? 1 : -1
        if (aVal < bVal) return ordenAsc ? -1 : 1
        return 0
      })
    }

    return resultado
  }, [data, busqueda, ordenCol, ordenAsc, searchKeys])

  // ========================================
  // HANDLERS
  // ========================================
  const handleOrdenar = (col: string) => {
    if (ordenCol === col) {
      setOrdenAsc(!ordenAsc)
    } else {
      setOrdenCol(col)
      setOrdenAsc(true)
    }
  }

  const handleToggle = async (id: string, nuevoEstado: boolean) => {
    if (!canEdit) return
    
    setProcesando(id)
    try {
      await onToggleActive(id, nuevoEstado)
    } catch (error) {
      console.error('Error al cambiar estado:', error)
    } finally {
      setProcesando(null)
    }
  }

  // ========================================
  // RENDER
  // ========================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando datos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ========================================
          BARRA DE BÚSQUEDA
          ======================================== */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Contador de resultados */}
        <div className="text-sm text-gray-600">
          {datosFiltrados.length} {datosFiltrados.length === 1 ? 'registro' : 'registros'}
          {busqueda && ` (filtrado de ${data.length})`}
        </div>
      </div>

      {/* ========================================
          TABLA
          ======================================== */}
      {datosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="text-lg font-medium text-gray-700">{emptyMessage}</p>
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            {/* HEADER */}
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key.toString()}
                    onClick={() => col.sortable !== false && handleOrdenar(col.key.toString())}
                    className={`
                      px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider
                      ${col.sortable !== false ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}
                      ${col.width || ''}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {col.label}
                      {col.sortable !== false && ordenCol === col.key && (
                        <span className="text-blue-600 font-bold">
                          {ordenAsc ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}

                {/* Columna ACTIVO */}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Activo
                </th>

                {/* Columna ACCIONES (si aplica) */}
                {(canEdit || canDelete) && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>

            {/* BODY */}
            <tbody className="bg-white divide-y divide-gray-200">
              {datosFiltrados.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    !item.activo ? 'opacity-50' : ''
                  }`}
                >
                  {/* COLUMNAS DINÁMICAS */}
                  {columns.map((col) => (
                    <td
                      key={`${item.id}-${col.key.toString()}`}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {col.render
                        ? col.render(item)
                        : (item as any)[col.key]?.toString() || '-'}
                    </td>
                  ))}

                  {/* TOGGLE ACTIVO */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleToggle(item.id, !item.activo)}
                      disabled={!canEdit || procesando === item.id}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${item.activo ? 'bg-blue-600' : 'bg-gray-300'}
                      `}
                      title={canEdit ? (item.activo ? 'Desactivar' : 'Activar') : 'Sin permisos'}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${item.activo ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                      {procesando === item.id && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                        </div>
                      )}
                    </button>
                  </td>

                  {/* ACCIONES */}
                  {(canEdit || canDelete) && (
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center gap-2">
                        {canEdit && onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Editar"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        )}
                        {canDelete && onDelete && (
                          <button
                            onClick={() => onDelete(item)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Eliminar"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
