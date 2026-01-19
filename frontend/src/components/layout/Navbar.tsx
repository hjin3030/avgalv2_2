// frontend/src/components/layout/Navbar.tsx
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSidebar } from '@/contexts/SidebarContext'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { profile, logout } = useAuth()
  const { toggle } = useSidebar()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const getPageTitle = () => {
    const path = location.pathname.split('/')[1]
    const titles: Record<string, string> = {
      home: 'Inicio',
      dashboard: 'Dashboard',
      bodega: 'Bodega',
      packing: 'Packing',
      salaL: 'SalaL',
      produccion: 'Producción',
      configuracion: 'Configuración',
      'test-firestore': 'Pruebas Firestore'
    }
    return titles[path] || 'AVGAL'
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h2 className="text-xl font-semibold text-gray-900">{getPageTitle()}</h2>
      </div>

      {/* Right section - User menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{profile?.nombre}</p>
            <p className="text-xs text-gray-500 capitalize">{profile?.rol}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-semibold">
              {profile?.nombre?.charAt(0).toUpperCase()}
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${
              showUserMenu ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {showUserMenu && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{profile?.nombre}</p>
              <p className="text-xs text-gray-500">{profile?.email}</p>
              <p className="text-xs text-blue-600 capitalize mt-1">Rol: {profile?.rol}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
