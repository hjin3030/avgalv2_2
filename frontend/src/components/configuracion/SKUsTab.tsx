// frontend/src/components/configuracion/SKUsTab.tsx
import { useCallback, useState } from 'react'
import AdminTable, { ColumnConfig } from '@/components/tables/AdminTable'
import { useSkus } from '@/hooks/useSkus'
import type { Sku, UserRole } from '@/types'

interface SKUsTabProps {
  userRole?: UserRole
  onMessage: (msg: { tipo: 'success' | 'error'; texto: string }) => void
}

export default function SKUsTab({ userRole = 'colaborador', onMessage }: SKUsTabProps) {
  const { skus, loading, toggleActiveSku, deleteSku } = useSkus()
  const [editandoId, setEditandoId] = useState<string | null>(null)

  // ========================================
  // COLUMNAS
  // ========================================
  const columnasSkus: ColumnConfig<Sku>[] = [
    {
      key: 'codigo',
      label: 'Código',
      sortable: true,
      width: 'w-32'
    },
    {
      key: 'nombre',
      label: 'Nombre',
      sortable: true,
      width: 'w-48'
    },
    {
      key: 'tipo',
      label: 'Tipo',
      sortable: true,
      render: (sku) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {sku.tipo}
        </span>
      )
    },
    {
      key: 'calibre',
      label: 'Calibre',
      sortable: true,
      render: (sku) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          {sku.calibre}
        </span>
      )
    },
    {
      key: 'unidadesPorCaja',
      label: 'U/Caja',
      sortable: true,
      render: (sku) => (
        <span className="font-mono text-sm font-medium">{sku.unidadesPorCaja}</span>
      )
    },
    {
      key: 'unidadesPorBandeja',
      label: 'U/Bandeja',
      sortable: true,
      render: (sku) => (
        <span className="font-mono text-sm font-medium">{sku.unidadesPorBandeja}</span>
      )
    }
  ]

  // ========================================
  // HANDLERS
  // ========================================
  const handleToggleActive = useCallback(
    async (id: string, activo: boolean) => {
      try {
        const result = await toggleActiveSku(id, activo)
        if (result.success) {
          onMessage({
            tipo: 'success',
            texto: `SKU ${activo ? 'activado' : 'desactivado'} correctamente`
          })
        } else {
          onMessage({
            tipo: 'error',
            texto: result.error || 'Error al cambiar estado del SKU'
          })
        }
      } catch (error: any) {
        onMessage({
          tipo: 'error',
          texto: error.message || 'Error inesperado'
        })
      }
    },
    [toggleActiveSku, onMessage]
  )

  const handleEdit = useCallback((sku: Sku) => {
    setEditandoId(sku.id)
    // Aquí irá la lógica para abrir modal/drawer de edición
    console.log('Editar SKU:', sku)
  }, [])

  const handleDelete = useCallback(
    async (sku: Sku) => {
      if (!confirm(`¿Estás seguro de que deseas eliminar el SKU ${sku.codigo}?`)) {
        return
      }

      try {
        const result = await deleteSku(sku.id)
        if (result.success) {
          onMessage({
            tipo: 'success',
            texto: 'SKU eliminado correctamente'
          })
        } else {
          onMessage({
            tipo: 'error',
            texto: result.error || 'Error al eliminar SKU'
          })
        }
      } catch (error: any) {
        onMessage({
          tipo: 'error',
          texto: error.message || 'Error inesperado'
        })
      }
    },
    [deleteSku, onMessage]
  )

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="space-y-4">
      <AdminTable
        data={skus}
        columns={columnasSkus}
        loading={loading}
        searchPlaceholder="Buscar por código o nombre..."
        emptyMessage="No hay SKUs registrados"
        userRole={userRole}
        onToggleActive={handleToggleActive}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchKeys={['codigo', 'nombre', 'tipo']}
      />
    </div>
  )
}
