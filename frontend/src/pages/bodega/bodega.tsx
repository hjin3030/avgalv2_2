import { useState, useMemo } from 'react'
import { useVales } from '@/hooks/useVales'
import { useStock } from '@/hooks/useStock'
import { usePabellones } from '@/hooks/usePabellones'
import { useSkus } from '@/hooks/useSkus'
import { useMovimientos } from '@/hooks/useMovimientos'
import { useAuth } from '@/hooks/useAuth'
import CrearValeModal from '@/components/bodega/CrearValeModal'
import ValidarValeModal from '@/components/bodega/ValidarValeModal'
import CartolaModal from '@/components/bodega/CartolaModal'
import HistorialSkuModal from '@/components/bodega/HistorialSkuModal'
import AjusteStockModal from '@/components/bodega/AjusteStockModal'
import DetalleValeModal from '@/components/bodega/DetalleValeModal'
import { todayDateString, justDate } from '@/utils/formatHelpers'
import { getSkuNombre } from '@/utils/constants'


export default function BodegaPage() {
  const { profile } = useAuth()
  const { vales } = useVales()
  const { stock } = useStock()
  const { pabellones } = usePabellones()
  const { skus } = useSkus()
  const { movimientos } = useMovimientos()


  const [mostrarCrearVale, setMostrarCrearVale] = useState(false)
  const [mostrarValidarVale, setMostrarValidarVale] = useState(false)
  const [mostrarCartola, setMostrarCartola] = useState(false)
  const [mostrarHistorialSku, setMostrarHistorialSku] = useState(false)
  const [mostrarAjusteStock, setMostrarAjusteStock] = useState(false)
  const [valeSeleccionado, setValeSeleccionado] = useState<any>(null)
  const [skuSeleccionado, setSkuSeleccionado] = useState<string>('')
  const [mostrarDetalleValeModal, setMostrarDetalleValeModal] = useState(false)


  // Colapsar secciones
  const [stockColapsado, setStockColapsado] = useState(false)
  const [valesColapsado, setValesColapsado] = useState(false)


  // Ordenamiento stock
  const [ordenColStock, setOrdenColStock] = useState('sku')
  const [ordenAscStock, setOrdenAscStock] = useState(true)


  // Ordenamiento tabla vales del día
  const [ordenColVales, setOrdenColVales] = useState('creacion')
  const [ordenAscVales, setOrdenAscVales] = useState(true)
  const handleOrdenarVales = (col) => {
    if (ordenColVales === col) setOrdenAscVales(!ordenAscVales)
    else {
      setOrdenColVales(col)
      setOrdenAscVales(true)
    }
  }


  const isSuperAdmin = profile?.rol === 'superadmin'
  const canViewCartola = profile?.rol === 'superadmin' || profile?.rol === 'admin'


  const fechaActual = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })


  // Vales del día
  const valesHoy = useMemo(() => {
    const hoy = todayDateString()
    return vales.filter((v) => {
      if (!v.fecha) return false
      return justDate(v.fecha) === hoy
    })
  }, [vales])


  // AJUSTE FECHA ACTUALIZACIÓN y HORA PARA CADA VALE (requerimiento)
  // MODIFICADO: Para vales tipo INGRESO, FECHA ACTUALIZACION SOLO SI ESTA VALIDADO O RECHAZADO
  const getValeFechaActualizacion = (vale) => {
    if (vale.tipo === 'ingreso') {
      if (vale.fechaValidacion && vale.horaValidacion) {
        return {
          fecha: vale.fechaValidacion,
          hora: vale.horaValidacion
        }
      }
      // Si pendiente, debe mostrar vacío/guion y no la fecha de creación!
      return {
        fecha: '',
        hora: ''
      }
    } else {
      return {
        fecha: vale.fecha,
        hora: vale.hora
      }
    }
  }


  // Tabla Vales del Día ordenada
  const valesHoyOrdenados = useMemo(() => {
    const arr = [...valesHoy]
    arr.sort((a, b) => {
      let resultado = 0
      switch (ordenColVales) {
        case 'nVale':
          resultado = (a.correlativoDia || 0) - (b.correlativoDia || 0)
          break
        case 'tipo':
          resultado = (a.tipo || '').localeCompare(b.tipo || '')
          break
        case 'total':
          resultado = (a.totalUnidades || 0) - (b.totalUnidades || 0)
          break
        case 'origen':
          resultado = (a.origenNombre || '').localeCompare(b.origenNombre || '')
          break
        case 'destino':
          resultado = (a.destinoNombre || '').localeCompare(b.destinoNombre || '')
          break
        case 'creacion':
          resultado = (a.fecha || '').localeCompare(b.fecha || '')
          break
        case 'actualizacion':
          resultado = (
            (getValeFechaActualizacion(a).fecha || '') +
            (getValeFechaActualizacion(a).hora || '')
          ).localeCompare(
            (getValeFechaActualizacion(b).fecha || '') +
            (getValeFechaActualizacion(b).hora || '')
          )
          break
        case 'estado':
          resultado = (a.estado || '').localeCompare(b.estado || '')
          break
        case 'creador':
          resultado = (a.usuarioCreadorNombre || '').localeCompare(b.usuarioCreadorNombre || '')
          break
        default:
          break
      }
      return ordenAscVales ? resultado : -resultado
    })
    return arr
  }, [valesHoy, ordenColVales, ordenAscVales])


  const valesPendientes = valesHoy.filter(v => v.estado === 'pendiente')
  const skusActivos = useMemo(() => skus.filter(sku => sku.activo === true), [skus])
  const getNombreSku = getSkuNombre


  const formatNumber = (num) => Number(num || 0).toLocaleString('es-CL')
  const getNombrePabellon = (id) => pabellones.find((p) => p.id === id)?.nombre || 'N/A'


  const getTipoBadge = (tipo) => {
    const colores = {
      ingreso: 'bg-green-100 text-green-800',
      egreso: 'bg-red-100 text-red-800',
      reingreso: 'bg-blue-100 text-blue-800'
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colores[tipo] || 'bg-gray-100'}`}>
        {tipo?.toUpperCase()}
      </span>
    )
  }


  const getEstadoBadge = (estado) => {
    const colores = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      validado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800'
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colores[estado] || 'bg-gray-100'}`}>
        {estado?.toUpperCase()}
      </span>
    )
  }


  const calcularDesglose = (detalles) => {
    const t = { cajas: 0, bandejas: 0, unidades: 0 }
    detalles?.forEach(d => {
      t.cajas += d.cajas || 0
      t.bandejas += d.bandejas || 0
      t.unidades += d.unidades || 0
    })
    return t
  }


  // Mostrar TODOS los movimientos recientes para SKUs (corregido)
  // Solo el ÚLTIMO movimiento real (el más reciente), nunca repite ni muestra vacío si existe movimiento
  const getUltimoMovimiento = (
    skuCodigo: string,
    tipo: 'ingreso' | 'egreso' | 'reingreso'
  ) => {
    let movsFiltrados = movimientos.filter(
      m => m.skuCodigo === skuCodigo && m.tipo === tipo
    )
    if (movsFiltrados.length === 0) return null
    const sorted = movsFiltrados.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return timeB - timeA
    })
    return sorted[0]
  }


  const formatMovimiento = (mov: any) => {
    if (!mov || mov.cantidad === undefined || mov.cantidad === null) return '-'
    const signo = mov.tipo === 'egreso' ? '-' : '+'
    const cantidad = Math.abs(mov.cantidad) || 0
    const cajas = Math.floor(cantidad / 180)
    const bandejas = Math.floor((cantidad % 180) / 15)
    const unidades = cantidad % 15
    return `${signo}${cantidad}U (${cajas}C ${bandejas}B ${unidades}U)`
  }


  const handleOrdenarStock = (col) => {
    if (ordenColStock === col) setOrdenAscStock(!ordenAscStock)
    else {
      setOrdenColStock(col)
      setOrdenAscStock(true)
    }
  }


  const stockFiltrado = useMemo(() => {
    const codigosActivos = skusActivos.map(s => s.codigo)
    return stock.filter(item => codigosActivos.includes(item.skuCodigo))
  }, [stock, skusActivos])


  const stockOrdenado = useMemo(() => {
    return [...stockFiltrado].sort((a, b) => {
      let r = 0
      if (ordenColStock === 'sku') r = (a.skuCodigo || '').localeCompare(b.skuCodigo || '')
      else if (ordenColStock === 'cantidad') r = (a.cantidad || 0) - (b.cantidad || 0)
      return ordenAscStock ? r : -r
    })
  }, [stockFiltrado, ordenColStock, ordenAscStock])


  const handleVerDetalleVale = (vale) => {
    setValeSeleccionado(vale)
    setMostrarDetalleValeModal(true)
  }


  const handleValidar = (vale) => {
    setValeSeleccionado(vale)
    setMostrarValidarVale(true)
  }


  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">📦 Bodega</h1>
            <p className="text-gray-600 mt-2 capitalize text-lg">{fechaActual}</p>
          </div>
        </div>

        {/* Botón Crear Vale mejorado */}
        <div className="mb-6">
          <button
            onClick={() => setMostrarCrearVale(true)}
            className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-105 p-8 w-full md:w-auto"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="text-5xl mb-3">📝</div>
                <h3 className="text-2xl font-bold mb-2">Crear Nuevo Vale</h3>
                <p className="text-blue-100 text-sm">Generar vale de egreso o reingreso</p>
              </div>
              <div className="text-6xl opacity-20 group-hover:opacity-30 transition-opacity ml-8">+</div>
            </div>
          </button>
        </div>
      </div>

      {/* Alerta Vales Pendientes o Mensaje Verde */}
      <div className="mb-6">
        {valesPendientes.length > 0 ? (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-900" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-yellow-900">
                  ⚠️ {valesPendientes.length} Vale(s) Pendiente(s) por Revisar
                </h3>
                <p className="text-sm text-yellow-700">Valida los vales para actualizar el stock</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-yellow-200">
                <thead className="bg-yellow-200">
                  <tr>
                    <th className="border border-yellow-300 p-3 text-left font-bold text-yellow-900">N° VALE</th>
                    <th className="border border-yellow-300 p-3 text-left font-bold text-yellow-900">TIPO</th>
                    <th className="border border-yellow-300 p-3 text-left font-bold text-yellow-900">ORIGEN</th>
                    <th className="border border-yellow-300 p-3 text-left font-bold text-yellow-900">DESTINO</th>
                    <th className="border border-yellow-300 p-3 text-center font-bold text-yellow-900">TOTAL</th>
                    <th className="border border-yellow-300 p-3 text-left font-bold text-yellow-900">CREADO POR</th>
                    <th className="border border-yellow-300 p-3 text-center font-bold text-yellow-900">HORA</th>
                    <th className="border border-yellow-300 p-3 text-center font-bold text-yellow-900">ACCIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {valesPendientes.map((vale) => {
                    const desglose = calcularDesglose(vale.detalles)
                    return (
                      <tr key={vale.id} className="hover:bg-yellow-100">
                        <td className="border border-yellow-200 p-3">
                          <div className="font-mono font-bold text-blue-600">
                            {vale.tipo?.toUpperCase()} #{vale.correlativoDia || 'N/A'}
                          </div>
                        </td>
                        <td className="border border-yellow-200 p-3 text-center">{getTipoBadge(vale.tipo)}</td>
                        <td className="border border-yellow-200 p-3">
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                            {vale.origenNombre || getNombrePabellon(vale.origenId)}
                          </span>
                        </td>
                        <td className="border border-yellow-200 p-3 text-sm">{vale.destinoNombre || 'Bodega'}</td>
                        <td className="border border-yellow-200 p-3 text-center">
                          <div className="font-bold text-lg">{vale.totalUnidades?.toLocaleString('es-CL')} U</div>
                          <div className="text-xs text-gray-500">
                            {desglose.cajas}C · {desglose.bandejas}B · {desglose.unidades}U
                          </div>
                        </td>
                        <td className="border border-yellow-200 p-3 text-sm">{vale.usuarioCreadorNombre || 'N/A'}</td>
                        <td className="border border-yellow-200 p-3 text-center font-semibold">{vale.hora}</td>
                        <td className="border border-yellow-200 p-3 text-center">
                          <button
                            onClick={() => handleValidar(vale)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm shadow-md"
                          >
                            ✓ Validar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-900" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-900">
                  ✓ No existen vales pendientes de recepción
                </h3>
                <p className="text-sm text-green-700">Todos los vales han sido procesados correctamente</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STOCK EN TIEMPO REAL */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStockColapsado(!stockColapsado)}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg 
                className={`w-6 h-6 transition-transform ${stockColapsado ? '' : 'rotate-90'}`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">📊 Stock en Tiempo Real</h2>
          </div>
          <div className="flex gap-3">
            {canViewCartola && (
              <button
                onClick={() => setMostrarCartola(true)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold shadow-md"
              >
                📋 Ver Cartola
              </button>
            )}
            {isSuperAdmin && (
              <button
                onClick={() => setMostrarAjusteStock(true)}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold shadow-md"
              >
                ⚙️ Ajuste Stock
              </button>
            )}
          </div>
        </div>
        {!stockColapsado && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th
                    onClick={() => handleOrdenarStock('sku')}
                    className="border border-gray-300 p-3 text-left font-bold text-gray-700 cursor-pointer hover:bg-gray-300"
                  >
                    SKU {ordenColStock === 'sku' && (ordenAscStock ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleOrdenarStock('cantidad')}
                    className="border border-gray-300 p-3 text-center font-bold text-gray-700 cursor-pointer hover:bg-gray-300"
                  >
                    CANTIDAD {ordenColStock === 'cantidad' && (ordenAscStock ? '▲' : '▼')}
                  </th>
                  <th className="border border-gray-300 p-3 text-center font-bold text-gray-700">DESGLOSE</th>
                  <th className="border border-gray-300 p-3 text-center font-bold text-gray-700">INGRESOS RECIENTES</th>
                  <th className="border border-gray-300 p-3 text-center font-bold text-gray-700">EGRESOS RECIENTES</th>
                  <th className="border border-gray-300 p-3 text-center font-bold text-gray-700">REINGRESOS RECIENTES</th>
                  <th className="border border-gray-300 p-3 text-center font-bold text-gray-700">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {stockOrdenado.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border border-gray-200 p-8 text-center text-gray-500">
                      <div className="text-6xl mb-4">📦</div>
                      <p className="text-lg font-semibold">No hay stock registrado</p>
                    </td>
                  </tr>
                ) : (
                  stockOrdenado.map((item) => {
                    const desglose = {
                      cajas: Math.floor((item.cantidad || 0) / 180),
                      bandejas: Math.floor(((item.cantidad || 0) % 180) / 15),
                      unidades: (item.cantidad || 0) % 15
                    }
                    const ultimoIngreso = getUltimoMovimiento(item.skuCodigo, 'ingreso')
                    const ultimoEgreso = getUltimoMovimiento(item.skuCodigo, 'egreso')
                    const ultimoReingreso = getUltimoMovimiento(item.skuCodigo, 'reingreso')
                    return (
                      <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                        <td className="border border-gray-200 p-3">
                          <div className="font-mono font-bold text-blue-600">{item.skuCodigo}</div>
                          <div className="text-xs text-gray-600">{getNombreSku(item.skuCodigo)}</div>
                        </td>
                        <td className="border border-gray-200 p-3 text-center">
                          <div className="font-bold text-lg text-gray-900">{formatNumber(item.cantidad)} U</div>
                        </td>
                        <td className="border border-gray-200 p-3 text-center text-sm text-gray-700">
                          {desglose.cajas}C · {desglose.bandejas}B · {desglose.unidades}U
                        </td>
                        <td className="border border-gray-200 p-3 text-center">
                          <span className="text-green-700 font-semibold text-sm">
                            {formatMovimiento(ultimoIngreso)}
                          </span>
                        </td>
                        <td className="border border-gray-200 p-3 text-center">
                          <span className="text-red-700 font-semibold text-sm">
                            {formatMovimiento(ultimoEgreso)}
                          </span>
                        </td>
                        <td className="border border-gray-200 p-3 text-center">
                          <span className="text-yellow-700 font-semibold text-sm">
                            {formatMovimiento(ultimoReingreso)}
                          </span>
                        </td>
                        <td className="border border-gray-200 p-3 text-center">
                          {canViewCartola && (
                            <button
                              onClick={() => {
                                setSkuSeleccionado(item.skuCodigo)
                                setMostrarHistorialSku(true)
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-md"
                            >
                              📜 Historial
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TABLA VALES DEL DÍA ORDENABLE Y CORRECTA (muestra FECHA ACTUALIZ correcta y ordena por ella) */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setValesColapsado(!valesColapsado)}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className={`w-6 h-6 transition-transform ${valesColapsado ? '' : 'rotate-90'}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">📋 Vales del Día</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{todayDateString()}</span>
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-bold">
              {valesHoy.length} vales
            </span>
          </div>
        </div>
        {!valesColapsado && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th onClick={() => handleOrdenarVales('nVale')} className="border border-gray-300 p-3 text-left font-bold text-gray-700 cursor-pointer hover:bg-gray-300">
                    N° VALE {ordenColVales === 'nVale' && (ordenAscVales ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleOrdenarVales('tipo')} className="border border-gray-300 p-3 text-left font-bold text-gray-700 cursor-pointer hover:bg-gray-300">
                    TIPO {ordenColVales === 'tipo' && (ordenAscVales ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleOrdenarVales('total')} className="border border-gray-300 p-3 text-center font-bold text-gray-700 cursor-pointer hover:bg-gray-300">
                    TOTAL {ordenColVales === 'total' && (ordenAscVales ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleOrdenarVales('origen')} className="border border-gray-300 p-3 text-left font-bold text-gray-700 cursor-pointer hover:bg-gray-300">
                    ORIGEN {ordenColVales === 'origen' && (ordenAscVales ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleOrdenarVales('destino')} className="border border-gray-300 p-3 text-left font-bold text-gray-700 cursor-pointer hover:bg-gray-300">
                    DESTINO {ordenColVales === 'destino' && (ordenAscVales ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleOrdenarVales('creacion')} className="border border-gray-300 p-3 text-left font-bold text-gray-700 cursor-pointer hover:bg-gray-300">
                    FECHA CREACIÓN {ordenColVales === 'creacion' && (ordenAscVales ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleOrdenarVales('actualizacion')} className="border border-gray-300 p-3 text-left font-bold text-gray-700 cursor-pointer hover:bg-gray-300">
                    FECHA ACTUALIZ. {ordenColVales === 'actualizacion' && (ordenAscVales ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleOrdenarVales('estado')} className="border border-gray-300 p-3 text-center font-bold text-gray-700 cursor-pointer hover:bg-gray-300">
                    ESTADO {ordenColVales === 'estado' && (ordenAscVales ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleOrdenarVales('creador')} className="border border-gray-300 p-3 text-left font-bold text-gray-700 cursor-pointer hover:bg-gray-300">
                    CREADO POR {ordenColVales === 'creador' && (ordenAscVales ? '▲' : '▼')}
                  </th>
                  <th className="border border-gray-300 p-3 text-center font-bold text-gray-700">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {valesHoyOrdenados.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="border border-gray-200 p-8 text-center text-gray-500">
                      <div className="text-6xl mb-4">📦</div>
                      <p className="text-lg font-semibold">No hay vales registrados hoy</p>
                      <p className="text-sm text-gray-400 mt-2">Los vales creados aparecerán aquí</p>
                    </td>
                  </tr>
                ) : (
                  valesHoyOrdenados.map((vale) => {
                    const desglose = calcularDesglose(vale.detalles)
                    const fechaAct = getValeFechaActualizacion(vale)
                    return (
                      <tr key={vale.id} className="hover:bg-blue-50 transition-colors">
                        <td className="border border-gray-200 p-3">
                          <div className="font-mono font-bold text-blue-600">
                            {vale.tipo?.toUpperCase()} #{vale.correlativoDia || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">{vale.id?.slice(0, 8)}</div>
                        </td>
                        <td className="border border-gray-200 p-3 text-center">{getTipoBadge(vale.tipo)}</td>
                        <td className="border border-gray-200 p-3 text-center">
                          <div className="font-bold text-lg text-gray-900">
                            {vale.totalUnidades?.toLocaleString('es-CL')} U
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {desglose.cajas}C · {desglose.bandejas}B · {desglose.unidades}U
                          </div>
                        </td>
                        <td className="border border-gray-200 p-3 text-left">
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                            {vale.origenNombre || getNombrePabellon(vale.origenId) || 'Bodega'}
                          </span>
                        </td>
                        <td className="border border-gray-200 p-3 text-sm">{vale.destinoNombre || 'Bodega'}</td>
                        <td className="border border-gray-200 p-3">
                          <div className="font-semibold">{vale.fecha}</div>
                          <div className="text-sm text-gray-600">{vale.hora}</div>
                        </td>
                        <td className="border border-gray-200 p-3">
                          <div className="font-semibold">{fechaAct.fecha || '-'}</div>
                          <div className="text-sm text-gray-600">{fechaAct.hora || '-'}</div>
                        </td>
                        <td className="border border-gray-200 p-3 text-center">{getEstadoBadge(vale.estado)}</td>
                        <td className="border border-gray-200 p-3 text-sm">{vale.usuarioCreadorNombre || 'N/A'}</td>
                        <td className="border border-gray-200 p-3 text-center">
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleVerDetalleVale(vale)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-md"
                            >
                              👁️ Ver
                            </button>
                            {vale.estado === 'pendiente' && (
                              <button
                                onClick={() => handleValidar(vale)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm shadow-md"
                              >
                                ✓ Validar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      {mostrarCrearVale && (
        <CrearValeModal isOpen={mostrarCrearVale} onClose={() => setMostrarCrearVale(false)} />
      )}
      {mostrarValidarVale && valeSeleccionado && (
        <ValidarValeModal
          isOpen={mostrarValidarVale}
          onClose={() => {
            setMostrarValidarVale(false)
            setValeSeleccionado(null)
          }}
          onConfirm={() => {
            setMostrarValidarVale(false)
            setValeSeleccionado(null)
          }}
          vale={valeSeleccionado}
        />
      )}
      {mostrarCartola && <CartolaModal isOpen={mostrarCartola} onClose={() => setMostrarCartola(false)} />}
      {mostrarHistorialSku && (
        <HistorialSkuModal
          isOpen={mostrarHistorialSku}
          onClose={() => setMostrarHistorialSku(false)}
          sku={skuSeleccionado}
        />
      )}
      {mostrarAjusteStock && (
        <AjusteStockModal
          isOpen={mostrarAjusteStock}
          onClose={() => setMostrarAjusteStock(false)}
        />
      )}
      {mostrarDetalleValeModal && valeSeleccionado && (
        <DetalleValeModal
          isOpen={mostrarDetalleValeModal}
          onClose={() => setMostrarDetalleValeModal(false)}
          valeData={valeSeleccionado}
        />
      )}
    </div>
  )
}
