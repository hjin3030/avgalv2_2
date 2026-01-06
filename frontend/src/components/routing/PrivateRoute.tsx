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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, redirigir al login
  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }

  // Si no está activo, redirigir al login
  if (!profile.activo) {
    return <Navigate to="/login" replace />
  }

  // Verificar roles requeridos (si se especificaron)
  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(profile.rol)) {
      return <Navigate to="/sin-acceso" replace />
    }
  }

  // Verificar módulo requerido (si se especificó)
  if (requiredModule) {
    // Admin y superadmin tienen acceso a todo
    if (profile.rol === 'admin' || profile.rol === 'superadmin') {
      return children
    }

    // 1. Verificar en modulosPermitidos (campo específico de Firestore)
    if (profile.modulosPermitidos && profile.modulosPermitidos.includes(requiredModule)) {
      return children
    }

    // 2. Verificar en permisos construidos (fallback)
    if (profile.permisos && profile.permisos.includes(`module:${requiredModule}`)) {
      return children
    }

    // Si no tiene acceso, redirigir a home
    return <Navigate to="/home" replace />
  }

  // Si pasó todas las validaciones, mostrar el componente
  return children
}
