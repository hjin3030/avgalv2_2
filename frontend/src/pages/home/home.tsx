import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useVales } from '@/hooks/useVales'
import { formatDateTime } from '@/lib/formatters'
import { todayDateString } from '@/utils/formatHelpers'
import {
  verificarContadoresIngresados,
  obtenerContadoresFecha,
  obtenerFechaAnterior,
  obtenerPesoBalde
} from '@/utils/produccionHelpers'

// Función helper para formatear fecha a DD-MM-AAAA
const formatearFecha = (fechaStr: string): string => {
  const [year, month, day] = fechaStr.split('-')
  return `${day}-${month}-${year}`
}

export default function Home() {
  const {hasPermission } = useAuth()
  const navigate = useNavigate()
  const { vales } = useVales()

  const [contadoresIngresados, setContadoresIngresados] = useState(false)
  const [contadoresPorPabellon, setContadoresPorPabellon] = useState<Record<string, number>>({})
  const [pesoBalde, setPesoBalde] = useState<number | null>(null)
  const [pesoBaldeAyer, setPesoBaldeAyer] = useState<number | null>(null)
  const [pesoBaldePendiente, setPesoBaldePendiente] = useState(true)
  const [valesPendientes, setValesPendientes] = useState(0)
  const [, setCargando] = useState(true)


  const [produccionTotal, setProduccionTotal] = useState(0)
  const [produccionAyer, setProduccionAyer] = useState(0)
  const [valesGenerados, setValesGenerados] = useState(0)
  const [valesAyer, setValesAyer] = useState(0)
  const [valesDistribucion, setValesDistribucion] = useState({ ingreso: 0, egreso: 0, reingreso: 0 })
  const [valesDistribucionAyer, setValesDistribucionAyer] = useState({ ingreso: 0, egreso: 0, reingreso: 0 })
  const [valesEstados, setValesEstados] = useState({ pendiente: 0, confirmado: 0, rechazado: 0 })
  const [skuTop, setSkuTop] = useState<{ sku: string; cantidad: number; tipo?: string } | null>(null)
  const [skuMenor, setSkuMenor] = useState<{ sku: string; cantidad: number; tipo?: string } | null>(null)
  const [pabellonMax, setPabellonMax] = useState<{ nombre: string; produccion: number } | null>(null)
  const [pabellonMin, setPabellonMin] = useState<{ nombre: string; produccion: number } | null>(null)

  const hoy = todayDateString()
  const ayer = obtenerFechaAnterior(hoy)
  const canAccessModule = (module: string) => hasPermission(`module:${module}`)

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true)
        const contadoresOk = await verificarContadoresIngresados(hoy)
        setContadoresIngresados(contadoresOk)
        setContadoresPorPabellon({})
        setPesoBaldePendiente(true)
        setPesoBalde(null)

        if (contadoresOk) {
          const registroProduccion = await obtenerContadoresFecha(hoy)
          if (registroProduccion) {
            setProduccionTotal(registroProduccion.totalProduccion || 0)
            const pabellones: Record<string, number> = {}
            if (Array.isArray(registroProduccion.contadores)) {
              registroProduccion.contadores.forEach(c => {
                if (!pabellones[c.pabellonNombre]) pabellones[c.pabellonNombre] = 0
                pabellones[c.pabellonNombre] += c.valor
              })
            }
            setContadoresPorPabellon(pabellones)
            const pabEntries = Object.entries(pabellones)
            if (pabEntries.length > 0) {
              pabEntries.sort((a, b) => b[1] - a[1])
              setPabellonMax({ nombre: pabEntries[0][0], produccion: pabEntries[0][1] })
              setPabellonMin({ nombre: pabEntries[pabEntries.length - 1][0], produccion: pabEntries[pabEntries.length - 1][1] })
            }
          }
        }

        // Leer el peso del balde correctamente desde la colección pesosBalde
        const pesoDb = await obtenerPesoBalde(hoy)
        if (typeof pesoDb === 'number' && pesoDb > 0) {
          setPesoBalde(pesoDb)
          setPesoBaldePendiente(false)
        } else {
          setPesoBalde(null)
          setPesoBaldePendiente(true)
        }

        // Leer el peso del balde de ayer para comparación
        const pesoAyerDb = await obtenerPesoBalde(ayer)
        if (typeof pesoAyerDb === 'number' && pesoAyerDb > 0) {
          setPesoBaldeAyer(pesoAyerDb)
        } else {
          setPesoBaldeAyer(null)
        }

        // Producción y vales ayer
        const registroAyer = await obtenerContadoresFecha(ayer)
        if (registroAyer) {
          setProduccionAyer(registroAyer.totalProduccion || 0)
        } else {
          setProduccionAyer(0)
        }

        const valesHoy = vales.filter(v => v.fecha === hoy)
        setValesGenerados(valesHoy.length)
        const valesDelAyer = vales.filter(v => v.fecha === ayer)
        setValesAyer(valesDelAyer.length)

        const pendientes = valesHoy.filter(v => v.estado === 'pendiente').length
        setValesPendientes(pendientes)

        const distribucion = valesHoy.reduce((acc, vale) => {
          if (vale.tipo === 'ingreso') acc.ingreso++
          else if (vale.tipo === 'egreso') acc.egreso++
          else if (vale.tipo === 'reingreso') acc.reingreso++
          if (vale.estado === 'pendiente') acc.pendiente++
          else if (vale.estado === 'validado') acc.confirmado++
          else if (vale.estado === 'rechazado') acc.rechazado++
          return acc
        }, { ingreso: 0, egreso: 0, reingreso: 0, pendiente: 0, confirmado: 0, rechazado: 0 })
        setValesDistribucion({
          ingreso: distribucion.ingreso,
          egreso: distribucion.egreso,
          reingreso: distribucion.reingreso
        })
        setValesEstados({
          pendiente: distribucion.pendiente,
          confirmado: distribucion.confirmado,
          rechazado: distribucion.rechazado
        })

        const distribucionAyer = valesDelAyer.reduce((acc, vale) => {
          if (vale.tipo === 'ingreso') acc.ingreso++
          else if (vale.tipo === 'egreso') acc.egreso++
          else if (vale.tipo === 'reingreso') acc.reingreso++
          return acc
        }, { ingreso: 0, egreso: 0, reingreso: 0 })
        setValesDistribucionAyer(distribucionAyer)

        const skuMovimientos: Record<string, { cantidad: number; tipo: string }> = {}
        valesHoy.forEach(vale => {
          vale.detalles?.forEach(detalle => {
            const key = `${detalle.sku}:${vale.tipo}`
            if (!skuMovimientos[key]) skuMovimientos[key] = { cantidad: 0, tipo: vale.tipo }
            skuMovimientos[key].cantidad += detalle.totalUnidades
          })
        })
        const skuEntries = Object.entries(skuMovimientos)
        if (skuEntries.length > 0) {
          skuEntries.sort((a, b) => b[1].cantidad - a[1].cantidad)
          setSkuTop({
            sku: skuEntries[0][0].split(':')[0],
            cantidad: skuEntries[0][1].cantidad,
            tipo: skuEntries[0][1].tipo
          })
          setSkuMenor({
            sku: skuEntries[skuEntries.length - 1][0].split(':')[0],
            cantidad: skuEntries[skuEntries.length - 1][1].cantidad,
            tipo: skuEntries[skuEntries.length - 1][1].tipo
          })
        } else {
          setSkuTop(null)
          setSkuMenor(null)
        }

      } catch (error) {
        console.error('Error cargando datos del home:', error)
      } finally {
        setCargando(false)
      }
    }
    cargarDatos()
  }, [hoy, vales])

  const variacionProduccion =
    produccionAyer > 0 ? ((produccionTotal - produccionAyer) / produccionAyer) * 100 : 0
  const mermaCantidad = pesoBalde && pesoBalde > 0 ? Math.round(pesoBalde / 0.06) : 0
  const mermaCantidadAyer =
    pesoBaldeAyer && pesoBaldeAyer > 0 ? Math.round(pesoBaldeAyer / 0.06) : 0
  const mermaPorcentaje = produccionTotal > 0 ? (mermaCantidad / produccionTotal) * 100 : 0
  const mermaPorcentajeAyer =
    produccionAyer > 0 ? (mermaCantidadAyer / produccionAyer) * 100 : 0
  const comparacionMerma =
    mermaPorcentajeAyer > 0 ? ((mermaPorcentaje - mermaPorcentajeAyer) / mermaPorcentajeAyer) * 100 : 0

  const egreso = valesDistribucion.egreso
  const ingresoReingreso = valesDistribucion.ingreso + valesDistribucion.reingreso
  const egresoAyer = valesDistribucionAyer.egreso
  const ingresoReingresoAyer = valesDistribucionAyer.ingreso + valesDistribucionAyer.reingreso
  const comparacionEgVsIn =
    ingresoReingresoAyer > 0 ? ((ingresoReingreso - ingresoReingresoAyer) / ingresoReingresoAyer) * 100 : 0

  const accesosRapidos = [
    { icon: '🏭', label: 'Producción', path: '/produccion', module: 'produccion' },
    { icon: '📦', label: 'Packing', path: '/packing', module: 'packing' },
    { icon: '🏪', label: 'Bodega', path: '/bodega', module: 'bodega' },
    { icon: '📊', label: 'Dashboard', path: '/dashboard', module: 'dashboard' },
    { icon: '⚙️', label: 'Config', path: '/configuracion', module: 'configuracion' }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {canAccessModule('produccion') && (
          <div
            onClick={() => navigate('/produccion')}
            className={`
              cursor-pointer rounded-xl shadow-lg p-6 transition-all duration-300 transform hover:scale-[1.02]
              ${
                contadoresIngresados
                  ? 'bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300'
                  : 'bg-gradient-to-br from-red-50 to-orange-100 border-2 border-orange-400'
              }
            `}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  contadoresIngresados ? 'bg-green-500' : 'bg-orange-500'
                }`}
              >
                {contadoresIngresados ? (
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-3xl">⚙️</span>
            </div>
            <h3 className={`text-lg font-bold mb-2 ${contadoresIngresados ? 'text-green-800' : 'text-orange-900'}`}>
              {contadoresIngresados ? '✅ Contadores Ingresados' : '⚠️ Contadores Pendientes'}
            </h3>
            <p className={`text-sm mb-3 ${contadoresIngresados ? 'text-green-700' : 'text-orange-800'}`}>
              {contadoresIngresados
                ? 'Contadores del día registrados correctamente'
                : 'Ingresa los contadores de los pabellones automáticos'}
            </p>
            {contadoresIngresados && Object.keys(contadoresPorPabellon).length > 0 && (
              <div className="bg-white rounded p-2 mb-2 space-y-1">
                {Object.entries(contadoresPorPabellon).map(([pabellon, valor]) => (
                  <div key={pabellon} className="flex justify-between text-xs text-green-700">
                    <span>{pabellon}:</span>
                    <span className="font-semibold">{valor.toLocaleString('es-CL')}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className={contadoresIngresados ? 'text-green-600' : 'text-orange-600'}>
                {formatearFecha(hoy)}
              </span>
              <span className="text-gray-500">→</span>
            </div>
          </div>
        )}
        {canAccessModule('packing') && (
          <div
            onClick={() => navigate('/packing')}
            className={`
              cursor-pointer rounded-xl shadow-lg p-6 transition-all duration-300 transform hover:scale-[1.02]
              ${
                !pesoBaldePendiente
                  ? 'bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300'
                  : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-400'
              }
            `}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  !pesoBaldePendiente ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              >
                {!pesoBaldePendiente ? (
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-3xl">⚖️</span>
            </div>
            <h3 className={`text-lg font-bold mb-2 ${!pesoBaldePendiente ? 'text-green-800' : 'text-yellow-900'}`}>
              {!pesoBaldePendiente ? '✅ Peso Balde Registrado' : '⚠️ Peso Balde Pendiente'}
            </h3>
            <p className={`text-sm mb-3 ${!pesoBaldePendiente ? 'text-green-700' : 'text-yellow-800'}`}>
              {!pesoBaldePendiente
                ? `Balde: ${pesoBalde?.toLocaleString('es-CL', { maximumFractionDigits: 2 })} kg`
                : 'Registra el peso del balde para calcular merma'}
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className={!pesoBaldePendiente ? 'text-green-600' : 'text-yellow-600'}>
                {formatearFecha(hoy)}
              </span>
              <span className="text-gray-500">→</span>
            </div>
          </div>
        )}
        {canAccessModule('bodega') && (
          <div
            onClick={() => navigate('/bodega')}
            className={`
              cursor-pointer rounded-xl shadow-lg p-6 transition-all duration-300 transform hover:scale-[1.02]
              ${
                valesPendientes === 0
                  ? 'bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300'
                  : 'bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-400'
              }
            `}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  valesPendientes === 0 ? 'bg-green-500' : 'bg-blue-500'
                }`}
              >
                {valesPendientes === 0 ? (
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                )}
              </div>
              <span className="text-3xl">📋</span>
            </div>
            <h3 className={`text-lg font-bold mb-2 ${valesPendientes === 0 ? 'text-green-800' : 'text-blue-900'}`}>
              {valesPendientes === 0 ? '✅ Sin Vales Pendientes' : `📋 ${valesPendientes} Vales Pendientes`}
            </h3>
            <p className={`text-sm mb-3 ${valesPendientes === 0 ? 'text-green-700' : 'text-blue-800'}`}>
              {valesPendientes === 0
                ? 'Todos los vales están validados'
                : 'Vales requieren validación urgente'}
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className={valesPendientes === 0 ? 'text-green-600' : 'text-blue-600'}>
                {formatearFecha(hoy)}
              </span>
              <span className="text-gray-500">→</span>
            </div>
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📋 Resumen del Día</h2>
            <p className="text-sm text-gray-500 mt-1">{formatearFecha(hoy)}</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            Última actualización: {formatDateTime(new Date())}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-blue-700">Producción Total</span>
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-blue-900">{produccionTotal.toLocaleString('es-CL')}</p>
            <p className="text-xs text-blue-600 mt-1">
              {variacionProduccion >= 0 ? '▲' : '▼'} {Math.abs(variacionProduccion).toFixed(1)}% vs ayer
            </p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-5 border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-red-700">Mermas Registradas</span>
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-red-900">{mermaPorcentaje.toFixed(2)}%</p>
            <p className="text-xs text-red-600 mt-1">({mermaCantidad.toFixed(0)} uds / {pesoBalde?.toFixed(2) || 0} kg)</p>
            <p className="text-xs text-red-500 mt-1">
              Variación vs ayer: {comparacionMerma >= 0 ? '▲' : '▼'} {Math.abs(comparacionMerma).toFixed(1)}%
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-purple-700">Egreso vs Ingreso + Reingreso</span>
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-purple-900">{egreso} / {ingresoReingreso}</p>
            <p className="text-xs text-purple-600 mt-1">
              Comparación vs ayer: {comparacionEgVsIn >= 0 ? '▲' : '▼'} {Math.abs(comparacionEgVsIn).toFixed(1)} %
            </p>
          </div>
        </div>
      </div>
      {canAccessModule('bodega') && valesGenerados > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Análisis de Vales del Día</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <h4 className="text-sm font-semibold text-purple-800 mb-3">Distribución + Estados</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-purple-700">Ingreso:</span>
                  <span className="text-sm font-bold text-purple-900">
                    {valesGenerados > 0 ? Math.round((valesDistribucion.ingreso / valesGenerados) * 100) : 0}% ({valesDistribucion.ingreso})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-purple-700">Egreso:</span>
                  <span className="text-sm font-bold text-purple-900">
                    {valesGenerados > 0 ? Math.round((valesDistribucion.egreso / valesGenerados) * 100) : 0}% ({valesDistribucion.egreso})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-purple-700">Reingreso:</span>
                  <span className="text-sm font-bold text-purple-900">
                    {valesGenerados > 0 ? Math.round((valesDistribucion.reingreso / valesGenerados) * 100) : 0}% ({valesDistribucion.reingreso})
                  </span>
                </div>
                <div className="border-t border-purple-200 mt-2 pt-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-purple-700">Pendiente:</span>
                  <span className="text-sm font-bold text-orange-600">{valesEstados.pendiente}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-purple-700">Confirmado:</span>
                  <span className="text-sm font-bold text-green-600">{valesEstados.confirmado}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-purple-700">Rechazado:</span>
                  <span className="text-sm font-bold text-red-600">{valesEstados.rechazado}</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <h4 className="text-sm font-semibold text-green-800 mb-3">SKUs y Pabellones</h4>
              <div className="space-y-2">
                <div className="text-xs">
                  <p className="font-semibold text-green-700">Mayor Movimiento SKU:</p>
                  {skuTop ? (
                    <p className="text-green-900">{skuTop.sku} ({skuTop.cantidad.toLocaleString('es-CL')}) [{skuTop.tipo}]</p>
                  ) : (
                    <p className="text-green-700">Sin datos</p>
                  )}
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-green-700">Menor Movimiento SKU:</p>
                  {skuMenor ? (
                    <p className="text-green-900">{skuMenor.sku} ({skuMenor.cantidad.toLocaleString('es-CL')}) [{skuMenor.tipo}]</p>
                  ) : (
                    <p className="text-green-700">Sin datos</p>
                  )}
                </div>
                <div className="border-t border-green-200 mt-2 pt-2"></div>
                <div className="text-xs">
                  <p className="font-semibold text-green-700">Mayor Producción:</p>
                  {pabellonMax ? (
                    <p className="text-green-900">{pabellonMax.nombre} ({pabellonMax.produccion.toLocaleString('es-CL')})</p>
                  ) : (
                    <p className="text-green-700">N/A</p>
                  )}
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-green-700">Menor Producción:</p>
                  {pabellonMin ? (
                    <p className="text-green-900">{pabellonMin.nombre} ({pabellonMin.produccion.toLocaleString('es-CL')})</p>
                  ) : (
                    <p className="text-green-700">N/A</p>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
              <h4 className="text-sm font-semibold text-indigo-800 mb-3">Comparación vs Ayer</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-indigo-700">Ingresos hoy / ayer:</span>
                  <span className="text-sm font-bold text-indigo-900">{valesDistribucion.ingreso} / {valesDistribucionAyer.ingreso}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-indigo-700">Egresos hoy / ayer:</span>
                  <span className="text-sm font-bold text-indigo-900">{valesDistribucion.egreso} / {valesDistribucionAyer.egreso}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-indigo-700">Reingresos hoy / ayer:</span>
                  <span className="text-sm font-bold text-indigo-900">{valesDistribucion.reingreso} / {valesDistribucionAyer.reingreso}</span>
                </div>
                <div className="border-t border-indigo-200 mt-2 pt-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-indigo-700">Vales total hoy / ayer:</span>
                  <span className="text-sm font-bold text-indigo-900">{valesGenerados} / {valesAyer}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">⚡ Acceso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {accesosRapidos.map((item) => {
            const hasAccess = canAccessModule(item.module)
            return (
              <button
                key={item.path}
                onClick={() => hasAccess && navigate(item.path)}
                disabled={!hasAccess}
                className={`
                  p-5 rounded-xl transition text-center border-2
                  ${hasAccess
                    ? 'bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer'
                    : 'bg-gray-100 border-gray-200 opacity-40 cursor-not-allowed'}
                `}
              >
                <div className={`text-4xl mb-2 ${!hasAccess ? 'grayscale' : ''}`}>{item.icon}</div>
                <div className="text-sm font-medium text-gray-900">{item.label}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
