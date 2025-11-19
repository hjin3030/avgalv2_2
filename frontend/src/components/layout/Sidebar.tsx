// frontend/src/components/layout/Sidebar.tsx

import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSidebar } from '@/contexts/SidebarContext'

interface ModuleItem {
  icon: string
  label: string
  path: string
  module: string
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, hasPermission, logout } = useAuth()
  const { isOpen, toggle } = useSidebar()

  // Módulos del sistema
  const modules: ModuleItem[] = [
    {
      icon: '🏠',
      label: 'Home',
      path: '/home',
      module: 'home' // Acceso público para todos
    },
    {
      icon: '📊',
      label: 'Dashboard',
      path: '/dashboard',
      module: 'dashboard'
    },
    {
      icon: '🏪',
      label: 'Bodega',
      path: '/bodega',
      module: 'bodega'
    },
    {
      icon: '📦',
      label: 'Packing',
      path: '/packing',
      module: 'packing'
    },
    {
      icon: '🏭',
      label: 'Producción',
      path: '/produccion',
      module: 'produccion'
    },
    {
      icon: '⚙️',
      label: 'Configuración',
      path: '/configuracion',
      module: 'configuracion'
    }
  ]

  // Filtrar módulos según permisos
  const availableModules = modules.filter((mod) => {
    // Home siempre disponible
    if (mod.module === 'home') return true
    // Verificar permiso de módulo
    return hasPermission(`module:${mod.module}`)
  })

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={toggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-gray-900 text-white z-30 
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
          w-64 flex flex-col
        `}
      >
        {/* Header del sidebar */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">AVGAL V2</h1>
              <p className="text-xs text-gray-400 mt-1">Sistema Avícola</p>
            </div>
            {/* Botón cerrar (solo mobile) */}
            <button
              onClick={toggle}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Perfil del usuario */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              {profile?.nombre?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.nombre || 'Usuario'}</p>
              <p className="text-xs text-gray-400 capitalize">{profile?.rol || 'Sin rol'}</p>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {availableModules.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <li key={item.path}>
                  <button
                    onClick={() => {
                      navigate(item.path)
                      // Cerrar sidebar en mobile después de navegar
                      if (window.innerWidth < 1024) {
                        toggle()
                      }
                    }}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-lg
                      transition-colors duration-200
                      ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }
                    `}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer con botón de logout */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 
                     bg-red-600 hover:bg-red-700 text-white rounded-lg 
                     transition-colors duration-200 font-medium"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>

        {/* Info de versión */}
        <div className="p-4 text-center text-xs text-gray-500">
          <p>AVGAL V2 © 2025</p>
          <p>Versión 2.0.0</p>
        </div>
      </aside>
    </>
  )
}
