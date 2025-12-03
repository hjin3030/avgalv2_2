// frontend/src/pages/test-firestore.tsx

import React, { useState } from 'react'
import { collection, getDocs, addDoc, Timestamp, query, where } from 'firebase/firestore'
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

  const pabellonesActivos = pabellones.filter(p => p.activo === true)
  const pabellonesInactivos = pabellones.filter(p => p.activo === false)

  const cellStyle: React.CSSProperties = { border: '1px solid #eee', padding: '4px 8px' }

  // ==================== TESTS BÁSICOS ====================
  const testLeerPabellones = async () => {
    try {
      addLog('🔍 Leyendo pabellones con getDocs()...')
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
    addLog('🧪 PROBANDO HOOKS (REALTIME)...')
    addLog('')
    addLog(`📊 usePabellones(): ${pabellones.length} pabellones`)
    addLog(`   Activos: ${pabellonesActivos.length}`)
    addLog(`   Inactivos: ${pabellonesInactivos.length}`)
    addLog(`📦 useSkus(): ${skus.length} SKUs`)
    addLog(`📍 useDestinos(): ${destinos.length} destinos`)
    addLog(`🚚 useTransportistas(): ${transportistas.length} transportistas`)
    addLog(`🔄 useOrigenes(): ${origenes.length} orígenes`)
    addLog(`📦 useStock(): ${stock.length} productos en stock`)
    addLog(`📋 useVales(): ${vales.length} vales`)
    addLog('')
    addLog('✅ Todos los hooks funcionando correctamente')
  }

  // ==================== TESTS STOCK ====================
  const testCrearStockDemo = async () => {
    try {
      addLog('📦 Creando stock demo...')
      const stocksDemo = [
        {
          skuId: 'sku_demo_1',
          skuCodigo: 'BLA 1ERA',
          skuNombre: 'Blanco Primera',
          cantidad: 15000,
          minimo: 5000,
          maximo: 25000
        },
        {
          skuId: 'sku_demo_2',
          skuCodigo: 'BLA 2DA',
          skuNombre: 'Blanco Segunda',
          cantidad: 8500,
          minimo: 3000,
          maximo: 15000
        }
      ]

      for (const stockItem of stocksDemo) {
        await addDoc(collection(db, 'stock'), {
          ...stockItem,
          ubicacion: 'bodega_principal',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
        addLog(`✓ ${stockItem.skuCodigo}: ${stockItem.cantidad} u.`)
      }

      addLog('🎉 Stock demo creado (2 productos)')
      await refetchStock()
    } catch (error: any) {
      addLog(`✗ Error: ${error.message}`)
    }
  }

  const testLeerStock = async () => {
    try {
      addLog('📦 Leyendo stock...')
      const stockSnapshot = await getDocs(collection(db, 'stock'))
      if (stockSnapshot.size === 0) {
        addLog('⚠️  No hay stock. Usa el botón "Crear Stock Demo" primero.')
        return
      }

      addLog(`✓ Stock encontrado: ${stockSnapshot.size} productos`)
      stockSnapshot.forEach(docSnap => {
        const data = docSnap.data() as any
        const estado = data.cantidad < data.minimo ? '⚠️ BAJO' : '✅ OK'
        addLog(`  ID=${docSnap.id} | ${data.skuCodigo}: ${data.cantidad} u. ${estado}`)
      })
    } catch (error: any) {
      addLog(`✗ Error: ${error.message}`)
    }
  }

  // ==================== TESTS VALES / DETALLE (BODEGA + PACKING) ====================

  // 1) Diagnóstico de cómo matchea detalle.sku contra el catálogo de SKUs
  const testSkusEnDetalles = () => {
    addLog('🔍 Test SKUs en detalles de vales (Bodega + Packing)...')
    addLog(`   Total vales en memoria: ${vales.length}`)
    if (vales.length === 0) {
      addLog('⚠️  No hay vales cargados en el hook useVales()')
      return
    }

    const primerosVales = (vales as Vale[]).slice(0, 10)

    primerosVales.forEach((vale, idxVale) => {
      addLog(
        `\n📋 Vale #${vale.correlativoDia} (${vale.tipo?.toUpperCase()}) - estado=${vale.estado} - origen=${vale.origenNombre} - destino=${vale.destinoNombre}`
      )

      if (!vale.detalles || vale.detalles.length === 0) {
        addLog('   ⚠️  Este vale no tiene detalles')
        return
      }

      ;(vale.detalles as ValeDetalle[]).forEach((detalle, idxDet) => {
        const codigo = detalle.sku
        const skuPorCodigo: Sku | undefined = skus.find(s => s.codigo === codigo)
        const skuPorId: Sku | undefined = skus.find(s => (s as any).id === codigo)
        const nombreHelper = getSkuNombreHelper(skus, codigo)

        addLog(
          `   ➜ Detalle ${idxVale}-${idxDet}: sku="${codigo}" | helper="${nombreHelper}" | matchCodigo=${!!skuPorCodigo} | matchId=${!!skuPorId} | cajas=${detalle.cajas} | bandejas=${detalle.bandejas} | unidades=${detalle.unidades} | total=${detalle.totalUnidades}`
        )
      })
    })
  }

  // 2) Vista "similar" al DetalleValeModal de BODEGA (usa mismo getSkuNombre)
  const testVistaDetalleBodega = () => {
    addLog('🧾 Vista simulada DetalleValeModal (BODEGA)...')

    const vale = (vales as Vale[])[0]
    if (!vale) {
      addLog('⚠️  No hay vales para mostrar')
      return
    }

    addLog(
      `Vale Bodega #${vale.correlativoDia} | tipo=${vale.tipo} | estado=${vale.estado} | origen=${vale.origenNombre} | destino=${vale.destinoNombre}`
    )

    if (!vale.detalles || vale.detalles.length === 0) {
      addLog('   ⚠️  Este vale no tiene detalles')
      return
    }

    ;(vale.detalles as ValeDetalle[]).forEach((detalle, idx) => {
      const nombre = getSkuNombreHelper(skus, detalle.sku)
      addLog(
        `   [BODEGA] Detalle ${idx}: SKU=${detalle.sku} | Nombre="${nombre}" | cajas=${detalle.cajas} | bandejas=${detalle.bandejas} | unidades=${detalle.unidades} | total=${detalle.totalUnidades}`
      )
    })

    addLog(`   Total general (vale.totalUnidades) = ${vale.totalUnidades}`)
  }

  // 3) Vista "similar" al DetalleValeModal de PACKING
  //    A nivel de datos es el mismo vale; lo que cambia es el módulo donde se abre.
  const testVistaDetallePacking = () => {
    addLog('📦 Vista simulada DetalleValeModal (PACKING)...')

    const vale = (vales as Vale[])[0]
    if (!vale) {
      addLog('⚠️  No hay vales para mostrar')
      return
    }

    addLog(
      `Vale Packing #${vale.correlativoDia} | tipo=${vale.tipo} | estado=${vale.estado} | origen=${vale.origenNombre} | destino=${vale.destinoNombre}`
    )

    if (!vale.detalles || vale.detalles.length === 0) {
      addLog('   ⚠️  Este vale no tiene detalles')
      return
    }

    ;(vale.detalles as ValeDetalle[]).forEach((detalle, idx) => {
      const nombre = getSkuNombreHelper(skus, detalle.sku)
      addLog(
        `   [PACKING] Detalle ${idx}: SKU=${detalle.sku} | Nombre="${nombre}" | cajas=${detalle.cajas} | bandejas=${detalle.bandejas} | unidades=${detalle.unidades} | total=${detalle.totalUnidades}`
      )
    })

    addLog(`   Total general (vale.totalUnidades) = ${vale.totalUnidades}`)
  }

  // 4) Verificar que los códigos de detalle existan también en colección STOCK
  const testDetalleVsStock = async () => {
    try {
      addLog('🔍 Verificando que los SKU de los detalles existan en STOCK...')

      const vale = (vales as Vale[])[0]
      if (!vale || !vale.detalles || vale.detalles.length === 0) {
        addLog('⚠️  No hay vale con detalles para verificar')
        return
      }

      for (const detalle of vale.detalles as ValeDetalle[]) {
        const codigo = detalle.sku
        addLog(`   ➜ Buscando stock para skuCodigo="${codigo}"...`)

        const stockSnapshot = await getDocs(
          query(collection(db, 'stock'), where('skuCodigo', '==', codigo))
        )

        if (stockSnapshot.empty) {
          addLog('      ❌ No hay documentos de stock con ese skuCodigo')
        } else {
          stockSnapshot.forEach(docSnap => {
            const data = docSnap.data() as any
            addLog(
              `      ✅ STOCK encontrado: ID=${docSnap.id} | cantidad=${data.cantidad} | disponible=${data.disponible ?? data.cantidad}`
            )
          })
        }
      }
    } catch (error: any) {
      addLog(`✗ Error en testDetalleVsStock: ${error.message}`)
    }
  }

  // ==================== RENDER ====================
  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'monospace',
        maxWidth: '1200px',
        margin: '0 auto'
      }}
    >
      <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#333' }}>
        🧪 Test Firestore Database - AVGAL v2 - DIAGNÓSTICO DETALLES / STOCK
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
          borderRadius: '8px'
        }}
      >
        <span style={badgeStyle(loadingPab)}>
          📊 Pabellones: {loadingPab ? '⏳' : `✅ ${pabellones.length}`}
        </span>
        <span style={badgeStyle(loadingSku)}>
          📦 SKUs: {loadingSku ? '⏳' : `✅ ${skus.length}`}
        </span>
        <span style={badgeStyle(loadingDest)}>
          📍 Destinos: {loadingDest ? '⏳' : `✅ ${destinos.length}`}
        </span>
        <span style={badgeStyle(loadingTrans)}>
          🚚 Transportistas: {loadingTrans ? '⏳' : `✅ ${transportistas.length}`}
        </span>
        <span style={badgeStyle(loadingOrig)}>
          🔄 Orígenes: {loadingOrig ? '⏳' : `✅ ${origenes.length}`}
        </span>
        <span style={badgeStyle(loadingStock)}>
          📦 Stock: {loadingStock ? '⏳' : `✅ ${stock.length}`}
        </span>
        <span style={badgeStyle(loadingVales)}>
          📋 Vales: {loadingVales ? '⏳' : `✅ ${vales.length}`}
        </span>
      </div>

      {/* ====== TABLA DE PABELLONES ====== */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '20px', marginBottom: 10, color: '#1976d2' }}>
          🏭 Pabellones (Estado Sincronizado)
        </h2>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: '#fff',
            fontSize: 14,
            marginTop: 12
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
              <tr
                key={pb.id}
                style={{ background: pb.activo ? '#e8f5e9' : '#ffebee' }}
              >
                <td style={cellStyle}>{pb.id}</td>
                <td style={cellStyle}>{pb.nombre}</td>
                <td style={cellStyle}>
                  <strong style={{ color: pb.activo ? 'green' : 'red' }}>
                    {pb.activo ? 'SÍ' : 'NO'}
                  </strong>
                </td>
                <td style={cellStyle}>{String(pb.automatico)}</td>
                <td style={cellStyle}>{pb.capacidadTotal?.toLocaleString()}</td>
                <td style={cellStyle}>{pb.totalLineas}</td>
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
              marginTop: 4
            }}
          >
            {JSON.stringify(
              pabellonesActivos.map(p => ({
                id: p.id,
                nombre: p.nombre,
                activo: p.activo
              })),
              null,
              2
            )}
          </pre>
        </div>
      </div>

      {/* ====== SECCIÓN: TESTS BÁSICOS ====== */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#ff9800' }}>
          🔥 Tests Básicos
        </h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={testLeerPabellones} style={buttonStyle}>
            📖 Leer Pabellones (getDocs)
          </button>
          <button onClick={testHooks} style={buttonStyleSuccess}>
            🧪 Probar Todos los Hooks
          </button>
        </div>
      </div>

      {/* ====== SECCIÓN: TESTS DE STOCK ====== */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#2196F3' }}>
          📦 Tests de Stock (Bodega)
        </h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={testCrearStockDemo} style={buttonStyle}>
            🎨 Crear Stock Demo (2 productos)
          </button>
          <button onClick={testLeerStock} style={buttonStyleSuccess}>
            📖 Leer Stock
          </button>
        </div>
      </div>

      {/* ====== SECCIÓN: TESTS DETALLE VALES (BODEGA/PACKING) ====== */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#d32f2f' }}>
          🔍 Tests Detalle de Vales (Bodega + Packing)
        </h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={testSkusEnDetalles} style={buttonStyle}>
            🔎 1. SKUs en Detalles (match catálogo)
          </button>
          <button onClick={testVistaDetalleBodega} style={buttonStyle}>
            🧾 2. Simular DetalleValeModal Bodega
          </button>
          <button onClick={testVistaDetallePacking} style={buttonStyle}>
            📦 3. Simular DetalleValeModal Packing
          </button>
          <button onClick={testDetalleVsStock} style={{ ...buttonStyle, backgroundColor: '#d32f2f' }}>
            📊 4. Detalles vs Stock (skuCodigo)
          </button>
          <button
            onClick={async () => {
              addLog('♻️ Refrescando hooks de Stock y Vales...')
              await Promise.all([refetchStock(), refetchVales()])
              addLog('✅ Refrescados Stock y Vales (hooks)')
            }}
            style={buttonStyleSuccess}
          >
            ♻️ Refrescar Stock y Vales (hooks)
          </button>
        </div>
      </div>

      {/* ====== BOTÓN LIMPIAR ====== */}
      <button
        onClick={() => setLogs([])}
        style={{ ...buttonStyle, backgroundColor: '#dc3545', marginBottom: '20px' }}
      >
        🗑️ Limpiar Console
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
          lineHeight: '1.6'
        }}
      >
        <div
          style={{
            marginBottom: '10px',
            fontWeight: 'bold',
            color: '#4fc3f7'
          }}
        >
          📋 Console Logs:
        </div>
        {logs.length === 0 ? (
          <div style={{ color: '#888' }}>
            No hay logs. Ejecuta un test haciendo click en los botones...
          </div>
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
  transition: 'background-color 0.2s'
}

const buttonStyleSuccess: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#4caf50'
}

const badgeStyle = (loading: boolean): React.CSSProperties => ({
  padding: '10px 16px',
  backgroundColor: loading ? '#ff9800' : '#4caf50',
  color: 'white',
  borderRadius: '20px',
  fontSize: '13px',
  fontWeight: 'bold',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
})
