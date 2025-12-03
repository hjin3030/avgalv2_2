// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PublicRoute } from './components/routing/PublicRoute'
import { PrivateRoute } from './components/routing/PrivateRoute'
import { SidebarProvider } from './contexts/SidebarContext'
import AppLayout from './components/layout/AppLayout'

// Pages - Importar TODAS las páginas reales
import Login from './pages/auth/login'
import SinAcceso from './pages/auth/sinacceso'
import Home from './pages/home/home'
import Dashboard from './pages/dashboard/dashboard'
import Packing from './pages/packing/packing'
import Configuracion from './pages/configuracion/configuracion'
import Bodega from './pages/bodega/bodega'
import Produccion from './pages/produccion/produccion'
import TestFirestore from './pages/test-firestore'

// Placeholder pages (se implementarán después)
function Analisis() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Análisis y Datos</h1>
      <p>Reportes e historiales</p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <SidebarProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/sin-acceso" element={<SinAcceso />} />

          {/* Rutas privadas con Layout */}
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <AppLayout>
                  <Navigate to="/home" replace />
                </AppLayout>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/home" 
            element={
              <PrivateRoute requiredModule="home">
                <AppLayout>
                  <Home />
                </AppLayout>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute requiredModule="dashboard">
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/produccion" 
            element={
              <PrivateRoute requiredModule="produccion">
                <AppLayout>
                  <Produccion />
                </AppLayout>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/packing" 
            element={
              <PrivateRoute requiredModule="packing">
                <AppLayout>
                  <Packing />
                </AppLayout>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/bodega" 
            element={
              <PrivateRoute requiredModule="bodega">
                <AppLayout>
                  <Bodega />
                </AppLayout>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/analisis" 
            element={
              <PrivateRoute requiredModule="analisis">
                <AppLayout>
                  <Analisis />
                </AppLayout>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/configuracion" 
            element={
              <PrivateRoute requiredModule="configuracion">
                <AppLayout>
                  <Configuracion />
                </AppLayout>
              </PrivateRoute>
            } 
          />

          {/* ========================================
               RUTA DE TEST (SOLO DESARROLLO)
               ======================================== */}
          <Route 
            path="/test-firestore" 
            element={
              <PrivateRoute>
                <TestFirestore />
              </PrivateRoute>
            } 
          />

          {/* Ruta 404 - Redirigir a home */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </SidebarProvider>
    </BrowserRouter>
  )
}

export default App
