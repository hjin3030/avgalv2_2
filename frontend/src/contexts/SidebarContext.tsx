// Archivo: frontend/src/contexts/SidebarContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react'

interface SidebarContextType {
  isCollapsed: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
  openSidebar: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleSidebar = () => setIsCollapsed(prev => !prev)
  const closeSidebar = () => setIsCollapsed(true)
  const openSidebar = () => setIsCollapsed(false)

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, closeSidebar, openSidebar }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar debe usarse dentro de SidebarProvider')
  }
  return context
}
