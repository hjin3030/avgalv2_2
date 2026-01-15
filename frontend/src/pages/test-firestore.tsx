// frontend/src/pages/test-firestore.tsx

import React, { useMemo, useState } from 'react'
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  query,
  where,
  limit,
  orderBy,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

import { usePabellones } from '../hooks/usePabellones'
import { useSkus } from '../hooks/useSkus'
import { useDestinos } from '../hooks/useDestinos'
import { useTransportistas } from '../hooks/useTransportistas'
import { useOrigenes } from '../hooks/useOrigenes'
import { useStock } from '../hooks/useStock'
import { useVales } from '../hooks/useVales'

import type { Vale, ValeDetalle, Sku } from '@/types'
import { getSkuNombre as getSkuNombreHelper } from '@/utils/skuHelpers'

type AnyObj = Record<string, any>

function safeToString(v: any): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

/**
 * Compat temporal:
 * - Packing hoy guarda `detalle.sku` como skuCodigo (por el código actual de NuevoValeModal). [file:48]
 * - Bodega hoy guarda `detalle.sku` como skuId (por CrearValeModal). [file:46]
 * - En types existe skuCodigo. [file:13]
 *
 * Este helper intenta inferir un "skuCodigo" usable para diagnósticos.
 */
function inferSkuCodigoFromDetalle(detalle: any, skusCatalogo: Sku[]): string {
  const d = detalle as AnyObj
  const skuCodigo = safeToString(d.skuCodigo).trim()
  if (skuCodigo) return skuCodigo

  const sku = safeToString(d.sku).trim()
  if (!sku) return ''

  // Si coincide con un código real, entonces sku ya es código
  const matchCodigo = skusCatalogo.find(s => s.codigo === sku)
  if (matchCodigo) return matchCodigo.codigo

  // Si coincide con un id real, entonces sku es id -> traducir a código
  const matchId = skusCatalogo.find(s => (s as any).id === sku)
  if (matchId) return matchId.codigo

  // Si no matchea, devolver el valor (solo para mostrar diagnóstico)
  return sku
}

function inferSkuIdFromDetalle(detalle: any, skusCatalogo: Sku[]): string {
  const d = detalle as AnyObj
  const skuId = safeToString(d.skuId).trim()
  if (skuId) return skuId

  const sku = safeToString(d.sku).trim()
  if (!sku) return ''

  const matchId = skusCatalogo.find(s => (s as any).id === sku)
  if (matchId) return (matchId as any).id

  // Si sku era código, intentar mapear a id
  const matchCodigo = skusCatalogo.find(s => s.codigo === sku)
  if (matchCodigo) return (matchCodigo as any).id

  return ''
}

export default function TestFirestorePage() {
  const { pabellones, loading: loadingPab } = usePabellones()
  const { skus, loading: loadingSku } = useSkus()
  const { destinos, loading: loadingDest } = useDestinos()
  const { transportistas, loading: loadingTrans } = useTransportistas()
  const { origenes, loading: loadingOrig } = useOrigenes()
  const { stock, loading: loadingStock, refetch: refetchStock } = useStock()
  const { vales, loading: loadingVales, refetch: refetchVales } = useVales()

  const [logs, setLogs] = useState<string[]>([])
  const addLog = (message: string) =>
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`])

  const pabellonesActivos = useMemo(
    () => pabellones.filter(p => p.activo === true),
    [pabellones]
  )
  const pabellonesInactivos = useMemo(
    () => pabellones.filter(p => p.activo === false),
    [pabellones]
  )

  const cellStyle: React.CSSProperties = {
    border: '1px solid #eee',
    padding: '4px 8px',
  }

  // ==================== TESTS BÁSICOS ====================
  const testLeerPabellones = async () => {
    try {
      addLog('Leyendo pabellones con getDocs()...')
      const querySnapshot = await getDocs(collection(db, 'pabellones'))
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data() as any
        addLog(`✓ ${docSnap.id}: ${data.nombre}`)
      })
      addLog(`✓ Total pabellones: ${querySnapshot.size}`)
    } catch (error: any) {
      addLog(`✗ Error: ${error.code} - ${error.message}`)
    }
  }

  const testHooks = () => {
    addLog('PROBANDO HOOKS (REALTIME)...')
    addLog('')
    addLog(`usePabellones(): ${pabellones.length} pabellones`)
    addLog(`  Activos: ${pabellonesActivos.length}`)
    addLog(`  Inactivos: ${pabellonesInactivos.length}`)
    addLog(`useSkus(): ${skus.length} SKUs`)
    addLog(`useDestinos(): ${destinos.length} destinos`)
    addLog(`useTransportistas(): ${transportistas.length} transportistas`)
    addLog(`useOrigenes(): ${origenes.length} orígenes`)
    addLog(`useStock(): ${stock.length} productos en stock`)
    addLog(`useVales(): ${vales.length} vales`)
    addLog('')
    addLog('OK - Hooks activos')
  }

  // ==================== TESTS STOCK ====================

  /**
   * Nota: hoy tu test crea stock con addDoc => docId aleatorio. [file:33]
   * Si vas a estandarizar docId=skuCodigo, este test sirve para verificar el estado actual.
   */
  const testCrearStockDemo = async () => {
    try {
      addLog('Creando stock demo (ADD DOC - docId aleatorio)...')
      const stocksDemo = [
        {
          skuId: 'sku_demo_1',
          skuCodigo: 'BLA 1ERA',
          skuNombre: 'Blanco Primera',
          cantidad: 15000,
          minimo: 5000,
          maximo: 25000,
        },
        {
          skuId: 'sku_demo_2',
          skuCodigo: 'BLA 2DA',
          skuNombre: 'Blanco Segunda',
          cantidad: 8500,
          minimo: 3000,
          maximo: 15000,
        },
      ]

      for (const stockItem of stocksDemo) {
        await addDoc(collection(db, 'stock'), {
          ...stockItem,
          ubicacion: 'bodega_principal',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        })
        addLog(`✓ ${stockItem.skuCodigo}: ${stockItem.cantidad} u.`)
      }

      addLog('OK - Stock demo creado (2 productos)')
      await refetchStock()
    } catch (error: any) {
      addLog(`✗ Error: ${error.message}`)
    }
  }

  const testLeerStock = async () => {
    try {
      addLog('Leyendo stock...')
      const stockSnapshot = await getDocs(query(collection(db, 'stock'), limit(50)))
      if (stockSnapshot.size === 0) {
        addLog('No hay stock. Usa el botón "Crear Stock Demo" primero.')
        return
      }

      addLog(`✓ Stock encontrado: ${stockSnapshot.size} productos (máx 50)`)
      stockSnapshot.forEach(docSnap => {
        const data = docSnap.data() as any
        const cantidad = Number(data.cantidad ?? 0)
        const minimo = Number(data.minimo ?? 0)
        const estado = cantidad < minimo ? 'BAJO' : 'OK'
        addLog(`  ID=${docSnap.id} | skuCodigo=${data.skuCodigo} | cantidad=${cantidad} | estado=${estado}`)
      })
    } catch (error: any) {
      addLog(`✗ Error: ${error.message}`)
    }
  }

  /**
   * Diagnóstico: ¿docId coincide con skuCodigo?
   * - Si ya hay docs con id=skuCodigo y otros con id aleatorio, existe riesgo de duplicados.
   */
  const testDiagnosticoStockIds = async () => {
    try {
      addLog('Diagnóstico stock: doc.id vs skuCodigo (máx 100)...')
      const snap = await getDocs(query(collection(db, 'stock'), limit(100)))

      let coinciden = 0
      let noCoinciden = 0
      const skuCodigoDuplicados: Record<string, number> = {}

      snap.forEach(docSnap => {
        const data = docSnap.data() as any
        const skuCodigo = safeToString(data.skuCodigo)
        if (skuCodigo) {
          skuCodigoDuplicados[skuCodigo] = (skuCodigoDuplicados[skuCodigo] ?? 0) + 1
        }

        if (docSnap.id === skuCodigo) {
          coinciden++
        } else {
          noCoinciden++
        }
      })

      addLog(`Resultado: docId==skuCodigo: ${coinciden}, docId!=skuCodigo: ${noCoinciden}`)
      const repetidos = Object.entries(skuCodigoDuplicados).filter(([, count]) => count > 1)
      if (repetidos.length > 0) {
        addLog('⚠️ skuCodigo repetidos detectados (posibles duplicados):')
        repetidos.slice(0, 20).forEach(([skuCodigo, count]) => {
          addLog(`  - ${skuCodigo}: ${count} docs`)
        })
      } else {
        addLog('OK - No se detectaron skuCodigo repetidos (en el muestreo)')
      }
    } catch (error: any) {
      addLog(`✗ Error en testDiagnosticoStockIds: ${error.message}`)
    }
  }

  // ==================== TESTS VALES / DETALLE (BODEGA + PACKING) ====================

  /**
   * 1) Diagnóstico: qué viene en detalle (sku/skuCodigo/skuId) y cómo matchea con catálogo.
   * Esto es el punto crítico porque hoy Packing y Bodega no guardan lo mismo. [file:48][file:46]
   */
  const testSkusEnDetalles = () => {
    addLog('Test: SKUs en detalles de vales (diagnóstico schema)...')
    addLog(`Total vales en memoria: ${vales.length}`)

    if (vales.length === 0) {
      addLog('No hay vales cargados en useVales()')
      return
    }
    if (skus.length === 0) {
      addLog('No hay SKUs cargados en useSkus() (catálogo vacío)')
      return
    }

    const primerosVales = (vales as Vale[]).slice(0, 10)
    primerosVales.forEach((vale, idxVale) => {
      addLog(
        `\nVale #${vale.correlativoDia} (${String(vale.tipo).toUpperCase()}) estado=${vale.estado} origen=${vale.origenNombre ?? '-'} destino=${vale.destinoNombre ?? '-'}`
      )

      if (!vale.detalles || vale.detalles.length === 0) {
        addLog('  Este vale no tiene detalles')
        return
      }

      ;(vale.detalles as any[]).forEach((detalle: any, idxDet: number) => {
        const rawSku = safeToString(detalle?.sku)
        const rawSkuCodigo = safeToString(detalle?.skuCodigo)
        const rawSkuId = safeToString(detalle?.skuId)

        const inferredSkuCodigo = inferSkuCodigoFromDetalle(detalle, skus as Sku[])
        const inferredSkuId = inferSkuIdFromDetalle(detalle, skus as Sku[])

        const matchPorCodigo = !!(skus as Sku[]).find(s => s.codigo === inferredSkuCodigo)
        const matchPorId = !!(skus as Sku[]).find(s => (s as any).id === inferredSkuId)

        const nombreHelper = inferredSkuCodigo
          ? getSkuNombreHelper(skus as any, inferredSkuCodigo)
          : '(sin skuCodigo inferible)'

        addLog(
          `  Det ${idxVale}-${idxDet}: raw(sku="${rawSku}", skuCodigo="${rawSkuCodigo}", skuId="${rawSkuId}") | infer(skuCodigo="${inferredSkuCodigo}", skuId="${inferredSkuId}") | helperNombre="${nombreHelper}" | matchCodigo=${matchPorCodigo} | matchId=${matchPorId} | total=${detalle?.totalUnidades}`
        )
      })
    })

    addLog('\nSugerencia: si ves que en egreso/reingreso el raw sku parece un id, hay que migrar esos vales para guardar skuCodigo.')
  }

  /**
   * 2) Vista "simulada" tipo Bodega/Packing: solo para comparar salida esperada (SKU + nombre).
   * Nota: usa inferSkuCodigoFromDetalle para no romper en mezcla id/código.
   */
  const testVistaDetalle = (label: 'BODEGA' | 'PACKING') => {
    addLog(`Vista simulada DetalleValeModal (${label})...`)
    const vale = (vales as Vale[])[0]
    if (!vale) {
      addLog('No hay vales para mostrar')
      return
    }

    addLog(
      `Vale #${vale.correlativoDia} | tipo=${vale.tipo} | estado=${vale.estado} | origen=${vale.origenNombre ?? '-'} | destino=${vale.destinoNombre ?? '-'}`
    )

    if (!vale.detalles || vale.detalles.length === 0) {
      addLog('Este vale no tiene detalles')
      return
    }

    ;(vale.detalles as any[]).forEach((detalle: any, idx: number) => {
      const skuCodigo = inferSkuCodigoFromDetalle(detalle, skus as Sku[])
      const nombre = skuCodigo ? getSkuNombreHelper(skus as any, skuCodigo) : 'Desconocido'
      addLog(
        `  [${label}] Det ${idx}: skuCodigo=${skuCodigo} | nombre="${nombre}" | cajas=${detalle?.cajas} | bandejas=${detalle?.bandejas} | unidades=${detalle?.unidades} | total=${detalle?.totalUnidades}`
      )
    })

    addLog(`Total general (vale.totalUnidades) = ${vale.totalUnidades ?? '(sin totalUnidades)'}`)
  }

  const testVistaDetalleBodega = () => testVistaDetalle('BODEGA')
  const testVistaDetallePacking = () => testVistaDetalle('PACKING')

  /**
   * 3) Verificar que los SKU (inferidos) existan en stock por skuCodigo.
   * Este test asume que en stock existe el campo skuCodigo aunque docId sea aleatorio. [file:33]
   */
  const testDetalleVsStock = async () => {
    try {
      addLog('Verificando que los SKU de los detalles existan en STOCK (por skuCodigo)...')

      const vale = (vales as Vale[])[0]
      if (!vale || !vale.detalles || vale.detalles.length === 0) {
        addLog('No hay vale con detalles para verificar')
        return
      }

      for (const detalle of vale.detalles as any[]) {
        const skuCodigo = inferSkuCodigoFromDetalle(detalle, skus as Sku[])
        if (!skuCodigo) {
          addLog('  Detalle sin skuCodigo inferible, se omite.')
          continue
        }

        addLog(`  Buscando stock para skuCodigo="${skuCodigo}"...`)
        const stockSnapshot = await getDocs(
          query(collection(db, 'stock'), where('skuCodigo', '==', skuCodigo), limit(10))
        )

        if (stockSnapshot.empty) {
          addLog('    ❌ No hay documentos de stock con ese skuCodigo')
        } else {
          stockSnapshot.forEach(docSnap => {
            const data = docSnap.data() as any
            addLog(
              `    ✅ STOCK: docId=${docSnap.id} | cantidad=${data.cantidad} | disponible=${data.disponible ?? data.cantidad}`
            )
          })
        }
      }
    } catch (error: any) {
      addLog(`✗ Error en testDetalleVsStock: ${error.message}`)
    }
  }

  /**
   * 4) Diagnóstico movimientos: detectar si existen docs con campo `sku` (viejo) vs `skuCodigo` (nuevo).
   * Esto ayuda a confirmar si aún se está usando stockHelpers.ts u otro writer legacy. [file:7][file:40]
   */
  const testDiagnosticoMovimientosSchema = async () => {
    try {
      addLog('Diagnóstico movimientos: schema sku vs skuCodigo (máx 100)...')
      const snap = await getDocs(query(collection(db, 'movimientos'), orderBy('createdAt', 'desc'), limit(100)))

      let conSkuCodigo = 0
      let conSku = 0
      let sinSku = 0

      snap.forEach(docSnap => {
        const data = docSnap.data() as any
        if (data?.skuCodigo) conSkuCodigo++
        else if (data?.sku) conSku++
        else sinSku++
      })

      addLog(`Resultado: con skuCodigo=${conSkuCodigo}, con sku=${conSku}, sin sku=${sinSku}`)
      addLog('Si con sku > 0, hay writers antiguos generando movimientos incompatibles con Bodega/Cartola.')
    } catch (error: any) {
      addLog(`✗ Error en testDiagnosticoMovimientosSchema: ${error.message}`)
    }
  }

  // ==================== RENDER ====================
  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'monospace',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#333' }}>
        Test Firestore - AVGAL v2 - Diagnóstico Vales/Stock/Movimientos
      </h1>

      {/* ====== INDICADORES DE ESTADO ====== */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '30px',
          padding: '15px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <span style={badgeStyle(loadingPab)}>Pabellones: {loadingPab ? '...' : `OK ${pabellones.length}`}</span>
        <span style={badgeStyle(loadingSku)}>SKUs: {loadingSku ? '...' : `OK ${skus.length}`}</span>
        <span style={badgeStyle(loadingDest)}>Destinos: {loadingDest ? '...' : `OK ${destinos.length}`}</span>
        <span style={badgeStyle(loadingTrans)}>
          Transportistas: {loadingTrans ? '...' : `OK ${transportistas.length}`}
        </span>
        <span style={badgeStyle(loadingOrig)}>Orígenes: {loadingOrig ? '...' : `OK ${origenes.length}`}</span>
        <span style={badgeStyle(loadingStock)}>Stock: {loadingStock ? '...' : `OK ${stock.length}`}</span>
        <span style={badgeStyle(loadingVales)}>Vales: {loadingVales ? '...' : `OK ${vales.length}`}</span>
      </div>

      {/* ====== TABLA DE PABELLONES ====== */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '20px', marginBottom: 10, color: '#1976d2' }}>Pabellones</h2>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: '#fff',
            fontSize: 14,
            marginTop: 12,
          }}
        >
          <thead>
            <tr>
              <th style={cellStyle}>id</th>
              <th style={cellStyle}>nombre</th>
              <th style={cellStyle}>activo</th>
              <th style={cellStyle}>automatico</th>
              <th style={cellStyle}>capacidadTotal</th>
              <th style={cellStyle}>totalLineas</th>
            </tr>
          </thead>
          <tbody>
            {pabellones.map(pb => (
              <tr key={pb.id} style={{ background: pb.activo ? '#e8f5e9' : '#ffebee' }}>
                <td style={cellStyle}>{pb.id}</td>
                <td style={cellStyle}>{pb.nombre}</td>
                <td style={cellStyle}>
                  <strong style={{ color: pb.activo ? 'green' : 'red' }}>{pb.activo ? 'SÍ' : 'NO'}</strong>
                </td>
                <td style={cellStyle}>{String((pb as any).automatico ?? '')}</td>
                <td style={cellStyle}>{(pb as any).capacidadTotal?.toLocaleString?.()}</td>
                <td style={cellStyle}>{(pb as any).totalLineas ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 16 }}>
          <strong>Pabellones Activos ({pabellonesActivos.length}):</strong>
          <pre
            style={{
              background: '#e8f5e9',
              fontSize: 13,
              padding: 8,
              borderRadius: 4,
              marginTop: 4,
            }}
          >
            {JSON.stringify(
              pabellonesActivos.map(p => ({
                id: p.id,
                nombre: p.nombre,
                activo: p.activo,
              })),
              null,
              2
            )}
          </pre>
        </div>
      </div>

      {/* ====== SECCIÓN: TESTS BÁSICOS ====== */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#ff9800' }}>Tests Básicos</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={testLeerPabellones} style={buttonStyle}>
            Leer Pabellones (getDocs)
          </button>
          <button onClick={testHooks} style={buttonStyleSuccess}>
            Probar Hooks
          </button>
        </div>
      </div>

      {/* ====== SECCIÓN: TESTS DE STOCK ====== */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#2196F3' }}>Tests Stock</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={testCrearStockDemo} style={buttonStyle}>
            Crear Stock Demo (addDoc)
          </button>
          <button onClick={testLeerStock} style={buttonStyleSuccess}>
            Leer Stock
          </button>
          <button onClick={testDiagnosticoStockIds} style={{ ...buttonStyle, backgroundColor: '#6f42c1' }}>
            Diagnóstico docId vs skuCodigo
          </button>
        </div>
      </div>

      {/* ====== SECCIÓN: TESTS DETALLE VALES (BODEGA/PACKING) ====== */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#d32f2f' }}>Tests Vales / Detalles</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={testSkusEnDetalles} style={buttonStyle}>
            1) Diagnóstico schema detalles
          </button>
          <button onClick={testVistaDetalleBodega} style={buttonStyle}>
            2) Simular Detalle (Bodega)
          </button>
          <button onClick={testVistaDetallePacking} style={buttonStyle}>
            3) Simular Detalle (Packing)
          </button>
          <button onClick={testDetalleVsStock} style={{ ...buttonStyle, backgroundColor: '#d32f2f' }}>
            4) Detalles vs Stock (skuCodigo)
          </button>
          <button onClick={testDiagnosticoMovimientosSchema} style={{ ...buttonStyle, backgroundColor: '#0d6efd' }}>
            5) Diagnóstico Movimientos schema
          </button>
          <button
            onClick={async () => {
              addLog('Refrescando hooks (Stock y Vales)...')
              await Promise.all([refetchStock(), refetchVales()])
              addLog('OK - Refrescados')
            }}
            style={buttonStyleSuccess}
          >
            Refrescar hooks
          </button>
        </div>
      </div>

      {/* ====== BOTÓN LIMPIAR ====== */}
      <button
        onClick={() => setLogs([])}
        style={{ ...buttonStyle, backgroundColor: '#dc3545', marginBottom: '20px' }}
      >
        Limpiar Console
      </button>

      {/* ====== CONSOLE DE LOGS ====== */}
      <div
        style={{
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4',
          padding: '15px',
          borderRadius: '8px',
          maxHeight: '500px',
          overflowY: 'auto',
          fontFamily: 'Consolas, Monaco, monospace',
          fontSize: '13px',
          lineHeight: '1.6',
        }}
      >
        <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#4fc3f7' }}>Console Logs:</div>
        {logs.length === 0 ? (
          <div style={{ color: '#888' }}>No hay logs. Ejecuta un test con los botones...</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} style={{ marginBottom: '4px' }}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const buttonStyle: React.CSSProperties = {
  padding: '12px 20px',
  backgroundColor: '#2196F3',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 'bold',
  transition: 'background-color 0.2s',
}

const buttonStyleSuccess: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#4caf50',
}

const badgeStyle = (loading: boolean): React.CSSProperties => ({
  padding: '10px 16px',
  backgroundColor: loading ? '#ff9800' : '#4caf50',
  color: 'white',
  borderRadius: '20px',
  fontSize: '13px',
  fontWeight: 'bold',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
})
