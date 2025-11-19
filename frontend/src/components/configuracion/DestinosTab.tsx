// frontend/src/components/configuracion/DestinosTab.tsx
import { useCallback, useState } from 'react'
import AdminTable, { ColumnConfig } from '@/components/tables/AdminTable'
import { useDestinos } from '@/hooks/useDestinos'
import type { Destino, UserRole } from '@/types'

interface DestinosTabProps {
  userRole?: UserRole
  onMessage: (msg: { tipo: 'success' | 'error'; texto: string }) => void
}

export default function DestinosTab({ userRole = 'colaborador', onMessage }: DestinosTabProps) {
  const { destinos, loading, toggleActiveDestino, deleteDestino } = useDestinos()
  const [editandoId, setEditandoId] = useState<string | null>(null)

  // ========================================
  // COLUMNAS
  // ========================================
  const columnasDestinos: ColumnConfig<Destino>[] = [
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
      render: (d) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
          {d.tipo || '—'}
        </span>
      )
    },
    {
      key: 'comuna',
      label: 'Comuna',
      sortable: true,
      render: (d) => <span>{d.comuna || '—'}</span>
    },
    {
      key: 'telefono',
      label: 'Teléfono',
      sortable: false,
      render: (d) => <span>{d.telefono || '—'}</span>
    },
    {
      key: 'direccion',
      label: 'Dirección',
      sortable: false,
      render: (d) => (
        <span className="text-gray-600 truncate max-w-xs">
          {d.direccion || '—'}
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
        const result = await toggleActiveDestino(id, activo)
        if (result.success) {
          onMessage({
            tipo: 'success',
            texto: `Destino ${activo ? 'activado' : 'desactivado'} correctamente`
          })
        } else {
          onMessage({
            tipo: 'error',
            texto: result.error || 'Error al cambiar estado del destino'
          })
        }
      } catch (error: any) {
        onMessage({
          tipo: 'error',
          texto: error.message || 'Error inesperado'
        })
      }
    },
    [toggleActiveDestino, onMessage]
  )

  const handleEdit = useCallback((destino: Destino) => {
    setEditandoId(destino.id)
    console.log('Editar Destino:', destino)
  }, [])

  const handleDelete = useCallback(
    async (destino: Destino) => {
      if (!confirm(`¿Estás seguro de que deseas eliminar el destino ${destino.nombre}?`)) {
        return
      }

      try {
        const result = await deleteDestino(destino.id)
        if (result.success) {
          onMessage({
            tipo: 'success',
            texto: 'Destino eliminado correctamente'
          })
        } else {
          onMessage({
            tipo: 'error',
            texto: result.error || 'Error al eliminar destino'
          })
        }
      } catch (error: any) {
        onMessage({
          tipo: 'error',
          texto: error.message || 'Error inesperado'
        })
      }
    },
    [deleteDestino, onMessage]
  )

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="space-y-4">
      <AdminTable
        data={destinos}
        columns={columnasDestinos}
        loading={loading}
        searchPlaceholder="Buscar destino por nombre, tipo o comuna..."
        emptyMessage="No hay destinos registrados"
        userRole={userRole}
        onToggleActive={handleToggleActive}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchKeys={['nombre', 'tipo', 'comuna']}
      />
    </div>
  )
}
