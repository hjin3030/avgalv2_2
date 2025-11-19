// Archivo: frontend/src/components/routing/PublicRoute.tsx

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface PublicRouteProps {
  children: JSX.Element
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  // Si ya está autenticado, redirigir al home
  if (user) {
    return <Navigate to="/home" replace />
  }
  
  return children
}
