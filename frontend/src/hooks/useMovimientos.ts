// frontend/src/hooks/useMovimientos.ts

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Movimiento {
  id: string;
  valeId: string;
  valeEstado: string;
  tipo: 'ingreso' | 'egreso' | 'reingreso';
  skuCodigo: string;
  skuNombre: string;
  cantidad: number;
  fecha: string;
  hora: string;
  valeReferencia: string;
  origenNombre: string;
  destinoNombre: string;
  usuarioNombre: string;
  createdAt?: any;
}

export function useMovimientos(limitCount = 50) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const q = query(collection(db, 'movimientos'), orderBy('createdAt', 'desc'), limit(limitCount));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const movimientosData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Movimiento[];

          setMovimientos(movimientosData);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching movimientos:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error en useMovimientos setup:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [limitCount]);

  return {
    movimientos,
    loading,
    error,
  };
}
