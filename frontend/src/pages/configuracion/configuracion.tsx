// frontend/src/pages/configuracion/configuracion.tsx

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSkus } from '@/hooks/useSkus'
import { usePabellones } from '@/hooks/usePabellones'
import { useDestinos } from '@/hooks/useDestinos'
import { useOrigenes } from '@/hooks/useOrigenes'
import { useTransportistas } from '@/hooks/useTransportistas'
import { useAuditLog } from '@/hooks/useAuditLog'
import SimpleTable from '@/components/tables/SimpleTable'
import ConfirmChangeModal from '@/components/configuracion/ConfirmChangeModal'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'

type TabType = 'skus' | 'pabellones' | 'destinos' | 'origenes' | 'transportistas'

export default function Configuracion() {
  const { profile } = useAuth()
  const { registrarCambio } = useAuditLog()

  const [tabActiva, setTabActiva] = useState<TabType>('skus')
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [cambiosPendientes, setCambiosPendientes] = useState<{
    id: string
    modulo: string
    nombre: string
    activo: boolean
    activoAnterior: boolean
  } | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Hooks de datos
  const { skus, loading: loadingSkus, toggleActiveSku } = useSkus()
  const { pabellones, loading: loadingPabellones, toggleActivePabellon } = usePabellones()
  const { destinos, loading: loadingDestinos, toggleActiveDestino } = useDestinos()
  const { origenes, loading: loadingOrigenes, toggleActiveOrigen } = useOrigenes()
  const { transportistas, loading: loadingTransportistas, toggleActiveTransportista } = useTransportistas()

  // Validar acceso
  if (profile?.rol !== 'admin' && profile?.rol !== 'superadmin') {
    return (
      <div className="p-8">
        <Alert tipo="error" titulo="Acceso Denegado">
          Solo administradores pueden acceder.
        </Alert>
      </div>
    )
  }

  // ========================================
  // HANDLERS CON CONFIRMACIÓN
  // ========================================
  const handleToggleConConfirmacion = (
    id: string,
    nombre: string,
    nuevoEstadoYaInvertido: boolean,  // ✅ Ya viene invertido desde SimpleTable
    modulo: string
  ) => {
    // ✅ CORRECCIÓN: El valor ya viene invertido desde SimpleTable (!item.activo)
    // Por lo tanto, nuevoEstadoYaInvertido ES el nuevo estado deseado
    // Y !nuevoEstadoYaInvertido ES el estado anterior
    setCambiosPendientes({
      id,
      modulo,
      nombre,
      activo: nuevoEstadoYaInvertido,           // ← Nuevo estado (ya invertido)
      activoAnterior: !nuevoEstadoYaInvertido   // ← Estado anterior (invertir de vuelta)
    })
    setModalAbierto(true)
  }

  const handleConfirmarCambio = async () => {
    if (!cambiosPendientes) return

    // Validar usuario
    if (!profile || !profile.uid || !profile.nombre) {
      setMensaje({
        tipo: 'error',
        texto: 'Error: No se puede identificar el usuario. Por favor, recarga la página.'
      })
      setModalAbierto(false)
      return
    }

    setGuardando(true)

    try {
      let resultado: any = null

      // Ejecutar el toggle según el módulo
      if (cambiosPendientes.modulo === 'skus') {
        resultado = await toggleActiveSku(cambiosPendientes.id, cambiosPendientes.activo)
      } else if (cambiosPendientes.modulo === 'pabellones') {
        resultado = await toggleActivePabellon(cambiosPendientes.id, cambiosPendientes.activo)
      } else if (cambiosPendientes.modulo === 'destinos') {
        resultado = await toggleActiveDestino(cambiosPendientes.id, cambiosPendientes.activo)
      } else if (cambiosPendientes.modulo === 'origenes') {
        resultado = await toggleActiveOrigen(cambiosPendientes.id, cambiosPendientes.activo)
      } else if (cambiosPendientes.modulo === 'transportistas') {
        resultado = await toggleActiveTransportista(cambiosPendientes.id, cambiosPendientes.activo)
      }

      if (resultado?.success) {
        // Registrar en auditoría
        await registrarCambio(
          profile,
          cambiosPendientes.modulo,
          cambiosPendientes.id,
          cambiosPendientes.activo ? 'Activado' : 'Desactivado',
          cambiosPendientes.activoAnterior,
          cambiosPendientes.activo
        )

        setMensaje({
          tipo: 'success',
          texto: `${cambiosPendientes.nombre} ${cambiosPendientes.activo ? 'activado' : 'desactivado'} correctamente`
        })
      } else {
        setMensaje({
          tipo: 'error',
          texto: resultado?.error || 'Error al guardar los cambios'
        })
      }

      setModalAbierto(false)
      setCambiosPendientes(null)
    } catch (error: any) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'Error inesperado'
      })
    } finally {
      setGuardando(false)
      setTimeout(() => setMensaje(null), 4000)
    }
  }

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="p-8 space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración de Maestros</h1>
        <p className="text-gray-600 mt-2">Gestiona la disponibilidad de constantes del sistema</p>
      </div>

      {/* ALERT */}
      {mensaje && (
        <Alert tipo={mensaje.tipo} onClose={() => setMensaje(null)} className="mb-6">
          {mensaje.texto}
        </Alert>
      )}

      {/* MAIN CARD */}
      <Card>
        {/* TABS */}
        <div className="flex border-b">
          {(['skus', 'pabellones', 'destinos', 'origenes', 'transportistas'] as TabType[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setTabActiva(tab)}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  tabActiva === tab
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            )
          )}
        </div>

        {/* CONTENT */}
        <div className="p-6">
          {/* SKUs */}
          {tabActiva === 'skus' && (
            <SimpleTable
              data={skus}
              columns={[
                { key: 'codigo', label: 'Código' },
                { key: 'nombre', label: 'Nombre' },
                { key: 'tipo', label: 'Tipo' },
                { key: 'calibre', label: 'Calibre' },
                { key: 'unidadesPorCaja', label: 'U/Caja', type: 'number' },
                { key: 'unidadesPorBandeja', label: 'U/Bandeja', type: 'number' }
              ]}
              loading={loadingSkus}
              userRole={profile?.rol}
              onToggleActive={(id, nuevoEstadoYaInvertido) => {
                const sku = skus.find((s) => s.id === id)
                if (sku) {
                  handleToggleConConfirmacion(id, sku.nombre, nuevoEstadoYaInvertido, 'skus')
                }
              }}
              showFooter
            />
          )}

          {/* Pabellones */}
          {tabActiva === 'pabellones' && (
            <SimpleTable
              data={pabellones}
              columns={[
                { key: 'nombre', label: 'Nombre' },
                { key: 'totalLineas', label: 'Líneas', type: 'number' },
                { key: 'capacidadTotal', label: 'Capacidad Total', type: 'number' },
                { key: 'cantidadTotal', label: 'Cantidad Actual', type: 'number' },
                { key: 'ocupacion', label: '% Ocupación', type: 'ocupacion' },
                { key: 'automatico', label: 'Automático', type: 'boolean' }
              ]}
              loading={loadingPabellones}
              userRole={profile?.rol}
              onToggleActive={(id, nuevoEstadoYaInvertido) => {
                const pab = pabellones.find((p) => p.id === id)
                if (pab) {
                  handleToggleConConfirmacion(id, pab.nombre, nuevoEstadoYaInvertido, 'pabellones')
                }
              }}
              showFooter
            />
          )}

          {/* Destinos */}
          {tabActiva === 'destinos' && (
            <SimpleTable
              data={destinos}
              columns={[
                { key: 'nombre', label: 'Nombre' },
                { key: 'tipo', label: 'Tipo' },
                { key: 'comuna', label: 'Comuna' },
                { key: 'direccion', label: 'Dirección' },
                { key: 'telefono', label: 'Teléfono' }
              ]}
              loading={loadingDestinos}
              userRole={profile?.rol}
              onToggleActive={(id, nuevoEstadoYaInvertido) => {
                const dest = destinos.find((d) => d.id === id)
                if (dest) {
                  handleToggleConConfirmacion(id, dest.nombre, nuevoEstadoYaInvertido, 'destinos')
                }
              }}
              showFooter
            />
          )}

          {/* Orígenes */}
          {tabActiva === 'origenes' && (
            <SimpleTable
              data={origenes}
              columns={[{ key: 'nombre', label: 'Nombre' }]}
              loading={loadingOrigenes}
              userRole={profile?.rol}
              onToggleActive={(id, nuevoEstadoYaInvertido) => {
                const ori = origenes.find((o) => o.id === id)
                if (ori) {
                  handleToggleConConfirmacion(id, ori.nombre, nuevoEstadoYaInvertido, 'origenes')
                }
              }}
              showFooter
            />
          )}

          {/* Transportistas */}
          {tabActiva === 'transportistas' && (
            <SimpleTable
              data={transportistas}
              columns={[
                { key: 'nombre', label: 'Nombre' },
                { key: 'vehiculo', label: 'Vehículo' },
                { key: 'patente', label: 'Patente' },
                { key: 'interno', label: 'Interno', type: 'boolean' },
                { key: 'telefono', label: 'Teléfono' }
              ]}
              loading={loadingTransportistas}
              userRole={profile?.rol}
              onToggleActive={(id, nuevoEstadoYaInvertido) => {
                const trans = transportistas.find((t) => t.id === id)
                if (trans) {
                  handleToggleConConfirmacion(id, trans.nombre, nuevoEstadoYaInvertido, 'transportistas')
                }
              }}
              showFooter
            />
          )}
        </div>
      </Card>

      {/* MODAL DE CONFIRMACIÓN */}
      <ConfirmChangeModal
        isOpen={modalAbierto}
        cambio={cambiosPendientes}
        onConfirm={handleConfirmarCambio}
        onCancel={() => {
          setModalAbierto(false)
          setCambiosPendientes(null)
        }}
        isLoading={guardando}
      />
    </div>
  )
}
