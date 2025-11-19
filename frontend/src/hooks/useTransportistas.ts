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

export interface Transportista {
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

export function useTransportistas(activeOnly = false) {
  const [transportistas, setTransportistas] = useState<Transportista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      let q;
      if (activeOnly) {
        q = query(collection(db, 'transportistas'), where('activo', '==', true));
      } else {
        q = query(collection(db, 'transportistas'));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          let data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Transportista[];

          data = data.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

          setTransportistas(data);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching transportistas:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error en useTransportistas setup:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [activeOnly]);

  const addTransportista = async (
    transportistaData: Omit<Transportista, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<OperationResult> => {
    try {
      const newTransportista = {
        ...transportistaData,
        activo: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, 'transportistas'), newTransportista);
      return { success: true, id: docRef.id };
    } catch (err: any) {
      console.error('Error adding transportista:', err);
      return { success: false, error: err.message };
    }
  };

  const updateTransportista = async (
    id: string,
    transportistaData: Partial<Transportista>
  ): Promise<OperationResult> => {
    try {
      const ref = doc(db, 'transportistas', id);
      await updateDoc(ref, { ...transportistaData, updatedAt: Timestamp.now() });
      return { success: true };
    } catch (err: any) {
      console.error('Error updating transportista:', err);
      return { success: false, error: err.message };
    }
  };

  const toggleActiveTransportista = async (id: string, activo: boolean): Promise<OperationResult> => {
    try {
      const ref = doc(db, 'transportistas', id);
      await updateDoc(ref, { activo, updatedAt: Timestamp.now() });
      return { success: true };
    } catch (err: any) {
      console.error('Error toggling transportista active state:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteTransportista = async (id: string): Promise<OperationResult> => {
    try {
      await deleteDoc(doc(db, 'transportistas', id));
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting transportista:', err);
      return { success: false, error: err.message };
    }
  };

  const getTransportistaById = (id: string): Transportista | undefined =>
    transportistas.find((t) => t.id === id);

  return {
    transportistas,
    loading,
    error,
    addTransportista,
    updateTransportista,
    toggleActiveTransportista,
    deleteTransportista,
    getTransportistaById,
  };
}
