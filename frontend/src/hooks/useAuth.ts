// frontend/src/hooks/useAuth.ts

import { useCallback, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

import { auth, db } from '@/lib/firebase'
import type { UserProfile, UserRole } from '@/types'

type LoginResult = { success: true } | { success: false; error: string }

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadUserProfile = useCallback(async (firebaseUser: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))

      if (!userDoc.exists()) {
        setProfile(null)
        setError('Perfil de usuario no encontrado.')
        return
      }

      const data = userDoc.data() as any

      const userProfile: UserProfile = {
        uid: firebaseUser.uid,
        nombre: data?.nombre ?? '',
        email: data?.email ?? firebaseUser.email ?? '',
        rol: (data?.rol ?? 'colaborador') as UserRole,
        activo: data?.activo ?? true,

        // Opción A: modulosPermitidos es la fuente de verdad para módulos
        modulosPermitidos: Array.isArray(data?.modulosPermitidos)
          ? data.modulosPermitidos
          : [],

        // Se deja por compat si existe en tu type; NO se usa para módulos.
        permisos: Array.isArray(data?.permisos) ? data.permisos : [],
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
    } catch (err: any) {
      console.error('Error loading user profile:', err)
      setError(err?.message || 'Error al cargar perfil de usuario')
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

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setLoading(true)
    setError(null)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      await loadUserProfile(userCredential.user)
      setLoading(false)
      return { success: true }
    } catch (err: any) {
      console.error('Login error:', err)
      const msg = err?.message || 'Error al iniciar sesión'
      setError(msg)
      setLoading(false)
      return { success: false, error: msg }
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
      setError(err?.message || 'Error al cerrar sesión')
      setLoading(false)
    }
  }

  /**
   * Se mantiene por compat (por si en el futuro quieres acciones especiales),
   * pero NO debe usarse para "módulos" (Opción A).
   */
  const hasPermission = (perm: string) => {
    if (!profile) return false
    const permisos = Array.isArray(profile.permisos) ? profile.permisos : []
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

export default useAuth
