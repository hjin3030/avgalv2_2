// frontend/src/components/routing/PrivateRoute.tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { ReactElement } from 'react'

interface PrivateRouteProps {
  children: ReactElement
  requiredRoles?: string[]
  requiredModule?: string
}

export function PrivateRoute({
  children,
  requiredRoles,
  requiredModule,
}: PrivateRouteProps) {
  const { user, profile, loading } = useAuth()

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, redirigir a login
  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }

  // Si el usuario está inactivo, redirigir a sin-acceso
  if (!(profile as any).activo) {
    return <Navigate to="/sin-acceso" replace />
  }

  // Verificar rol si es necesario
  if (requiredRoles && !requiredRoles.includes(profile.rol)) {
    return <Navigate to="/sin-acceso" replace />
  }

  // Verificar acceso al módulo si es necesario
  if (requiredModule) {
    // Admin y superadmin tienen acceso total
    if (profile.rol === 'admin' || profile.rol === 'superadmin') {
      return children
    }

    // Obtener modulosPermitidos del documento de Firestore
    const modulosPermitidos = (profile as any).modulosPermitidos as string[] | undefined

    // Si tiene modulosPermitidos en Firestore y el módulo está ahí
    if (Array.isArray(modulosPermitidos) && modulosPermitidos.includes(requiredModule)) {
      return children
    }

    // Fallback: revisar permisos construidos del rol (aunque para colab no aplica)
    const permisos = (profile as any).permisos as string[] | undefined
    if (Array.isArray(permisos) && (permisos.includes('all') || permisos.includes(`module:${requiredModule}`))) {
      return children
    }

    // No tiene acceso
    return <Navigate to="/sin-acceso" replace />
  }

  return children
}
