// frontend/src/hooks/useAuditLog.ts

import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { UserProfile } from '@/types'

interface LogEntry {
  usuarioId: string
  usuarioNombre: string
  accion: string
  modulo: string
  documentoId: string
  valorAnterior?: any
  valorNuevo: any
  timestamp: Timestamp
}

export function useAuditLog() {
  const registrarCambio = async (
    usuario: UserProfile | null | undefined,
    modulo: string,
    documentoId: string,
    accion: string,
    valorAnterior: any = null,
    valorNuevo: any = null
  ): Promise<boolean> => {
    try {
      // ✅ CORRECCIÓN: Usar "uid" en lugar de "id"
      if (!usuario || !usuario.uid || !usuario.nombre) {
        console.error('❌ Usuario no disponible o incompleto para auditoría:', usuario)
        return false
      }

      const logEntry: LogEntry = {
        usuarioId: usuario.uid,  // ✅ CORRECCIÓN: usar "uid"
        usuarioNombre: usuario.nombre,
        accion,
        modulo,
        documentoId,
        valorAnterior,
        valorNuevo,
        timestamp: Timestamp.now()
      }

      await addDoc(collection(db, 'auditLogs'), logEntry)
      console.log('✅ Cambio registrado en auditoría:', accion)
      return true
    } catch (error) {
      console.error('❌ Error registrando auditoría:', error)
      return false
    }
  }

  return { registrarCambio }
}
