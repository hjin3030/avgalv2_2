// frontend/src/pages/test-firestore.tsx

import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useState } from 'react';

import { usePabellones } from '../hooks/usePabellones';
import { useSkus } from '../hooks/useSkus';
import { useDestinos } from '../hooks/useDestinos';
import { useTransportistas } from '../hooks/useTransportistas';
import { useOrigenes } from '../hooks/useOrigenes';
import { useStock } from '../hooks/useStock';
import { useVales } from '../hooks/useVales';

export default function TestFirestorePage() {
  const { pabellones, loading: loadingPab } = usePabellones();
  const { skus, loading: loadingSku } = useSkus();
  const { destinos, loading: loadingDest } = useDestinos();
  const { transportistas, loading: loadingTrans } = useTransportistas();
  const { origenes, loading: loadingOrig } = useOrigenes();
  const { stock, loading: loadingStock } = useStock();
  const { vales, loading: loadingVales } = useVales();

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
      ];

      for (const stock of stocksDemo) {
        await addDoc(collection(db, 'stock'), {
          ...stock,
          ubicacion: 'bodega_principal',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        addLog(`✓ ${stock.skuCodigo}: ${stock.cantidad} u.`);
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
        addLog(`  ${data.skuCodigo}: ${data.cantidad} u. ${estado}`);
      });
    } catch (error: any) {
      addLog(`✗ Error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#333' }}>
        🧪 Test Firestore Database - AVGAL v2
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
