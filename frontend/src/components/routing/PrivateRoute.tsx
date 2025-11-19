// Archivo: frontend/src/components/routing/PrivateRoute.tsx

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface PrivateRouteProps {
  children: JSX.Element
  requiredRoles?: string[]
  requiredModule?: string
}

export function PrivateRoute({ 
  children, 
  requiredRoles, 
  requiredModule 
}: PrivateRouteProps) {
  const { user, profile, loading, canAccessModule, hasRole } = useAuth()
  
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
  
  // Verificar rol si es necesario
  if (requiredRoles && !hasRole(requiredRoles as any)) {
    return <Navigate to="/sin-acceso" replace />
  }
  
  // Verificar acceso al módulo si es necesario
  if (requiredModule && !canAccessModule(requiredModule)) {
    return <Navigate to="/sin-acceso" replace />
  }
  
  return children
}
