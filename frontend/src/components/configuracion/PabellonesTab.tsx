// frontend/src/components/configuracion/PabellonesTab.tsx
import { useCallback, useState } from 'react'
import AdminTable, { ColumnConfig } from '@/components/tables/AdminTable'
import { usePabellones } from '@/hooks/usePabellones'
import type { Pabellon, UserRole } from '@/types'

interface PabellonesTabProps {
  userRole?: UserRole
  onMessage: (msg: { tipo: 'success' | 'error'; texto: string }) => void
}

export default function PabellonesTab({ userRole = 'colaborador', onMessage }: PabellonesTabProps) {
  const { pabellones, loading, toggleActivePabellon, deletePabellon } = usePabellones()
  const [editandoId, setEditandoId] = useState<string | null>(null)

  // ========================================
  // COLUMNAS
  // ========================================
  const columnasPabellones: ColumnConfig<Pabellon>[] = [
    {
      key: 'nombre',
      label: 'Nombre',
      sortable: true,
      width: 'w-40'
    },
    {
      key: 'capacidadTotal',
      label: 'Capacidad Total',
      sortable: true,
      render: (p) => (
        <span className="font-mono text-sm">{p.capacidadTotal?.toLocaleString() || '—'}</span>
      )
    },
    {
      key: 'cantidadTotal',
      label: 'Cantidad Actual',
      sortable: true,
      render: (p) => (
        <span className="font-mono text-sm font-medium">{p.cantidadTotal?.toLocaleString() || '0'}</span>
      )
    },
    {
      key: 'totalLineas',
      label: 'Líneas',
      sortable: true,
      render: (p) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {p.totalLineas}
        </span>
      )
    },
    {
      key: 'automatico',
      label: 'Automático',
      sortable: true,
      render: (p) => (
        <span className={`inline-block w-3 h-3 rounded-full ${p.automatico ? 'bg-green-500' : 'bg-gray-300'}`} 
              title={p.automatico ? 'Sí' : 'No'} />
      )
    }
  ]

  // ========================================
  // HANDLERS
  // ========================================
  const handleToggleActive = useCallback(
    async (id: string, activo: boolean) => {
      try {
        const result = await toggleActivePabellon(id, activo)
        if (result.success) {
          onMessage({
            tipo: 'success',
            texto: `Pabellón ${activo ? 'activado' : 'desactivado'} correctamente`
          })
        } else {
          onMessage({
            tipo: 'error',
            texto: result.error || 'Error al cambiar estado del pabellón'
          })
        }
      } catch (error: any) {
        onMessage({
          tipo: 'error',
          texto: error.message || 'Error inesperado'
        })
      }
    },
    [toggleActivePabellon, onMessage]
  )

  const handleEdit = useCallback((pabellon: Pabellon) => {
    setEditandoId(pabellon.id)
    console.log('Editar Pabellón:', pabellon)
  }, [])

  const handleDelete = useCallback(
    async (pabellon: Pabellon) => {
      if (!confirm(`¿Estás seguro de que deseas eliminar el pabellón ${pabellon.nombre}?`)) {
        return
      }

      try {
        const result = await deletePabellon(pabellon.id)
        if (result.success) {
          onMessage({
            tipo: 'success',
            texto: 'Pabellón eliminado correctamente'
          })
        } else {
          onMessage({
            tipo: 'error',
            texto: result.error || 'Error al eliminar pabellón'
          })
        }
      } catch (error: any) {
        onMessage({
          tipo: 'error',
          texto: error.message || 'Error inesperado'
        })
      }
    },
    [deletePabellon, onMessage]
  )

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="space-y-4">
      <AdminTable
        data={pabellones}
        columns={columnasPabellones}
        loading={loading}
        searchPlaceholder="Buscar pabellón por nombre..."
        emptyMessage="No hay pabellones registrados"
        userRole={userRole}
        onToggleActive={handleToggleActive}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchKeys={['nombre']}
      />
    </div>
  )
}
