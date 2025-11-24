import { useState, useEffect, useCallback } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Stock {
  id: string;
  skuId: string;
  skuCodigo: string;
  skuNombre: string;
  cantidad: number;
  minimo: number;
  maximo: number;
  ubicacion: string;
  createdAt?: any;
  updatedAt?: any;
}

export function useStock() {
  const [stock, setStock] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStock = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      const q = query(collection(db, 'stock'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const stockData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Stock[];
          setStock(stockData);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching stock:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err: any) {
      console.error('Error en useStock setup:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = loadStock();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [loadStock]);

  const getStockBySkuCodigo = (skuCodigo: string): Stock | undefined => {
    return stock.find((s) => s.skuCodigo === skuCodigo);
  };

  const getStockSkuNombre = (skuCodigo: string, skus: any[]): string => {
    const stockItem = stock.find((s) => s.skuCodigo === skuCodigo);
    if (!stockItem) return 'Desconocido';
    if (stockItem.skuNombre && stockItem.skuNombre !== 'Desconocido') {
      return stockItem.skuNombre;
    }
    const found = skus?.find((s) => s.codigo === skuCodigo);
    return found ? found.nombre : 'Desconocido';
  };

  // Función para forzar recarga manual
  const refetch = () => {
    loadStock();
  };

  return {
    stock,
    loading,
    error,
    getStockBySkuCodigo,
    getStockSkuNombre,
    refetch, // Nuevo método para recarga manual
  };
}
