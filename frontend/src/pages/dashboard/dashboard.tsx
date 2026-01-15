// src/pages/dashboard/dashboard.tsx

import { useState, useMemo } from 'react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useVales } from '../../hooks/useVales'
import { useStock } from '../../hooks/useStock'
import { useMovimientos } from '../../hooks/useMovimientos'
import { useContadores } from '../../hooks/useContadores'
import { useSkus } from '../../hooks/useSkus'

import CartolaModal from '../../components/movimientos/CartolaModal'
import DetalleValeModal from '../../components/bodega/BodegaDetalleValeModal'
import HistorialSkuModal from '../../components/movimientos/HistorialSkuModal'

import KPICards from '../../components/dashboard/KPIcards'
import ValesEvolutionChart from '../../components/dashboard/ValesEvolutionChart'

import StockDistributionChart from '../../components/dashboard/StockDistributionChart'
import TopDestinosChart from '../../components/dashboard/TopDestinosChart'
import TopOrigenesChart from '../../components/dashboard/TopOrigenesChart'
import MovimientosHoraChart from '../../components/dashboard/MovimientosHoraChart'
import TransportistasChart from '../../components/dashboard/TransportistasChart'
import MermaChart from '../../components/dashboard/MermaChart'
import ProduccionPabellonChart from '../../components/dashboard/ProduccionPabellonChart'
import ProdRealVsTeoricaChart from '../../components/dashboard/ProdRealVsTeoricaChart'
import ProduccionPorPabellonRealChart from '../../components/dashboard/ProduccionPorPabellonRealChart'

import { calcularDesglose, formatearDesglose } from '../../utils/stockHelpers'
import { getSkuInfo } from '../../utils/constants'


// Fecha hoy en local, formato YYYY-MM-DD
const getHoyLocalISO = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function desglose(skuCodigo: string, cantidad: number) {
  const info = getSkuInfo(skuCodigo)

  // fallback por si el sku no está en catálogo
  const unidadesPorCaja = info?.unidadesPorCaja ?? 180
  const unidadesPorBandeja = info?.unidadesPorBandeja ?? 30

  const d = calcularDesglose(Math.abs(cantidad ?? 0), unidadesPorCaja, unidadesPorBandeja)
  return formatearDesglose(d)
}


const formatFecha = (fecha: string): string => {
  if (!fecha) return '-'
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

function formatNumber(num: number) {
  return Number(num ?? 0).toLocaleString('es-CL')
}

export default function Dashboard() {
  const hoy = getHoyLocalISO()

  // MODALES
  const [showCartola, setShowCartola] = useState(false)
  const [showValeDetalle, setShowValeDetalle] = useState(false)
  const [valeDetalle, setValeDetalle] = useState<any | undefined>(undefined)
  const [showSkuHistorial, setShowSkuHistorial] = useState(false)
  const [skuHistorialCodigo, setSkuHistorialCodigo] = useState<string>('')


  const { vales, loading: loadingVales } = useVales()
  const { stock, loading: loadingStock } = useStock()
  const { movimientos, loading: loadingMov } = useMovimientos({ limitCount: 300, soloValidados: false })


  const { contadores } = useContadores(hoy)
  const { skus: allSkus, loading: loadingSkus } = useSkus(true)

  // COLAPSABLES UI
  const [showKPIs, setShowKPIs] = useState(true)
  const [showGraficos, setShowGraficos] = useState(true)
  const [showStock, setShowStock] = useState(true)
  const [showTabs, setShowTabs] = useState(true)

  // TABS
  const [tabActiva, setTabActiva] = useState<'vales' | 'pabellones' | 'transportistas'>('vales')

  // STOCK FILTROS Y ORDEN
  const [stockFilter, setStockFilter] = useState('')
  const [sortBy, setSortBy] = useState<'skuCodigo' | 'skuNombre' | 'cantidad'>('skuCodigo')
  const [sortAsc, setSortAsc] = useState(true)
  const [stockLimit, setStockLimit] = useState(20)
  const [selectedSkus, setSelectedSkus] = useState<string[]>([])

  // KPIs
  const contadoresPorPabellon = useMemo(() => {
    if (!contadores?.contadores) return {}
    const resultado: Record<string, number> = {}
    contadores.contadores.forEach((c) => {
      const pabellon = c.pabellonNombre || `Pab ${c.pabellonId}`
      if (!resultado[pabellon]) {
        resultado[pabellon] = 0
      }
      resultado[pabellon] += c.valor || 0
    })
    return resultado
  }, [contadores])

  const loading = loadingVales || loadingStock || loadingMov || loadingSkus

  // ---------- LOGICA DE SKUS Y STOCK CORREGIDA ----------
  const skusActivos = useMemo(() => allSkus.filter((sku) => sku.activo === true), [allSkus])
  const codigosActivos = useMemo(() => skusActivos.map((s) => s.codigo), [skusActivos])

  const getSkuNombre = (codigo: string) => {
    const sku = skusActivos.find((s) => s.codigo === codigo)
    return sku?.nombre || 'Desconocido'
  }

  // STOCK FILTRADO SOLO con SKUs activos
  const stockFiltrado = useMemo(() => {
    let filtrado = stock.filter((item) => codigosActivos.includes(item.skuCodigo))
    if (stockFilter) {
      const f = stockFilter.toLowerCase()
      filtrado = filtrado.filter(
        (s) =>
          (s.skuCodigo && s.skuCodigo.toLowerCase().includes(f)) ||
          getSkuNombre(s.skuCodigo).toLowerCase().includes(f),
      )
    }
    if (selectedSkus.length > 0) {
      filtrado = filtrado.filter((s) => selectedSkus.includes(s.skuCodigo))
    }
    filtrado = [...filtrado].sort((a, b) => {
      let va =
        sortBy === 'skuNombre'
          ? getSkuNombre(a.skuCodigo)
          : (a[sortBy] as any) ?? ''
      let vb =
        sortBy === 'skuNombre'
          ? getSkuNombre(b.skuCodigo)
          : (b[sortBy] as any) ?? ''
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va === vb) return 0
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })
    return filtrado
  }, [stock, stockFilter, sortBy, sortAsc, selectedSkus, codigosActivos, skusActivos])

  const stockPage = stockFiltrado.slice(0, stockLimit)

  // EXPORT CSV
  const exportarStockCsv = () => {
    const headers = ['SKU', 'Nombre', 'Cantidad', 'Desglose']
    const filas = stockFiltrado.map((s) => [
      s.skuCodigo,
      getSkuNombre(s.skuCodigo),
      s.cantidad?.toLocaleString('es-CL') || 0,
      desglose(s.skuCodigo, s.cantidad),
    ])
    const csvContent = [
      headers.join(','),
      ...filas.map((fila) => fila.map((campo) => `"${campo}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `stock_${getHoyLocalISO()}.csv`
    link.click()
  }

  function formatFechaVale(fecha: string): string {
    return formatFecha(fecha)
  }

  function getUltimoMovimiento(skuCodigo: string, tipo: string) {
    const movs = movimientos.filter((m) => m.skuCodigo === skuCodigo && m.tipo === tipo)
    if (!movs.length) return '-'
    const target = movs.reduce((a, b) =>
      (a.timestamp || a.fecha || '') > (b.timestamp || b.fecha || '') ? a : b,
    )
    return (
      (typeof target.cantidad === 'number'
        ? (target.cantidad >= 0 ? '+' : '') +
          Math.abs(target.cantidad).toLocaleString('es-CL')
        : '-') +
      ' / ' +
      (target.fecha ? formatFecha(target.fecha) : '-')
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* KPIs principales */}
      <div className="mb-6 bg-white shadow-sm border border-gray-200 rounded-lg">
        <div
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setShowKPIs(!showKPIs)}
        >
          <span className="text-xl font-bold text-gray-900">KPIs principales</span>
          <span className="text-lg">{showKPIs ? '▲' : '▼'}</span>
        </div>
        {showKPIs && (
          <div className="p-4">
            <KPICards
              vales={vales}
              stock={stock}
              contadoresPorPabellon={contadoresPorPabellon}
            />
          </div>
        )}
      </div>

      {/* Graficos */}
      <div className="mb-6 bg-white shadow-sm border border-gray-200 rounded-lg">
        <div
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setShowGraficos(!showGraficos)}
        >
          <span className="text-xl font-bold text-gray-900">Gráficos varios</span>
          <span className="text-lg">{showGraficos ? '▲' : '▼'}</span>
        </div>
        {showGraficos && (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ValesEvolutionChart />
            <StockDistributionChart />
            <TopDestinosChart />
            <TopOrigenesChart />
            <TransportistasChart />
            <MovimientosHoraChart />
            <MermaChart />
            
      
            <ProduccionPabellonChart />
            
            <ProduccionPorPabellonRealChart />
            <ProdRealVsTeoricaChart />
          </div>
        )}
      </div>

      {/* STOCK REAL */}
      <div className="mb-8 bg-white shadow-sm border border-gray-200 rounded-lg">
        <div
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setShowStock(!showStock)}
        >
          <span className="text-xl font-bold text-gray-900">Stock real</span>
          <span className="text-lg">{showStock ? '▲' : '▼'}</span>
        </div>
        {showStock && (
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {/* Filtro: select múltiple con checkbox */}
              <div className="relative">
                <button
                  className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
                  onClick={() => {
                    const select = document.getElementById('stock-sku-select')
                    if (select) select.classList.toggle('hidden')
                  }}
                >
                  Filtrar SKUs activos
                </button>
                <div
                  id="stock-sku-select"
                  className="absolute left-0 top-10 z-10 bg-white border rounded shadow-lg w-64 max-h-72 overflow-y-auto hidden"
                >
                  {skusActivos.map((sku) => (
                    <label
                      key={sku.codigo}
                      className="block px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSkus.includes(sku.codigo)}
                        onChange={(e) => {
                          if (e.target.checked)
                            setSelectedSkus([...selectedSkus, sku.codigo])
                          else
                            setSelectedSkus(
                              selectedSkus.filter((c) => c !== sku.codigo),
                            )
                        }}
                        className="mr-2"
                      />
                      {sku.codigo} - {sku.nombre}
                    </label>
                  ))}
                  <div className="px-3 py-2">
                    <button
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded"
                      onClick={() => setSelectedSkus([])}
                    >
                      Limpiar filtro
                    </button>
                  </div>
                </div>
              </div>
              {/* Input de texto libre como extra */}
              <input
                type="text"
                placeholder="Filtrar por texto"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="px-3 py-2 rounded border border-gray-300 text-sm"
              />
              <button
                className="px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition"
                onClick={exportarStockCsv}
              >
                Exportar CSV
              </button>
              <button
                className="px-4 py-2 bg-gray-700 text-white rounded font-medium"
                onClick={() => setShowCartola(true)}
              >
                Ver Cartola
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => {
                        setSortBy('skuCodigo')
                        setSortAsc(sortBy !== 'skuCodigo' ? true : !sortAsc)
                      }}
                    >
                      SKU {sortBy === 'skuCodigo' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => {
                        setSortBy('skuNombre')
                        setSortAsc(sortBy !== 'skuNombre' ? true : !sortAsc)
                      }}
                    >
                      Nombre {sortBy === 'skuNombre' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => {
                        setSortBy('cantidad')
                        setSortAsc(sortBy !== 'cantidad' ? true : !sortAsc)
                      }}
                    >
                      Cantidad {sortBy === 'cantidad' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Desglose
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último Ingreso
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último Egreso
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último Reingreso
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stockPage.map((item, i) => (
                    <tr key={(item.skuCodigo || '') + '-' + i}>
                      <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                        {item.skuCodigo}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getSkuNombre(item.skuCodigo)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold whitespace-nowrap">
                        {item.cantidad?.toLocaleString('es-CL') || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {desglose(item.skuCodigo, item.cantidad)}

                      </td>
                      <td className="px-4 py-3 text-center text-[#16a34a]">
                        {getUltimoMovimiento(item.skuCodigo, 'ingreso')}
                      </td>
                      <td className="px-4 py-3 text-center text-[#f59e42]">
                        {getUltimoMovimiento(item.skuCodigo, 'egreso')}
                      </td>
                      <td className="px-4 py-3 text-center text-[#2563eb]">
                        {getUltimoMovimiento(item.skuCodigo, 'reingreso')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap flex gap-2">
                        <button
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                          onClick={() => {
                            setSkuHistorialCodigo(item.skuCodigo)
                            setShowSkuHistorial(true)
                          }}
                        >
                          Ver Historial
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {stockLimit < stockFiltrado.length && (
              <div className="flex justify-center mt-6">
                <button
                  className="px-5 py-2 rounded bg-blue-600 text-white font-bold"
                  onClick={() => setStockLimit(stockLimit + 20)}
                >
                  Ver más
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {showCartola && (
        <CartolaModal isOpen={showCartola} onClose={() => setShowCartola(false)} />
      )}
        {showSkuHistorial && skuHistorialCodigo && (
          <HistorialSkuModal
            isOpen={showSkuHistorial}
            onClose={() => setShowSkuHistorial(false)}
            skuCodigo={skuHistorialCodigo}
          />
        )}


      {/* TABS SECCIÓN */}
      <div className="mb-8 bg-white shadow-sm border border-gray-200 rounded-lg">
        <div
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setShowTabs(!showTabs)}
        >
          <span className="text-xl font-bold text-gray-900">Pestañas (EN DESARROLLO)</span>
          <span className="text-lg">{showTabs ? '▲' : '▼'}</span>
        </div>
        {showTabs && (
          <div className="p-4">
            <nav className="flex space-x-8 mb-4" aria-label="Tabs">
              <button
                onClick={() => setTabActiva('vales')}
                className={`py-2 px-3 rounded ${
                  tabActiva === 'vales'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Últimos Vales
              </button>
              <button
                onClick={() => setTabActiva('pabellones')}
                className={`py-2 px-3 rounded ${
                  tabActiva === 'pabellones'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Pabellones
              </button>
              <button
                onClick={() => setTabActiva('transportistas')}
                className={`py-2 px-3 rounded ${
                  tabActiva === 'transportistas'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Transportistas
              </button>
            </nav>
            {tabActiva === 'vales' && (
              <div className="overflow-x-auto">
                {vales.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hay vales registrados
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unidades
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuario
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {vales.slice(0, 10).map((vale, i) => (
                        <tr key={vale.id || i}>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {formatFechaVale(vale.fecha)}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                vale.tipo === 'ingreso'
                                  ? 'bg-blue-100 text-blue-800'
                                  : vale.tipo === 'egreso'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {vale.tipo.charAt(0).toUpperCase() + vale.tipo.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                vale.estado === 'validado'
                                  ? 'bg-green-100 text-green-800'
                                  : vale.estado === 'pendiente'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {vale.estado.charAt(0).toUpperCase() + vale.estado.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold whitespace-nowrap">
                            {vale.totalUnidades?.toLocaleString('es-CL') || 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {vale.usuarioCreadorNombre || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              className="px-2 py-1 bg-green-700 text-white rounded text-xs"
                              onClick={() => {
                                setValeDetalle(vale)
                                setShowValeDetalle(true)
                              }}
                            >
                              Ver Detalle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {tabActiva === 'pabellones' && (
              <div className="p-6 text-gray-700">
                <span>Pabellones (en desarrollo)</span>
              </div>
            )}
            {tabActiva === 'transportistas' && (
              <div className="p-6 text-gray-700">
                <span>Transportistas (en desarrollo)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {showValeDetalle && valeDetalle && (
        <DetalleValeModal
          vale={valeDetalle}
          isOpen={showValeDetalle}
          onClose={() => setShowValeDetalle(false)}
        />
      )}
    </div>
  )
}
