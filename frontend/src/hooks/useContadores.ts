// frontend/src/hooks/useContadores.ts

import { useState, useEffect } from 'react'
import { obtenerContadoresFecha } from '@/utils/produccionHelpers'
import type { RegistroContadores } from '@/utils/produccionHelpers'

export function useContadores(fecha: string) {
  const [contadores, setContadores] = useState<RegistroContadores | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargarContadores = async () => {
      try {
        setLoading(true)
        setError(null)
        const datos = await obtenerContadoresFecha(fecha)
        setContadores(datos)
      } catch (err: any) {
        console.error('Error cargando contadores:', err)
        setError(err.message || 'Error al cargar contadores')
      } finally {
        setLoading(false)
      }
    }

    if (fecha) {
      cargarContadores()
    }
  }, [fecha])

  return { contadores, loading, error }
}
