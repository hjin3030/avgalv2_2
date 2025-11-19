// Archivo: frontend/src/pages/auth/SinAcceso.tsx

import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function SinAcceso() {
  const navigate = useNavigate()
  const { logout, profile } = useAuth()
  
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }
  
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        {/* Icono */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
          <span className="text-5xl">🚫</span>
        </div>
        
        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Sin Acceso
        </h1>
        
        {/* Mensaje */}
        <div className="space-y-4 mb-6">
          <p className="text-gray-600">
            Tu usuario <strong>{profile?.nombre}</strong> con rol <strong className="text-blue-600">{profile?.rol}</strong> no tiene permisos asignados para acceder a ningún módulo del sistema.
          </p>
          
          <p className="text-sm text-gray-500">
            Por favor, contacta al administrador para que te asigne los permisos necesarios.
          </p>
        </div>
        
        {/* Botón */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </div>
  )
}
