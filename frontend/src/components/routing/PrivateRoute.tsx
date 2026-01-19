// frontend/src/components/routing/PrivateRoute.tsx

import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

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

  // Loading mientras verifica autenticación/perfil
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // No autenticado
  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }

  // Usuario inactivo
  if (!profile.activo) {
    return <Navigate to="/login" replace />
  }

  // Validación de roles (cuando una ruta requiere roles específicos)
  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(profile.rol)) {
      return <Navigate to="/sin-acceso" replace />
    }
  }

  // Validación por módulo (Opción A: SOLO modulosPermitidos + bypass admin/superadmin)
  if (requiredModule) {
    // Admin y superadmin: acceso total a módulos
    if (profile.rol === 'admin' || profile.rol === 'superadmin') {
      return children
    }

    const allowed = Array.isArray(profile.modulosPermitidos)
      ? profile.modulosPermitidos
      : []

    if (!allowed.includes(requiredModule)) {
      return <Navigate to="/sin-acceso" replace />
    }
  }

  return children
}

export default PrivateRoute
