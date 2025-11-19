// Archivo: frontend/src/main.tsx
// ACTUALIZAR

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SidebarProvider } from './contexts/SidebarContext'  // ← AGREGAR
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SidebarProvider>
      <App />
    </SidebarProvider>
  </StrictMode>,
)
