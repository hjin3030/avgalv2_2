// frontend/src/components/configuracion/OrigenesTab.tsx
import { useCallback, useState } from 'react'
import AdminTable, { ColumnConfig } from '@/components/tables/AdminTable'
import { useOrigenes } from '@/hooks/useOrigenes'
import type { Origen, UserRole } from '@/types'

interface OrigenesTabProps {
  userRole?: UserRole
  onMessage: (msg: { tipo: 'success' | 'error'; texto: string }) => void
}

export default function OrigenesTab({ userRole = 'colaborador', onMessage }: OrigenesTabProps) {
  const { origenes, loading, toggleActiveOrigen, deleteOrigen } = useOrigenes()
  const [editandoId, setEditandoId] = useState<string | null>(null)

  // ========================================
  // COLUMNAS
  // ========================================
  const columnasOrigenes: ColumnConfig<Origen>[] = [
    {
      key: 'nombre',
      label: 'Nombre',
      sortable: true,
      width: 'w-64'
    },
    {
      key: 'observaciones',
      label: 'Observaciones',
      sortable: false,
      render: (o) => (
        <span className="text-gray-600 truncate max-w-xs">
          {o.observaciones || '—'}
        </span>
      )
    }
  ]

  // ========================================
  // HANDLERS
  // ========================================
  const handleToggleActive = useCallback(
    async (id: string, activo: boolean) => {
      try {
        const result = await toggleActiveOrigen(id, activo)
        if (result.success) {
          onMessage({
            tipo: 'success',
            texto: `Origen ${activo ? 'activado' : 'desactivado'} correctamente`
          })
        } else {
          onMessage({
            tipo: 'error',
            texto: result.error || 'Error al cambiar estado del origen'
          })
        }
      } catch (error: any) {
        onMessage({
          tipo: 'error',
          texto: error.message || 'Error inesperado'
        })
      }
    },
    [toggleActiveOrigen, onMessage]
  )

  const handleEdit = useCallback((origen: Origen) => {
    setEditandoId(origen.id)
    console.log('Editar Origen:', origen)
  }, [])

  const handleDelete = useCallback(
    async (origen: Origen) => {
      if (!confirm(`¿Estás seguro de que deseas eliminar el origen ${origen.nombre}?`)) {
        return
      }

      try {
        const result = await deleteOrigen(origen.id)
        if (result.success) {
          onMessage({
            tipo: 'success',
            texto: 'Origen eliminado correctamente'
          })
        } else {
          onMessage({
            tipo: 'error',
            texto: result.error || 'Error al eliminar origen'
          })
        }
      } catch (error: any) {
        onMessage({
          tipo: 'error',
          texto: error.message || 'Error inesperado'
        })
      }
    },
    [deleteOrigen, onMessage]
  )

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="space-y-4">
      <AdminTable
        data={origenes}
        columns={columnasOrigenes}
        loading={loading}
        searchPlaceholder="Buscar origen por nombre..."
        emptyMessage="No hay orígenes registrados"
        userRole={userRole}
        onToggleActive={handleToggleActive}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchKeys={['nombre']}
      />
    </div>
  )
}
