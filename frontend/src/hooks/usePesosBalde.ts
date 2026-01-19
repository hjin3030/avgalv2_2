// src/hooks/usePesosBalde.ts

import { useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface PesoBalde {
  id: string
  fecha: string // YYYY-MM-DD
  peso: number // peso total (kg)
  hora: string
  timestamp: string
}

function toNumberLoose(v: any): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v === 'string') {
    // soporta "3.6" y "3,6"
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function sumarPesosPorPabellon(obj: unknown): number {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return 0

  return (Object.values(obj as Record<string, unknown>) as unknown[]).reduce<number>(
    (acc, v) => acc + toNumberLoose(v),
    0,
  )
}


function normalizarFechaDocId(fechaOrId: string): string {
  // soporta 'pb-2026-01-18' o '2026-01-18'
  return String(fechaOrId || '').replace(/^pb-/, '')
}

export function usePesosBalde(limitCount: number = 30) {
  const [pesosBalde, setPesosBalde] = useState<PesoBalde[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPesosBalde = async () => {
      try {
        setLoading(true)
        setError(null)

        const q = query(collection(db, 'pesosBalde'), orderBy('fecha', 'desc'), limit(limitCount))
        const snapshot = await getDocs(q)

        const data: PesoBalde[] = snapshot.docs.map((doc) => {
          const d: any = doc.data()

          const fecha = normalizarFechaDocId(String(d.fecha || doc.id))
          const pesoTotal = toNumberLoose(d.pesoTotal)

          const pesoFallback = sumarPesosPorPabellon(d.pesosPorPabellon)
          const peso = pesoTotal > 0 ? pesoTotal : pesoFallback

          return {
            id: doc.id,
            fecha,
            peso,
            hora: String(d.hora || ''),
            timestamp: String(d.timestamp || ''),
          }
        })

        setPesosBalde(data.reverse())
      } catch (err) {
        console.error('Error fetching pesosBalde:', err)
        setError('Error al cargar los pesos del balde')
      } finally {
        setLoading(false)
      }
    }

    fetchPesosBalde()
  }, [limitCount])

  return { pesosBalde, loading, error }
}
