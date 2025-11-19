import { useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile, UserRole } from '@/types';
import { ROLE_PERMISSIONS } from '@shared/constants';

function buildPermisosFromRole(role: UserRole): string[] {
  const roleConfig = ROLE_PERMISSIONS[role];
  if (!roleConfig) return [];
  return [
    ...(roleConfig.modules || []).map((m: string) => `module:${m}`),
    ...(roleConfig.actions || []).map((a: string) => `action:${a}`),
    ...(roleConfig.canAccessAll ? ['all'] : [])
  ];
}

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserProfile = useCallback(async (firebaseUser: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();

        let permisos: string[] = [];
        if (Array.isArray(data.permisos) && data.permisos.length > 0) {
          // Si el campo permisos ya viene como array plano, usarlo tal cual
          permisos = data.permisos;
        } else if (data.rol) {
          // Transforma la config del rol (objeto) a array de strings
          permisos = buildPermisosFromRole(data.rol as UserRole);
        }

        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          nombre: data.nombre,
          email: data.email,
          rol: data.rol as UserRole,
          activo: data.activo ?? true,
          permisos: permisos,
        };

        if (!userProfile.activo) {
          await signOut(auth);
          setUser(null);
          setProfile(null);
          setError('Usuario inactivo');
          return;
        }

        setProfile(userProfile);
        setError(null);
      } else {
        setProfile(null);
        setError('Perfil de usuario no encontrado.');
      }
    } catch (err: any) {
      console.error('Error loading user profile:', err);
      setError(err.message || 'Error al cargar perfil de usuario');
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          await loadUserProfile(firebaseUser);
        } else {
          setProfile(null);
          setError(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [loadUserProfile]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await loadUserProfile(userCredential.user);
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message);
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
      setLoading(false);
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const hasPermission = (perm: string) => {
    if (!profile || !Array.isArray(profile.permisos)) return false;
    return profile.permisos.includes('all') || profile.permisos.includes(perm);
  };

  return {
    user,
    profile,
    loading,
    error,
    login,
    logout,
    hasPermission,
  };
}
