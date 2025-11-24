// frontend/src/pages/test-firestore.tsx

import { collection, getDocs, addDoc, Timestamp, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useState } from 'react';

import { usePabellones } from '../hooks/usePabellones';
import { useSkus } from '../hooks/useSkus';
import { useDestinos } from '../hooks/useDestinos';
import { useTransportistas } from '../hooks/useTransportistas';
import { useOrigenes } from '../hooks/useOrigenes';
import { useStock } from '../hooks/useStock';
import { useVales } from '../hooks/useVales';
import { useMovimientos } from '../hooks/useMovimientos';

import { limpiarYReconstruirTodo } from '@/utils/fix-movimientos'



export default function TestFirestorePage() {
  const { pabellones, loading: loadingPab } = usePabellones();
  const { skus, loading: loadingSku } = useSkus();
  const { destinos, loading: loadingDest } = useDestinos();
  const { transportistas, loading: loadingTrans } = useTransportistas();
  const { origenes, loading: loadingOrig } = useOrigenes();
  const { stock, loading: loadingStock } = useStock();
  const { vales, loading: loadingVales } = useVales();
  const { movimientos, loading: loadingMovs } = useMovimientos();

  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (message: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);

  const pabellonesActivos = pabellones.filter(p => p.activo === true);
  const pabellonesInactivos = pabellones.filter(p => p.activo === false);

  const cellStyle = { border: '1px solid #eee', padding: '4px 8px' };

  // ==================== TESTS BÁSICOS ====================
  const testLeerPabellones = async () => {
    try {
      addLog('🔍 Leyendo pabellones con getDocs()...');
      const querySnapshot = await getDocs(collection(db, 'pabellones'));
      querySnapshot.forEach((doc) => {
        addLog(`✓ ${doc.id}: ${doc.data().nombre}`);
      });
      addLog(`✓ Total pabellones: ${querySnapshot.size}`);
    } catch (error: any) {
      addLog(`✗ Error: ${error.code} - ${error.message}`);
    }
  };

  const testHooks = () => {
    addLog('🧪 PROBANDO HOOKS (REALTIME)...');
    addLog('');
    addLog(`📊 usePabellones(): ${pabellones.length} pabellones`);
    addLog(`   Activos: ${pabellonesActivos.length}`);
    addLog(`   Inactivos: ${pabellonesInactivos.length}`);
    addLog(`📦 useSkus(): ${skus.length} SKUs`);
    addLog(`📍 useDestinos(): ${destinos.length} destinos`);
    addLog(`🚚 useTransportistas(): ${transportistas.length} transportistas`);
    addLog(`🔄 useOrigenes(): ${origenes.length} orígenes`);
    addLog(`📦 useStock(): ${stock.length} productos en stock`);
    addLog(`📋 useVales(): ${vales.length} vales`);
    addLog(`🔄 useMovimientos(): ${movimientos.length} movimientos`);
    addLog('');
    addLog('✅ Todos los hooks funcionando correctamente');
  };

  // ==================== TESTS STOCK ====================
  const testCrearStockDemo = async () => {
    try {
      addLog('📦 Creando stock demo...');
      const stocksDemo = [
        {
          skuId: 'sku_demo_1',
          skuCodigo: 'BLA-1ERA',
          skuNombre: 'Blanco Primera',
          cantidad: 15000,
          minimo: 5000,
          maximo: 25000,
        },
        {
          skuId: 'sku_demo_2',
          skuCodigo: 'BLA-2DA',
          skuNombre: 'Blanco Segunda',
          cantidad: 8500,
          minimo: 3000,
          maximo: 15000,
        },
      ];

      for (const stockItem of stocksDemo) {
        await addDoc(collection(db, 'stock'), {
          ...stockItem,
          ubicacion: 'bodega_principal',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        addLog(`✓ ${stockItem.skuCodigo}: ${stockItem.cantidad} u.`);
      }

      addLog('🎉 Stock demo creado (2 productos)');
    } catch (error: any) {
      addLog(`✗ Error: ${error.message}`);
    }
  };

  const testLeerStock = async () => {
    try {
      addLog('📦 Leyendo stock...');
      const stockSnapshot = await getDocs(collection(db, 'stock'));
      if (stockSnapshot.size === 0) {
        addLog('⚠️  No hay stock. Usa el botón "Crear Stock Demo" primero.');
        return;
      }

      addLog(`✓ Stock encontrado: ${stockSnapshot.size} productos`);
      stockSnapshot.forEach((doc) => {
        const data = doc.data();
        const estado = data.cantidad < data.minimo ? '⚠️ BAJO' : '✅ OK';
        addLog(`  ID: ${doc.id} | SKU: ${data.skuCodigo} | Cantidad: ${data.cantidad} u. ${estado}`);
      });
    } catch (error: any) {
      addLog(`✗ Error: ${error.message}`);
    }
  };

  // ==================== TESTS DE DIAGNÓSTICO ====================
  const testDiagnosticarStock = async () => {
    try {
      addLog('🔍 DIAGNÓSTICO: Verificando estructura de stock...');
      addLog('');
      
      const stockSnapshot = await getDocs(collection(db, 'stock'));
      
      if (stockSnapshot.size === 0) {
        addLog('⚠️  No hay stock en la base de datos');
        return;
      }

      addLog(`✓ Total documentos en stock: ${stockSnapshot.size}`);
      addLog('');
      addLog('📋 Estructura de cada documento:');
      
      stockSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        addLog(`\n  🆔 ID del documento: "${docSnap.id}"`);
        addLog(`     - skuCodigo: ${data.skuCodigo || '(no definido)'}`);
        addLog(`     - skuId: ${data.skuId || '(no definido)'}`);
        addLog(`     - cantidad: ${data.cantidad || 0}`);
      });

      addLog('');
      addLog('🔍 DIAGNÓSTICO: Verificando vales recientes...');
      
      const valesSnapshot = await getDocs(collection(db, 'vales'));
      addLog(`✓ Total vales: ${valesSnapshot.size}`);
      
      const valesRecientes = valesSnapshot.docs
        .slice(0, 3)
        .map(d => ({ id: d.id, ...d.data() }));
      
      valesRecientes.forEach((vale: any) => {
        addLog(`\n  📋 Vale: ${vale.tipo?.toUpperCase()} #${vale.correlativoDia}`);
        addLog(`     Estado: ${vale.estado}`);
        addLog(`     Detalles: ${JSON.stringify(vale.detalles?.[0]?.sku || 'sin detalles')}`);
      });

    } catch (error: any) {
      addLog(`✗ Error: ${error.message}`);
    }
  };

  const testVerificarMovimientos = async () => {
    try {
      addLog('🔍 Verificando movimientos vs stock...');
      addLog('');

      // Leer movimientos
      const movsSnapshot = await getDocs(collection(db, 'movimientos'));
      addLog(`✓ Total movimientos registrados: ${movsSnapshot.size}`);
      
      if (movsSnapshot.size === 0) {
        addLog('⚠️  No hay movimientos registrados');
        return;
      }

      // Agrupar por SKU
      const movsPorSku: Record<string, { ingresos: number; egresos: number; reingresos: number }> = {};
      
      movsSnapshot.forEach((docSnap) => {
        const mov = docSnap.data();
        const skuCodigo = mov.skuCodigo;
        
        if (!movsPorSku[skuCodigo]) {
          movsPorSku[skuCodigo] = { ingresos: 0, egresos: 0, reingresos: 0 };
        }
        
        if (mov.tipo === 'ingreso') movsPorSku[skuCodigo].ingresos += mov.cantidad || 0;
        if (mov.tipo === 'egreso') movsPorSku[skuCodigo].egresos += mov.cantidad || 0;
        if (mov.tipo === 'reingreso') movsPorSku[skuCodigo].reingresos += mov.cantidad || 0;
      });

      addLog('');
      addLog('📊 Resumen de movimientos por SKU:');
      
      for (const [skuCodigo, totales] of Object.entries(movsPorSku)) {
        const balanceCalculado = totales.ingresos - totales.egresos + totales.reingresos;
        addLog(`\n  📦 SKU: ${skuCodigo}`);
        addLog(`     ➕ Ingresos: ${totales.ingresos} u.`);
        addLog(`     ➖ Egresos: ${totales.egresos} u.`);
        addLog(`     🔄 Reingresos: ${totales.reingresos} u.`);
        addLog(`     📊 Balance calculado: ${balanceCalculado} u.`);
        
        // Buscar el stock actual
        const stockSnapshot = await getDocs(
          query(collection(db, 'stock'), where('skuCodigo', '==', skuCodigo))
        );
        
        if (stockSnapshot.empty) {
          addLog(`     ⚠️  NO EXISTE DOCUMENTO DE STOCK CON skuCodigo="${skuCodigo}"`);
          
          // Buscar por ID del documento
          const stockDoc = await getDoc(doc(db, 'stock', skuCodigo));
          if (stockDoc.exists()) {
            addLog(`     ℹ️  ENCONTRADO como ID de documento: cantidad=${stockDoc.data().cantidad}`);
          } else {
            addLog(`     ❌ TAMPOCO EXISTE como ID de documento`);
          }
        } else {
          const stockData = stockSnapshot.docs[0].data();
          const diferencia = stockData.cantidad - balanceCalculado;
          addLog(`     ✅ Stock actual en BD: ${stockData.cantidad} u.`);
          
          if (diferencia !== 0) {
            addLog(`     ⚠️  DISCREPANCIA: ${Math.abs(diferencia)} u. ${diferencia > 0 ? 'de más' : 'de menos'}`);
          } else {
            addLog(`     ✅ Stock correcto`);
          }
        }
      }

    } catch (error: any) {
      addLog(`✗ Error: ${error.message}`);
    }
  };

  const testBuscarStockPorCodigo = async () => {
    try {
      addLog('🔍 Test: Buscando stock por skuCodigo vs ID documento...');
      addLog('');

      // Obtener un SKU de ejemplo
      if (skus.length === 0) {
        addLog('⚠️  No hay SKUs disponibles');
        return;
      }

      const skuEjemplo = skus[0];
      const codigoSku = skuEjemplo.codigo;
      
      addLog(`📦 SKU de prueba: ${codigoSku}`);
      addLog('');

      // Buscar por query (skuCodigo)
      addLog('1️⃣ Buscando con query WHERE skuCodigo == ...');
      const queryResult = await getDocs(
        query(collection(db, 'stock'), where('skuCodigo', '==', codigoSku))
      );
      
      if (queryResult.empty) {
        addLog(`   ❌ NO encontrado con query`);
      } else {
        queryResult.forEach((d) => {
          addLog(`   ✅ Encontrado: ID="${d.id}", cantidad=${d.data().cantidad}`);
        });
      }

      addLog('');
      
      // Buscar por ID de documento
      addLog(`2️⃣ Buscando por ID de documento doc(db, 'stock', '${codigoSku}')...`);
      const docResult = await getDoc(doc(db, 'stock', codigoSku));
      
      if (!docResult.exists()) {
        addLog(`   ❌ NO existe documento con ID="${codigoSku}"`);
      } else {
        addLog(`   ✅ Existe: cantidad=${docResult.data().cantidad}`);
      }

      addLog('');
      addLog('💡 CONCLUSIÓN:');
      addLog('   Si el método 1 funciona pero el método 2 no, entonces:');
      addLog('   - Los IDs de documentos NO coinciden con skuCodigo');
      addLog('   - valeHelpers.ts está buscando mal el documento');
      addLog('   - Hay que buscar primero con query para obtener el ID correcto');

    } catch (error: any) {
      addLog(`✗ Error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#333' }}>
        🧪 Test Firestore Database - AVGAL v2 - DIAGNÓSTICO STOCK
      </h1>

      {/* ====== INDICADORES DE ESTADO ====== */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '30px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <span style={badgeStyle(loadingPab)}>📊 Pabellones: {loadingPab ? '⏳' : `✅ ${pabellones.length}`}</span>
        <span style={badgeStyle(loadingSku)}>📦 SKUs: {loadingSku ? '⏳' : `✅ ${skus.length}`}</span>
        <span style={badgeStyle(loadingDest)}>📍 Destinos: {loadingDest ? '⏳' : `✅ ${destinos.length}`}</span>
        <span style={badgeStyle(loadingTrans)}>🚚 Transportistas: {loadingTrans ? '⏳' : `✅ ${transportistas.length}`}</span>
        <span style={badgeStyle(loadingOrig)}>🔄 Orígenes: {loadingOrig ? '⏳' : `✅ ${origenes.length}`}</span>
        <span style={badgeStyle(loadingStock)}>📦 Stock: {loadingStock ? '⏳' : `✅ ${stock.length}`}</span>
        <span style={badgeStyle(loadingVales)}>📋 Vales: {loadingVales ? '⏳' : `✅ ${vales.length}`}</span>
        <span style={badgeStyle(loadingMovs)}>🔄 Movimientos: {loadingMovs ? '⏳' : `✅ ${movimientos.length}`}</span>
      </div>

      {/* ====== TABLA DE PABELLONES ====== */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '20px', marginBottom: 10, color: '#1976d2' }}>🏭 Pabellones (Estado Sincronizado)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', fontSize: 14, marginTop: 12 }}>
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
          <pre style={{ background: '#e8f5e9', fontSize: 13, padding: 8, borderRadius: 4, marginTop: 4 }}>
            {JSON.stringify(pabellonesActivos.map(p => ({ id: p.id, nombre: p.nombre, activo: p.activo })), null, 2)}
          </pre>
        </div>
      </div>

      {/* ====== SECCIÓN: TESTS BÁSICOS ====== */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#ff9800' }}>🔥 Tests Básicos</h2>
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
        <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#2196F3' }}>📦 Tests de Stock (Bodega)</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={testCrearStockDemo} style={buttonStyle}>
            🎨 Crear Stock Demo (2 productos)
          </button>
          <button onClick={testLeerStock} style={buttonStyleSuccess}>
            📖 Leer Stock
          </button>
        </div>
      </div>

      {/* ====== SECCIÓN: TESTS DE DIAGNÓSTICO ====== */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#d32f2f' }}>🔍 Tests de Diagnóstico (CRÍTICOS)</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={testDiagnosticarStock} style={{...buttonStyle, backgroundColor: '#d32f2f'}}>
            🔍 1. Diagnosticar Estructura Stock
          </button>
          <button onClick={testVerificarMovimientos} style={{...buttonStyle, backgroundColor: '#d32f2f'}}>
            📊 2. Verificar Movimientos vs Stock
          </button>
          <button onClick={testBuscarStockPorCodigo} style={{...buttonStyle, backgroundColor: '#d32f2f'}}>
            🔎 3. Buscar Stock por Código
          </button>
          <button 
            onClick={async () => {
              const confirmar = window.confirm('⚠️ ADVERTENCIA: Esto eliminará stocks corruptos y recalculará todo. ¿Continuar?')
              if (!confirmar) return
              
              console.log('🔧 Iniciando proceso completo...')
              await limpiarYReconstruirTodo()
              alert('✅ Proceso completado. Refresca la página (F5)')
            }}
            style={{...buttonStyle, backgroundColor: '#d32f2f', fontSize: '16px', padding: '15px 25px'}}
          >
            🔧 FIX DEFINITIVO: Reconstruir Stock Completo
          </button>


        </div>
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px', fontSize: '13px' }}>
          <strong>⚠️ Estos tests identificarán por qué no se actualiza el stock:</strong>
          <ul style={{ marginTop: '8px', marginBottom: 0 }}>
            <li>Test 1: Verifica cómo están estructurados los documentos de stock</li>
            <li>Test 2: Compara movimientos registrados vs stock actual (detecta discrepancias)</li>
            <li>Test 3: Verifica si el problema es buscar por ID vs buscar por query</li>
          </ul>
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
      <div style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: '15px', borderRadius: '8px', maxHeight: '500px', overflowY: 'auto', fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px', lineHeight: '1.6' }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#4fc3f7' }}>📋 Console Logs:</div>
        {logs.length === 0 ? (
          <div style={{ color: '#888' }}>No hay logs. Ejecuta un test haciendo click en los botones...</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} style={{ marginBottom: '4px' }}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
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
};

const buttonStyleSuccess: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#4caf50',
};

const badgeStyle = (loading: boolean): React.CSSProperties => ({
  padding: '10px 16px',
  backgroundColor: loading ? '#ff9800' : '#4caf50',
  color: 'white',
  borderRadius: '20px',
  fontSize: '13px',
  fontWeight: 'bold',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
});


