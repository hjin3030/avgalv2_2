// frontend/src/hooks/useSkus.ts

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

export interface Sku {
  id: string;
  codigo: string;
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

export function useSkus(activeOnly = false) {
  const [skus, setSkus] = useState<Sku[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔄 SUSCRIPCIÓN A FIRESTORE
  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      let q;
      if (activeOnly) {
        q = query(collection(db, 'skus'), where('activo', '==', true));
      } else {
        q = query(collection(db, 'skus'));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          let skusData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Sku[];

          // ✅ ORDENAR EN FRONTEND
          skusData = skusData.sort((a, b) => a.codigo.localeCompare(b.codigo));

          setSkus(skusData);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching skus:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error en useSkus setup:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [activeOnly]);

  // ✅ CREAR SKU
  const addSku = async (skuData: Omit<Sku, 'id' | 'createdAt' | 'updatedAt'>): Promise<OperationResult> => {
    try {
      const newSku = {
        ...skuData,
        activo: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'skus'), newSku);
      return { success: true, id: docRef.id };
    } catch (err: any) {
      console.error('Error adding sku:', err);
      return { success: false, error: err.message };
    }
  };

  // ✅ ACTUALIZAR SKU
  const updateSku = async (id: string, skuData: Partial<Sku>): Promise<OperationResult> => {
    try {
      const skuRef = doc(db, 'skus', id);
      await updateDoc(skuRef, {
        ...skuData,
        updatedAt: Timestamp.now(),
      });
      return { success: true };
    } catch (err: any) {
      console.error('Error updating sku:', err);
      return { success: false, error: err.message };
    }
  };

  // ✅ TOGGLE ACTIVO/INACTIVO
  const toggleActiveSku = async (id: string, activo: boolean): Promise<OperationResult> => {
    try {
      const skuRef = doc(db, 'skus', id);
      await updateDoc(skuRef, {
        activo,
        updatedAt: Timestamp.now(),
      });
      return { success: true };
    } catch (err: any) {
      console.error('Error toggling sku:', err);
      return { success: false, error: err.message };
    }
  };

  // ✅ ELIMINAR SKU (SOLO SUPERADMIN)
  const deleteSku = async (id: string): Promise<OperationResult> => {
    try {
      await deleteDoc(doc(db, 'skus', id));
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting sku:', err);
      return { success: false, error: err.message };
    }
  };

  // ✅ HELPER: Obtener SKU por ID
  const getSkuById = (id: string): Sku | undefined => {
    return skus.find((s) => s.id === id);
  };

  // ✅ HELPER: Obtener SKU por código
  const getSkuByCodigo = (codigo: string): Sku | undefined => {
    return skus.find((s) => s.codigo === codigo);
  };

  return {
    skus,
    loading,
    error,
    addSku,
    updateSku,
    toggleActiveSku,
    deleteSku,
    getSkuById,
    getSkuByCodigo,
  };
}
