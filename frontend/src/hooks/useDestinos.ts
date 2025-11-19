// frontend/src/hooks/useDestinos.ts

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Destino {
  id: string;
  nombre: string;
  activo: boolean;
  observacion?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface OperationResult {
  success: boolean;
  id?: string;
  error?: string;
}

export function useDestinos(activeOnly = false) {
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔄 SUSCRIPCIÓN A FIRESTORE
  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      let q;
      if (activeOnly) {
        q = query(collection(db, 'destinos'), where('activo', '==', true));
      } else {
        q = query(collection(db, 'destinos'));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          let destinosData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Destino[];

          // ✅ ORDENAR EN FRONTEND
          destinosData = destinosData.sort((a, b) => a.nombre.localeCompare(b.nombre));

          setDestinos(destinosData);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching destinos:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error en useDestinos setup:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [activeOnly]);

  // ✅ CREAR DESTINO
  const addDestino = async (destinoData: Omit<Destino, 'id' | 'createdAt' | 'updatedAt'>): Promise<OperationResult> => {
    try {
      const newDestino = {
        ...destinoData,
        activo: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'destinos'), newDestino);
      return { success: true, id: docRef.id };
    } catch (err: any) {
      console.error('Error adding destino:', err);
      return { success: false, error: err.message };
    }
  };

  // ✅ ACTUALIZAR DESTINO
  const updateDestino = async (id: string, destinoData: Partial<Destino>): Promise<OperationResult> => {
    try {
      const destinoRef = doc(db, 'destinos', id);
      await updateDoc(destinoRef, {
        ...destinoData,
        updatedAt: Timestamp.now(),
      });
      return { success: true };
    } catch (err: any) {
      console.error('Error updating destino:', err);
      return { success: false, error: err.message };
    }
  };

  // ✅ TOGGLE ACTIVO/INACTIVO
  const toggleActiveDestino = async (id: string, activo: boolean): Promise<OperationResult> => {
    try {
      const destinoRef = doc(db, 'destinos', id);
      await updateDoc(destinoRef, {
        activo,
        updatedAt: Timestamp.now(),
      });
      return { success: true };
    } catch (err: any) {
      console.error('Error toggling destino:', err);
      return { success: false, error: err.message };
    }
  };

  // ✅ ELIMINAR DESTINO (SOLO SUPERADMIN)
  const deleteDestino = async (id: string): Promise<OperationResult> => {
    try {
      await deleteDoc(doc(db, 'destinos', id));
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting destino:', err);
      return { success: false, error: err.message };
    }
  };

  // ✅ HELPER: Obtener destino por ID
  const getDestinoById = (id: string): Destino | undefined => {
    return destinos.find((d) => d.id === id);
  };

  return {
    destinos,
    loading,
    error,
    addDestino,
    updateDestino,
    toggleActiveDestino,
    deleteDestino,
    getDestinoById,
  };
}
