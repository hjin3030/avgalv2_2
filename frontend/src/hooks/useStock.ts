// frontend/src/hooks/useStock.ts

import { useState, useEffect, useCallback } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'

import { aplicarAjusteStock } from '@/utils/stockHelpers'

export interface Stock {
  id: string
  skuId?: string
  skuCodigo: string
  skuNombre?: string
  cantidad: number
  minimo?: number
  maximo?: number
  ubicacion?: string
  createdAt?: any
  updatedAt?: any
}

export type TipoAjuste = 'incrementar' | 'decrementar' | 'establecer'

export type AplicarAjusteParams = {
  skuCodigo: string
  skuNombre: string
  tipoAjuste: TipoAjuste
  cantidad: number
  razon: string
  observaciones?: string
  usuarioId: string
  usuarioNombre: string
}

export function useStock() {
  const [stock, setStock] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStock = useCallback(() => {
    setLoading(true)
    setError(null)

    const q = query(collection(db, 'stock'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const stockData = snapshot.docs.map((d) => {
          const data = d.data() as any
          return {
            id: d.id,
            ...data,
            // hardening
            skuCodigo: data.skuCodigo ?? d.id,
            cantidad: Number(data.cantidad ?? 0),
          } as Stock
        })

        setStock(stockData)
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching stock:', err)
        setError(err.message || 'Error al cargar stock')
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = loadStock()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [loadStock])

  const getStockBySkuCodigo = (skuCodigo: string): Stock | undefined => {
    return stock.find((s) => s.skuCodigo === skuCodigo)
  }

  const getStockSkuNombre = (skuCodigo: string, skus: any[]): string => {
    const stockItem = stock.find((s) => s.skuCodigo === skuCodigo)
    if (stockItem?.skuNombre && stockItem.skuNombre !== 'Desconocido') return stockItem.skuNombre

    const found = skus?.find((s) => s.codigo === skuCodigo)
    return found?.nombre || 'Desconocido'
  }

  // ✅ NUEVO (recomendado): firma por objeto (calza 1:1 con aplicarAjusteStock)
  const aplicarAjuste = async (
    params: AplicarAjusteParams,
  ): Promise<{ success: true } | { success: false; error: string }> => {
    return await aplicarAjusteStock({
      skuCodigo: params.skuCodigo,
      skuNombre: params.skuNombre,
      tipoAjuste: params.tipoAjuste,
      cantidad: params.cantidad,
      razon: params.razon,
      observaciones: params.observaciones,
      usuarioId: params.usuarioId,
      usuarioNombre: params.usuarioNombre,
    })
  }

  // (Opcional) compatibilidad si algo todavía llama posicional
  const aplicarAjusteLegacy = async (
    skuCodigo: string,
    skuNombre: string,
    tipoAjuste: TipoAjuste,
    cantidad: number,
    razon: string,
    observaciones: string,
    usuarioId: string,
    usuarioNombre: string,
  ) => {
    return aplicarAjuste({
      skuCodigo,
      skuNombre,
      tipoAjuste,
      cantidad,
      razon,
      observaciones,
      usuarioId,
      usuarioNombre,
    })
  }

  // El listener ya mantiene todo actualizado; se deja por API.
  const refetch = () => {}

  return {
    stock,
    loading,
    error,
    getStockBySkuCodigo,
    getStockSkuNombre,
    aplicarAjuste,
    aplicarAjusteLegacy,
    refetch,
  }
}
