// frontend/src/hooks/usePabellones.ts

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Pabellon } from '../types';

export function usePabellones() {
  const [pabellones, setPabellones] = useState<Pabellon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'pabellones'),
      (snapshot) => {
        const pabellonesData: Pabellon[] = [];
        snapshot.forEach((docSnap) => {
          pabellonesData.push({
            id: docSnap.id,
            ...docSnap.data(),
          } as Pabellon);
        });
        setPabellones(pabellonesData);
        setLoading(false);
      },
      (err) => {
        console.error('Error escuchando pabellones:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ✅ FUNCIÓN PARA CAMBIAR ESTADO ACTIVO/INACTIVO
  const toggleActivePabellon = async (id: string, nuevoEstado: boolean) => {
    try {
      const pabellonRef = doc(db, 'pabellones', id);
      await updateDoc(pabellonRef, {
        activo: nuevoEstado, // ✅ Solo campo "activo"
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error al cambiar estado de pabellón:', error);
      return { success: false, error: error.message };
    }
  };

  // ✅ FUNCIÓN PARA ELIMINAR PABELLÓN
  const deletePabellon = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'pabellones', id));
      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar pabellón:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    pabellones,
    loading,
    error,
    toggleActivePabellon,
    deletePabellon,
  };
}
