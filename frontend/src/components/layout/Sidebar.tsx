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
  const { profile, hasPermission } = useAuth()
  const { isOpen, toggle } = useSidebar()

  const modules: ModuleItem[] = [
    { icon: '🏠', label: 'Home', path: '/home', module: 'home' },
    { icon: '📊', label: 'Dashboard', path: '/dashboard', module: 'dashboard' },
    { icon: '🏪', label: 'Bodega', path: '/bodega', module: 'bodega' },
    { icon: '📦', label: 'Packing', path: '/packing', module: 'packing' },
    { icon: '🏭', label: 'Producción', path: '/produccion', module: 'produccion' },
    { icon: '⚙️', label: 'Configuración', path: '/configuracion', module: 'configuracion' }
  ]

  const availableModules = modules.filter((mod) => {
    if (mod.module === 'home') return true
    if (profile?.rol === 'admin' || profile?.rol === 'superadmin') return true
    if (profile?.modulosPermitidos?.includes(mod.module)) return true
    return hasPermission(`module:${mod.module}`)
  })

  const handleNavigation = (path: string) => {
    navigate(path)
    if (window.innerWidth < 1024) toggle()
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-200 
        transition-transform lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">AVGAL</h1>
          </div>
          <button
            onClick={toggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Cerrar menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {availableModules.map((mod) => {
              const isActive = location.pathname === mod.path
              return (
                <button
                  key={mod.path}
                  onClick={() => handleNavigation(mod.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-xl">{mod.icon}</span>
                  <span className="text-sm">{mod.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-semibold text-sm">
                {profile?.nombre?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.nombre}
              </p>
              <p className="text-xs text-gray-500 capitalize">{profile?.rol}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
