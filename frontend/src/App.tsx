// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PublicRoute } from './components/routing/PublicRoute'
import { PrivateRoute } from './components/routing/PrivateRoute'
import { SidebarProvider } from './contexts/SidebarContext'
import AppLayout from './components/layout/AppLayout'

import Login from './pages/auth/login'
import SinAcceso from './pages/auth/sinacceso'
import Home from './pages/home/home'
import Dashboard from './pages/dashboard/dashboard'
import Packing from './pages/packing/packing'
import Configuracion from './pages/configuracion/configuracion'
import Bodega from './pages/bodega/bodega'
import Produccion from './pages/produccion/produccion'
import TestFirestore from './pages/test-firestore'

function App() {
  return (
    <BrowserRouter>
      <SidebarProvider>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/sin-acceso" element={<SinAcceso />} />

          {/* Protected routes with layout */}
          <Route element={<AppLayout />}>
            <Route
              path="/home"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute requiredModule="dashboard">
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/bodega"
              element={
                <PrivateRoute requiredModule="bodega">
                  <Bodega />
                </PrivateRoute>
              }
            />
            <Route
              path="/packing"
              element={
                <PrivateRoute requiredModule="packing">
                  <Packing />
                </PrivateRoute>
              }
            />
            <Route
              path="/produccion"
              element={
                <PrivateRoute requiredModule="produccion">
                  <Produccion />
                </PrivateRoute>
              }
            />
            <Route
              path="/configuracion"
              element={
                <PrivateRoute requiredModule="configuracion" requiredRoles={['admin', 'superadmin']}>
                  <Configuracion />
                </PrivateRoute>
              }
            />
            <Route
              path="/test-firestore"
              element={
                <PrivateRoute requiredRoles={['superadmin']}>
                  <TestFirestore />
                </PrivateRoute>
              }
            />
          </Route>
        </Routes>
      </SidebarProvider>
    </BrowserRouter>
  )
}

export default App
