// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PublicRoute } from './components/routing/PublicRoute'
import { PrivateRoute } from './components/routing/PrivateRoute'
import { SidebarProvider } from './contexts/SidebarContext'
import AppLayout from './components/layout/AppLayout'


// Pages - Importar TODAS las páginas reales
import Login from './pages/auth/Login'
import SinAcceso from './pages/auth/SinAcceso'
import Home from './pages/home/Home'
import Packing from './pages/packing/Packing'
import Configuracion from './pages/configuracion/Configuracion'
import Bodega from './pages/bodega/Bodega'
import Produccion from './pages/produccion/Produccion'
import TestFirestore from './pages/test-firestore'


// Placeholder pages (se implementarán después)
function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>KPIs y métricas generales</p>
    </div>
  )
}


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
              <PrivateRoute module="home">
                <AppLayout>
                  <Home />
                </AppLayout>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute module="dashboard">
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/produccion" 
            element={
              <PrivateRoute module="produccion">
                <AppLayout>
                  <Produccion />
                </AppLayout>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/packing" 
            element={
              <PrivateRoute module="packing">
                <AppLayout>
                  <Packing />
                </AppLayout>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/bodega" 
            element={
              <PrivateRoute module="bodega">
                <AppLayout>
                  <Bodega />
                </AppLayout>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/analisis" 
            element={
              <PrivateRoute module="analisis">
                <AppLayout>
                  <Analisis />
                </AppLayout>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/configuracion" 
            element={
              <PrivateRoute module="configuracion">
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
