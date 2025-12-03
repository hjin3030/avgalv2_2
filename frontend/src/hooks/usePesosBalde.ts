// src/hooks/usePesosBalde.ts

import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface PesoBalde {
  id: string
  fecha: string
  peso: number
  hora: string
  timestamp: string
}

export function usePesosBalde(limitCount: number = 30) {
  const [pesosBalde, setPesosBalde] = useState<PesoBalde[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPesosBalde = async () => {
      try {
        setLoading(true)
        const q = query(
          collection(db, 'pesosBalde'),
          orderBy('fecha', 'desc'),
          limit(limitCount)
        )
        
        const snapshot = await getDocs(q)
        const data: PesoBalde[] = snapshot.docs.map(doc => ({
          id: doc.id,
          fecha: doc.data().fecha || doc.id,
          peso: doc.data().peso || 0,
          hora: doc.data().hora || '',
          timestamp: doc.data().timestamp || ''
        }))

        setPesosBalde(data.reverse()) // Invertir para orden cronológico
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
