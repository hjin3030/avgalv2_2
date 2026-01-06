// frontend/src/hooks/useAuth.ts

import { useState, useEffect, useCallback } from 'react'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { UserProfile, UserRole } from '@/types'

// Configuración de permisos por rol
type RolePermissionConfig = {
  modules?: string[]
  actions?: string[]
  canAccessAll?: boolean
}

const ROLE_PERMISSIONS: Record<string, RolePermissionConfig> = {
  superadmin: {
    modules: ['home', 'produccion', 'packing', 'bodega', 'dashboard', 'configuracion'],
    actions: ['create', 'read', 'update', 'delete'],
    canAccessAll: true,
  },
  admin: {
    modules: ['home', 'produccion', 'packing', 'bodega', 'dashboard', 'configuracion'],
    actions: ['create', 'read', 'update', 'delete'],
    canAccessAll: false,
  },
  supervisor: {
    modules: ['home', 'produccion', 'packing', 'bodega', 'dashboard'],
    actions: ['create', 'read', 'update'],
    canAccessAll: false,
  },
  colaborador: {
    modules: ['home', 'produccion', 'packing'],
    actions: ['create', 'read'],
    canAccessAll: false,
  },
  colab: {
    modules: ['home', 'bodega'],
    actions: ['create', 'read'],
    canAccessAll: false,
  },
}

function buildPermisosFromRole(role: UserRole): string[] {
  const roleConfig = ROLE_PERMISSIONS[role]
  if (!roleConfig) return []
  return [
    ...(roleConfig.modules || []).map((m: string) => `module:${m}`),
    ...(roleConfig.actions || []).map((a: string) => `action:${a}`),
    ...(roleConfig.canAccessAll ? ['all'] : []),
  ]
}

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUserProfile = useCallback(async (firebaseUser: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        
        // Construir permisos a partir de Firestore o del rol
        let permisos: string[] = []
        if (Array.isArray((data as any).permisos) && (data as any).permisos.length > 0) {
          permisos = (data as any).permisos
        } else if ((data as any).rol) {
          permisos = buildPermisosFromRole((data as any).rol as UserRole)
        }

        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          nombre: (data as any).nombre,
          email: (data as any).email,
          rol: (data as any).rol as UserRole,
          activo: (data as any).activo ?? true,
          permisos,
          modulosPermitidos: (data as any).modulosPermitidos || []
        }

        if (!userProfile.activo) {
          await signOut(auth)
          setUser(null)
          setProfile(null)
          setError('Usuario inactivo')
          return
        }

        setProfile(userProfile)
        setError(null)
      } else {
        setProfile(null)
        setError('Perfil de usuario no encontrado.')
      }
    } catch (err: any) {
      console.error('Error loading user profile:', err)
      setError(err.message || 'Error al cargar perfil de usuario')
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setUser(firebaseUser)
        if (firebaseUser) {
          await loadUserProfile(firebaseUser)
        } else {
          setProfile(null)
          setError(null)
        }
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [loadUserProfile])

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      await loadUserProfile(userCredential.user)
      setLoading(false)
      return { success: true }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message)
      setLoading(false)
      return { success: false, error: err.message }
    }
  }

  const logout = async () => {
    setLoading(true)
    setError(null)
    try {
      await signOut(auth)
      setUser(null)
      setProfile(null)
      setLoading(false)
    } catch (err: any) {
      console.error('Logout error:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const hasPermission = (perm: string) => {
    if (!profile) return false
    const permisos = profile.permisos && profile.permisos.length > 0
      ? profile.permisos
      : buildPermisosFromRole(profile.rol)
    return permisos.includes('all') || permisos.includes(perm)
  }

  return {
    user,
    profile,
    loading,
    error,
    login,
    logout,
    hasPermission,
  }
}
