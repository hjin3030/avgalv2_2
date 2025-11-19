// frontend/src/components/configuracion/TransportistasTab.tsx
import { useCallback, useState } from 'react'
import AdminTable, { ColumnConfig } from '@/components/tables/AdminTable'
import { useTransportistas } from '@/hooks/useTransportistas'
import type { Transportista, UserRole } from '@/types'

interface TransportistasTabProps {
  userRole?: UserRole
  onMessage: (msg: { tipo: 'success' | 'error'; texto: string }) => void
}

export default function TransportistasTab({ 
  userRole = 'colaborador', 
  onMessage 
}: TransportistasTabProps) {
  const { transportistas, loading, toggleActiveTransportista, deleteTransportista } = useTransportistas()
  const [editandoId, setEditandoId] = useState<string | null>(null)

  // ========================================
  // COLUMNAS
  // ========================================
  const columnasTransportistas: ColumnConfig<Transportista>[] = [
    {
      key: 'nombre',
      label: 'Nombre',
      sortable: true,
      width: 'w-40'
    },
    {
      key: 'rut',
      label: 'RUT',
      sortable: true,
      render: (t) => (
        <span className="font-mono text-sm">{t.rut || '—'}</span>
      )
    },
    {
      key: 'vehiculo',
      label: 'Vehículo',
      sortable: true,
      render: (t) => <span>{t.vehiculo || '—'}</span>
    },
    {
      key: 'patente',
      label: 'Patente',
      sortable: true,
      render: (t) => (
        <span className="font-mono uppercase text-sm font-medium">
          {t.patente || '—'}
        </span>
      )
    },
    {
      key: 'interno',
      label: 'Interno',
      sortable: true,
      render: (t) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          t.interno ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
        }`}>
          {t.interno ? 'Sí' : 'No'}
        </span>
      )
    },
    {
      key: 'telefono',
      label: 'Teléfono',
      sortable: false,
      render: (t) => <span>{t.telefono || '—'}</span>
    }
  ]

  // ========================================
  // HANDLERS
  // ========================================
  const handleToggleActive = useCallback(
    async (id: string, activo: boolean) => {
      try {
        const result = await toggleActiveTransportista(id, activo)
        if (result.success) {
          onMessage({
            tipo: 'success',
            texto: `Transportista ${activo ? 'activado' : 'desactivado'} correctamente`
          })
        } else {
          onMessage({
            tipo: 'error',
            texto: result.error || 'Error al cambiar estado del transportista'
          })
        }
      } catch (error: any) {
        onMessage({
          tipo: 'error',
          texto: error.message || 'Error inesperado'
        })
      }
    },
    [toggleActiveTransportista, onMessage]
  )

  const handleEdit = useCallback((transportista: Transportista) => {
    setEditandoId(transportista.id)
    console.log('Editar Transportista:', transportista)
  }, [])

  const handleDelete = useCallback(
    async (transportista: Transportista) => {
      if (!confirm(`¿Estás seguro de que deseas eliminar al transportista ${transportista.nombre}?`)) {
        return
      }

      try {
        const result = await deleteTransportista(transportista.id)
        if (result.success) {
          onMessage({
            tipo: 'success',
            texto: 'Transportista eliminado correctamente'
          })
        } else {
          onMessage({
            tipo: 'error',
            texto: result.error || 'Error al eliminar transportista'
          })
        }
      } catch (error: any) {
        onMessage({
          tipo: 'error',
          texto: error.message || 'Error inesperado'
        })
      }
    },
    [deleteTransportista, onMessage]
  )

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="space-y-4">
      <AdminTable
        data={transportistas}
        columns={columnasTransportistas}
        loading={loading}
        searchPlaceholder="Buscar transportista por nombre, RUT o patente..."
        emptyMessage="No hay transportistas registrados"
        userRole={userRole}
        onToggleActive={handleToggleActive}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchKeys={['nombre', 'rut', 'patente', 'vehiculo']}
      />
    </div>
  )
}
