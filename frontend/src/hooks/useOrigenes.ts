// frontend/src/hooks/useOrigenes.ts
import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Origen } from '@/types'

interface OperationResult {
  success: boolean
  id?: string
  error?: string
}

export function useOrigenes(activeOnly = false) {
  const [origenes, setOrigenes] = useState<Origen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 🔄 SUSCRIPCIÓN A FIRESTORE
  useEffect(() => {
    setLoading(true)
    setError(null)

    try {
      let q
      if (activeOnly) {
        q = query(
          collection(db, 'origenes'),
          where('activo', '==', true)
        )
      } else {
        q = query(collection(db, 'origenes'))
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          let origenesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Origen[]

          // ✅ ORDENAR EN FRONTEND
          origenesData = origenesData.sort((a, b) =>
            a.nombre.localeCompare(b.nombre)
          )

          setOrigenes(origenesData)
          setLoading(false)
        },
        (err) => {
          console.error('Error fetching origenes:', err)
          setError(err.message)
          setLoading(false)
        }
      )

      return () => unsubscribe()
    } catch (err: any) {
      console.error('Error en useOrigenes setup:', err)
      setError(err.message)
      setLoading(false)
    }
  }, [activeOnly])

  // ✅ CREAR ORIGEN
  const addOrigen = async (
    origenData: Omit<Origen, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<OperationResult> => {
    try {
      const newOrigen = {
        ...origenData,
        activo: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      const docRef = await addDoc(collection(db, 'origenes'), newOrigen)
      return { success: true, id: docRef.id }
    } catch (err: any) {
      console.error('Error adding origen:', err)
      return { success: false, error: err.message }
    }
  }

  // ✅ ACTUALIZAR ORIGEN
  const updateOrigen = async (
    id: string,
    origenData: Partial<Origen>
  ): Promise<OperationResult> => {
    try {
      const origenRef = doc(db, 'origenes', id)
      await updateDoc(origenRef, {
        ...origenData,
        updatedAt: Timestamp.now()
      })
      return { success: true }
    } catch (err: any) {
      console.error('Error updating origen:', err)
      return { success: false, error: err.message }
    }
  }

  // ✅ TOGGLE ACTIVO/INACTIVO
  const toggleActiveOrigen = async (
    id: string,
    activo: boolean
  ): Promise<OperationResult> => {
    try {
      const origenRef = doc(db, 'origenes', id)
      await updateDoc(origenRef, {
        activo,
        updatedAt: Timestamp.now()
      })
      return { success: true }
    } catch (err: any) {
      console.error('Error toggling origen:', err)
      return { success: false, error: err.message }
    }
  }

  // ✅ ELIMINAR ORIGEN (SOLO SUPERADMIN)
  const deleteOrigen = async (id: string): Promise<OperationResult> => {
    try {
      await deleteDoc(doc(db, 'origenes', id))
      return { success: true }
    } catch (err: any) {
      console.error('Error deleting origen:', err)
      return { success: false, error: err.message }
    }
  }

  // ✅ HELPER: Obtener origen por ID
  const getOrigenById = (id: string): Origen | undefined => {
    return origenes.find(o => o.id === id)
  }

  return {
    origenes,
    loading,
    error,
    addOrigen,
    updateOrigen,
    toggleActiveOrigen,
    deleteOrigen,
    getOrigenById
  }
}
