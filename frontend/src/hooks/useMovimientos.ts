// frontend/src/hooks/useMovimientos.ts
import { useEffect, useMemo, useState } from 'react'
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore'
import { db } from '../lib/firebase'

export type TipoMovimiento = 'ingreso' | 'egreso' | 'reingreso' | 'ajuste'

export interface Movimiento {
  id: string
  valeId: string
  valeEstado: string // 'pendiente' | 'validado' | ...
  tipo: TipoMovimiento
  skuCodigo: string
  skuNombre: string
  cantidad: number // con signo real (delta)
  fecha: string
  hora: string
  valeReferencia: string
  origenNombre: string
  destinoNombre: string
  usuarioNombre: string
  createdAt?: any
  timestamp?: any
}

export interface UseMovimientosOptions {
  limitCount?: number
  soloValidados?: boolean
}

export function useMovimientos(options: UseMovimientosOptions = {}) {
  const { limitCount = 200, soloValidados = true } = options

  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    try {
      const movRef = collection(db, 'movimientos')

      // Nota: si usas where('valeEstado','==','validado') necesitarás índice compuesto
      // cuando combines con orderBy. Es normal en Firestore.
      const q = soloValidados
        ? query(movRef, where('valeEstado', '==', 'validado'), orderBy('createdAt', 'desc'), limit(limitCount))
        : query(movRef, orderBy('createdAt', 'desc'), limit(limitCount))

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const movimientosData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Movimiento[]
          setMovimientos(movimientosData)
          setLoading(false)
        },
        (err) => {
          console.error('Error fetching movimientos:', err)
          setError(err.message)
          setLoading(false)
        }
      )

      return () => unsubscribe()
    } catch (err: any) {
      console.error('Error en useMovimientos setup:', err)
      setError(err.message)
      setLoading(false)
    }
  }, [limitCount, soloValidados])

  // Normalización opcional por compatibilidad: createdAt vs timestamp
  const movimientosNormalizados = useMemo(() => {
    return movimientos.map((m) => ({
      ...m,
      createdAt: m.createdAt ?? m.timestamp,
    }))
  }, [movimientos])

  return {
    movimientos: movimientosNormalizados,
    loading,
    error,
  }
}
