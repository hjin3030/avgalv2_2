// frontend/src/components/layout/AppLayout.tsx
import { Outlet } from 'react-router-dom'
import { useSidebar } from '@/contexts/SidebarContext'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function AppLayout() {
  const { isOpen } = useSidebar()

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      {/* Main content area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        isOpen ? 'lg:ml-64' : 'lg:ml-64'
      }`}>
        <Navbar />
        
        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet /> {/* ← ESTO RENDERIZA LAS PÁGINAS */}
        </main>
      </div>
    </div>
  )
}
