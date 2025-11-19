// frontend/src/components/layout/Navbar.tsx

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSidebar } from '@/contexts/SidebarContext'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { profile, logout } = useAuth()
  const { toggle } = useSidebar()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Obtener título de página actual
  const getPageTitle = () => {
    const path = location.pathname.split('/')[1]
    const titles: Record<string, string> = {
      home: 'Bienvenido',
      dashboard: 'Dashboard',
      bodega: 'Bodega',
      packing: 'Packing',
      produccion: 'Producción',
      configuracion: 'Configuración',
      'test-firestore': 'Pruebas Firestore'
    }
    return titles[path] || 'Sistema de Gestión Avícola'
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Menu toggle + Page title */}
        <div className="flex items-center space-x-4">
          {/* Hamburger menu (solo visible en mobile) */}
          <button
            onClick={toggle}
            className="lg:hidden text-gray-600 hover:text-gray-900 focus:outline-none"
            aria-label="Toggle sidebar"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Page title */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {getPageTitle()}
            </h2>
            <p className="text-sm text-gray-500">Sistema de Gestión Avícola</p>
          </div>
        </div>

        {/* Right: Notifications + User menu */}
        <div className="flex items-center space-x-4">
          {/* Notifications bell */}
          <button
            className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
            aria-label="Notificaciones"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {/* Badge de notificaciones */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User menu dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 focus:outline-none"
            >
              {/* Avatar */}
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                {profile?.nombre?.charAt(0).toUpperCase() || 'U'}
              </div>
              {/* User info (hidden on mobile) */}
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-700">
                  {profile?.nombre || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {profile?.rol || 'Sin rol'}
                </p>
              </div>
              {/* Dropdown arrow */}
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <>
                {/* Overlay para cerrar */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />

                {/* Menu content */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  {/* User info en mobile */}
                  <div className="md:hidden px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700">
                      {profile?.nombre || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {profile?.rol || 'Sin rol'}
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="py-2">
                    <button
                      onClick={() => {
                        navigate('/home')
                        setShowUserMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      🏠 Inicio
                    </button>
                    <button
                      onClick={() => {
                        navigate('/configuracion')
                        setShowUserMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      ⚙️ Configuración
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      🚪 Cerrar Sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
