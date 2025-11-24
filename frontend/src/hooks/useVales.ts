import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Vale {
  id: string;
  correlativoDia: number;
  fecha: string;
  hora: string;
  tipo: 'ingreso' | 'egreso' | 'reingreso';
  estado: 'pendiente' | 'validado' | 'rechazado';
  origenId: string;
  origenNombre: string;
  destinoId: string;
  destinoNombre: string;
  transportistaId?: string | null;
  transportistaNombre?: string | null;
  guiaDespacho?: string | null;
  detalles: any[];
  totalUnidades: number;
  usuarioCreadorId: string;
  usuarioCreadorNombre: string;
  usuarioCreadorRol: string;
  comentario?: string;
  createdAt?: any;
}

export function useVales() {
  const [vales, setVales] = useState<Vale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVales = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      const q = query(collection(db, 'vales'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const valesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Vale[];
          setVales(valesData);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching vales:', err);
          setError(err.message);
          setLoading(false);
        }
      );
      return unsubscribe;
    } catch (err: any) {
      console.error('Error en useVales setup:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = loadVales();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [loadVales]);

  // Función para forzar recarga manual
  const refetch = () => {
    loadVales();
  };

  return {
    vales,
    loading,
    error,
    refetch,
  };
}
