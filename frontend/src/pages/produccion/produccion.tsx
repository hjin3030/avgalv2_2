// frontend/src/pages/produccion/produccion.tsx

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePabellones } from '@/hooks/usePabellones'
import { todayDateString } from '@/utils/formatHelpers'
import { formatDateTime } from '@/lib/formatters'
import {
  verificarContadoresIngresados,
  obtenerContadoresFecha,
  obtenerFechaAnterior,
  calcularVariacion,
  obtenerPesoBalde,
  obtenerPesosBaldePorPabellon,
  guardarProduccionPorPabellon,
  type RegistroContadores,
  type ContadorValor,
  type PesosPorPabellon,
} from '@/utils/produccionHelpers'
import { CONTADORES_PRODUCCION, PABELLONES_AUTOMATICOS } from '@/utils/constants'

// -----------------------------
// Helpers UI / parse
// -----------------------------
const formatearFecha = (fechaStr: string): string => {
  const [year, month, day] = fechaStr.split('-')
  return `${day}-${month}-${year}`
}

const classNames = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(' ')

const onlyDigits = (v: string) => v.replace(/[^\d]/g, '')

const parseEntero = (v: string) => {
  const cleaned = onlyDigits(v)
  if (!cleaned) return 0
  const n = parseInt(cleaned, 10)
  return Number.isFinite(n) ? n : 0
}

const parseDecimalFlexible = (v: string): number | null => {
  // admite "3.2" o "3,2"
  const cleaned = v.trim().replace(',', '.')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

const formatKg = (v: number | null | undefined) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '-'
  return v.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

const extraerNumeroContador = (label: string): string => {
  const match = label.match(/C(\d+)/)
  return match ? `C${match[1]}` : label
}

// -----------------------------
// Modal Pabellón Detalle
// -----------------------------
function VerPabellonModal({ pabellon, onClose }: { pabellon: any; onClose: () => void }) {
  if (!pabellon) return null

  const ocupacion = pabellon.capacidadTotal
    ? ((pabellon.cantidadTotal / pabellon.capacidadTotal) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-3xl font-bold text-gray-600 hover:text-gray-900"
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold mb-4 text-gray-900">{pabellon.nombre}</h2>

        <div className="space-y-2">
          <p className="text-gray-700">
            <strong>Cantidad actual:</strong> {(pabellon.cantidadTotal || 0).toLocaleString('es-CL')} U
          </p>
          <p className="text-gray-700">
            <strong>Capacidad total:</strong> {(pabellon.capacidadTotal || 0).toLocaleString('es-CL')} U
          </p>
          <p className="text-gray-700">
            <strong>% ocupación:</strong> {ocupacion}%
          </p>
          <p className="text-gray-700">
            <strong>Total líneas:</strong> {pabellon.totalLineas || '-'}
          </p>
          <p className="text-gray-700">
            <strong>Caras por línea:</strong> {pabellon.carasPorLinea || '-'}
          </p>
          <p className="text-gray-700">
            <strong>Estado:</strong>{' '}
            <span className={pabellon.activo ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
              {pabellon.activo ? 'ACTIVO' : 'INACTIVO'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Produccion() {
  const { pabellones } = usePabellones()
  const { profile } = useAuth()

  const [fechaSeleccionada, setFechaSeleccionada] = useState(todayDateString())

  const [contadoresIngresados, setContadoresIngresados] = useState(false)
  const [cargandoEstado, setCargandoEstado] = useState(true)

  const [registroContadores, setRegistroContadores] = useState<RegistroContadores | null>(null)
  const [registroAnterior, setRegistroAnterior] = useState<RegistroContadores | null>(null)

  const [pesoBaldeTotal, setPesoBaldeTotal] = useState<number | null>(null)
  const [pesosPorPabellon, setPesosPorPabellon] = useState<PesosPorPabellon>({})

  const [pabellonDetalle, setPabellonDetalle] = useState<any>(null)

  const [pabellonesExpandidosResumen, setPabellonesExpandidosResumen] = useState<Set<string>>(new Set())
  const [seccionResumenExpandida, setSeccionResumenExpandida] = useState(true)
  const [seccionPabellonesExpandida, setSeccionPabellonesExpandida] = useState(true)
  const [seccionIngresoAutoExpandida, setSeccionIngresoAutoExpandida] = useState(true)

  // Minimizar por pabellón dentro de "Pabellones de Producción"
  const [pabellonesMini, setPabellonesMini] = useState<Set<string>>(new Set())

  // Estado inputs “amigables”
  const [formContadores, setFormContadores] = useState<Record<string, Record<number, number>>>({})
  const [formPeso, setFormPeso] = useState<Record<string, string>>({}) // string para aceptar coma/punto
  const [guardandoPabellon, setGuardandoPabellon] = useState<string | null>(null)
  const [errorIngreso, setErrorIngreso] = useState<string | null>(null)
  const [okIngreso, setOkIngreso] = useState<string | null>(null)

  // Scroll & highlight
  const ingresoRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [highlightPabId, setHighlightPabId] = useState<string | null>(null)

  const hoy = todayDateString()
  const esHoy = fechaSeleccionada === hoy

  const pabellonesActivos = useMemo(() => pabellones.filter((p) => p.activo), [pabellones])

  // Orden fijo del sistema (pab14, pab13, pab15)
  const pabellonesAutomaticosOrden = useMemo(
    () => (PABELLONES_AUTOMATICOS as readonly string[]),
    [],
  )

  const contadoresPorPabellon = useMemo(() => {
    const grupos: Record<string, typeof CONTADORES_PRODUCCION> = {}
    CONTADORES_PRODUCCION.forEach((c) => {
      if (!grupos[c.pabellonId]) grupos[c.pabellonId] = []
      grupos[c.pabellonId].push(c)
    })
    Object.values(grupos).forEach((arr) => arr.sort((a, b) => a.id - b.id))
    return grupos
  }, [])

  const agruparContadoresPorPabellon = (contadores: ContadorValor[]) => {
    const grupos: Record<string, ContadorValor[]> = {}
    contadores.forEach((contador) => {
      const pabNombre = contador.pabellonNombre
      if (!grupos[pabNombre]) grupos[pabNombre] = []
      grupos[pabNombre].push(contador)
    })
    Object.values(grupos).forEach((arr) => arr.sort((a, b) => a.contadorId - b.contadorId))
    return grupos
  }

  const toggleResumenPabellon = (pabellonNombre: string) => {
    setPabellonesExpandidosResumen((prev) => {
      const next = new Set(prev)
      if (next.has(pabellonNombre)) next.delete(pabellonNombre)
      else next.add(pabellonNombre)
      return next
    })
  }

  const toggleMiniPabellon = (pabellonId: string) => {
    setPabellonesMini((prev) => {
      const next = new Set(prev)
      if (next.has(pabellonId)) next.delete(pabellonId)
      else next.add(pabellonId)
      return next
    })
  }

  // -----------------------------
  // Carga principal del día
  // -----------------------------
  useEffect(() => {
    const cargarEstado = async () => {
      setCargandoEstado(true)
      setErrorIngreso(null)
      setOkIngreso(null)

      const ingresados = await verificarContadoresIngresados(fechaSeleccionada)
      setContadoresIngresados(ingresados)

      let regDia: RegistroContadores | null = null
      let pb: PesosPorPabellon = {}

      if (ingresados) {
        regDia = await obtenerContadoresFecha(fechaSeleccionada)
        setRegistroContadores(regDia)

        const fechaAnt = obtenerFechaAnterior(fechaSeleccionada)
        const regAnt = await obtenerContadoresFecha(fechaAnt)
        setRegistroAnterior(regAnt)

        const pesoTotal = await obtenerPesoBalde(fechaSeleccionada)
        setPesoBaldeTotal(pesoTotal)

        const pbDoc = await obtenerPesosBaldePorPabellon(fechaSeleccionada)
        pb = pbDoc?.pesosPorPabellon || {}
        setPesosPorPabellon(pb)
      } else {
        setRegistroContadores(null)
        setRegistroAnterior(null)
        setPesoBaldeTotal(null)
        setPesosPorPabellon({})
      }

      // Pre-cargar forms con lo ya guardado (si existe)
      const baseContadores: Record<string, Record<number, number>> = {}
      const basePesos: Record<string, string> = {}

      pabellonesAutomaticosOrden.forEach((pabId) => {
        const ids = (contadoresPorPabellon[pabId] || []).map((c) => c.id)
        baseContadores[pabId] = {}
        ids.forEach((id) => {
          const prev = (regDia?.contadores || []).find((x) => x.contadorId === id)
          baseContadores[pabId][id] = prev?.valor ?? 0
        })
        const prevPeso = pb?.[pabId]
        basePesos[pabId] = typeof prevPeso === 'number' ? String(prevPeso).replace('.', ',') : ''
      })

      setFormContadores(baseContadores)
      setFormPeso(basePesos)

      setCargandoEstado(false)
    }

    cargarEstado()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaSeleccionada])

  // -----------------------------
  // Estado “pendiente / parcial / completo”
  // -----------------------------
  const pabellonesCompletos = useMemo(() => {
    const completos = registroContadores?.pabellonesCompletos || []
    return new Set(completos)
  }, [registroContadores])

  const completadosCount = useMemo(() => {
    let done = 0
    pabellonesAutomaticosOrden.forEach((id) => {
      if (pabellonesCompletos.has(id)) done++
    })
    return { done, total: pabellonesAutomaticosOrden.length, faltan: pabellonesAutomaticosOrden.length - done }
  }, [pabellonesAutomaticosOrden, pabellonesCompletos])

  const estadoDia = useMemo<'COMPLETO' | 'PARCIAL' | 'PENDIENTE'>(() => {
    if (!esHoy) return contadoresIngresados ? 'COMPLETO' : 'PENDIENTE'
    if (completadosCount.done === completadosCount.total) return 'COMPLETO'
    if (completadosCount.done > 0) return 'PARCIAL'
    return 'PENDIENTE'
  }, [esHoy, contadoresIngresados, completadosCount])

  // -----------------------------
  // NUEVO: nombres largos + faltantes
  // -----------------------------
  const nombreLargoPorPabId = useMemo(() => {
    const map: Record<string, string> = {}
    CONTADORES_PRODUCCION.forEach((c) => {
      if (!map[c.pabellonId]) map[c.pabellonId] = c.pabellonNombre
    })
    return map
  }, [])

  const pabellonesFaltantes = useMemo(() => {
    if (!esHoy) return []
    return pabellonesAutomaticosOrden.filter((pabId) => !pabellonesCompletos.has(pabId))
  }, [esHoy, pabellonesAutomaticosOrden, pabellonesCompletos])

  const nombresFaltantes = useMemo(() => {
    return pabellonesFaltantes.map((pabId) => nombreLargoPorPabId[pabId] || pabId.toUpperCase())
  }, [pabellonesFaltantes, nombreLargoPorPabId])

  const primerFaltanteId = useMemo(() => (pabellonesFaltantes.length ? pabellonesFaltantes[0] : null), [pabellonesFaltantes])

  const scrollToIngreso = () => {
    // asegura expandido
    setSeccionIngresoAutoExpandida(true)

    // scroll general a la sección
    ingresoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    // y luego al primer faltante, si existe
    if (primerFaltanteId) {
      window.setTimeout(() => {
        const el = cardRefs.current[primerFaltanteId]
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightPabId(primerFaltanteId)
        window.setTimeout(() => setHighlightPabId(null), 2500)
      }, 250)
    }
  }

  // -----------------------------
  // Acciones input por pabellón
  // -----------------------------
  const setContador = (pabId: string, contadorId: number, raw: string) => {
    setOkIngreso(null)
    setErrorIngreso(null)
    const val = parseEntero(raw)
    setFormContadores((prev) => ({
      ...prev,
      [pabId]: {
        ...(prev[pabId] || {}),
        [contadorId]: val,
      },
    }))
  }

  const setPeso = (pabId: string, raw: string) => {
    setOkIngreso(null)
    setErrorIngreso(null)
    setFormPeso((prev) => ({ ...prev, [pabId]: raw }))
  }

  const validarCompletoPabellon = (pabId: string) => {
    const conts = contadoresPorPabellon[pabId] || []
    if (conts.length !== 6) return { ok: false, message: 'Configuración inválida (se esperaban 6 contadores)' }

    for (const c of conts) {
      const v = formContadores?.[pabId]?.[c.id]
      if (v === undefined || v === null || Number.isNaN(Number(v))) {
        return { ok: false, message: `Falta ingresar ${extraerNumeroContador(c.label)}` }
      }
      if (Number(v) < 0) return { ok: false, message: `${extraerNumeroContador(c.label)} no puede ser negativo` }
    }

    const pesoN = parseDecimalFlexible(formPeso?.[pabId] || '')
    if (pesoN === null) return { ok: false, message: `Falta ingresar el peso (kg) de ${nombreLargoPorPabId[pabId] || pabId}` }
    if (pesoN < 0) return { ok: false, message: 'El peso no puede ser negativo' }

    return { ok: true, peso: pesoN }
  }

  const guardarPabellon = async (pabId: string) => {
    try {
      setErrorIngreso(null)
      setOkIngreso(null)

      if (!esHoy) {
        throw new Error('Solo se permite guardar en la fecha de hoy')
      }
      if (!profile?.uid) {
        throw new Error('Usuario no autenticado')
      }
      if (pabellonesCompletos.has(pabId)) {
        throw new Error(`Este pabellón ya está ingresado hoy`)
      }

      const valid = validarCompletoPabellon(pabId)
      if (!valid.ok) throw new Error(valid.message)

      setGuardandoPabellon(pabId)

      const valores = formContadores[pabId] || {}
      await guardarProduccionPorPabellon(
        fechaSeleccionada,
        pabId,
        valores,
        valid.peso!,
        profile.uid,
        profile.nombre || 'Usuario',
      )

      // refrescar para bloquear y actualizar totales
      const reg = await obtenerContadoresFecha(fechaSeleccionada)
      setRegistroContadores(reg)
      setContadoresIngresados(!!reg)

      const pesoTotal = await obtenerPesoBalde(fechaSeleccionada)
      setPesoBaldeTotal(pesoTotal)

      const pbDoc = await obtenerPesosBaldePorPabellon(fechaSeleccionada)
      setPesosPorPabellon(pbDoc?.pesosPorPabellon || {})

      setOkIngreso(`${(nombreLargoPorPabId[pabId] || pabId.toUpperCase())} guardado ✅`)

      // auto-highlight del siguiente faltante (si hay)
      window.setTimeout(() => {
        const nextFaltante = pabellonesAutomaticosOrden.find((id) => !(reg?.pabellonesCompletos || []).includes(id))
        if (nextFaltante) {
          const el = cardRefs.current[nextFaltante]
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setHighlightPabId(nextFaltante)
          window.setTimeout(() => setHighlightPabId(null), 2500)
        }
      }, 350)
    } catch (e: any) {
      setErrorIngreso(e?.message || 'Error al guardar')
    } finally {
      setGuardandoPabellon(null)
    }
  }

  // -----------------------------
  // Alerta superior (mejorada)
  // -----------------------------
  const renderAlertaPendiente = () => {
    if (!esHoy) return null
    if (estadoDia === 'COMPLETO') return null

    const msg =
      estadoDia === 'PENDIENTE'
        ? `Ingreso de producción pendiente: no hay pabellones guardados hoy.`
        : `Ingreso parcial: faltan ${completadosCount.faltan} pabellón(es) por registrar hoy.`

    return (
      <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>

          <div className="flex-1">
            <p className="text-sm text-red-800 font-semibold">{msg}</p>

            {nombresFaltantes.length > 0 && (
              <p className="text-sm text-red-800 mt-1">
                Faltan: <span className="font-semibold">{nombresFaltantes.join(', ')}</span>
              </p>
            )}

            <button
              onClick={scrollToIngreso}
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-900 underline"
            >
              Ir a ingresar (primer faltante) →
            </button>
          </div>

          <div className="text-right">
            <p className="text-xs text-red-700 font-semibold">Hoy</p>
            <p className="text-xs text-red-700">
              {completadosCount.done}/{completadosCount.total} OK
            </p>
          </div>
        </div>
      </div>
    )
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="p-8 space-y-6">
      {renderAlertaPendiente()}

      {/* SELECTOR FECHA */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow">
        <label className="font-medium text-gray-700">Fecha:</label>
        <input
          type="date"
          value={fechaSeleccionada}
          onChange={(e) => setFechaSeleccionada(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-600">{formatearFecha(fechaSeleccionada)}</span>
        {esHoy && <span className="text-sm text-blue-600 font-medium">Hoy</span>}
      </div>

      {/* CARGA */}
      {cargandoEstado ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-gray-600 mt-2">Cargando...</p>
        </div>
      ) : (
        <>
          {/* ESTADO DEL DÍA */}
          <div
            className={classNames(
              'rounded-lg p-6 shadow border-l-4',
              estadoDia === 'COMPLETO'
                ? 'bg-green-50 border-green-500'
                : estadoDia === 'PARCIAL'
                  ? 'bg-yellow-50 border-yellow-500'
                  : 'bg-red-50 border-red-500',
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {estadoDia === 'COMPLETO' ? (
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className={classNames('w-6 h-6', estadoDia === 'PARCIAL' ? 'text-yellow-600' : 'text-red-600')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
                  </svg>
                )}
              </div>

              <div className="flex-1">
                <h3 className={classNames('text-xl font-bold mb-2', estadoDia === 'COMPLETO' ? 'text-green-800' : estadoDia === 'PARCIAL' ? 'text-yellow-800' : 'text-red-800')}>
                  {estadoDia === 'COMPLETO'
                    ? '✅ Producción del día completa'
                    : estadoDia === 'PARCIAL'
                      ? '⚠️ Producción del día incompleta (parcial)'
                      : '❌ Producción del día pendiente'}
                </h3>

                {esHoy && estadoDia !== 'COMPLETO' && nombresFaltantes.length > 0 && (
                  <p className="text-sm text-gray-800 mb-3">
                    Faltan por ingresar hoy: <span className="font-semibold">{nombresFaltantes.join(', ')}</span>
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-4 border">
                    <p className="text-xs text-gray-500">Total producción día</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(registroContadores?.totalProduccion ?? 0).toLocaleString('es-CL')} U
                    </p>
                    {registroAnterior && registroContadores && (
                      <p className="text-xs text-gray-600 mt-1">
                        Variación vs ayer:{' '}
                        <span
                          className={
                            calcularVariacion(registroContadores.totalProduccion, registroAnterior.totalProduccion) >= 0
                              ? 'text-green-700 font-semibold'
                              : 'text-red-700 font-semibold'
                          }
                        >
                          {calcularVariacion(registroContadores.totalProduccion, registroAnterior.totalProduccion) >= 0 ? '+' : ''}
                          {calcularVariacion(registroContadores.totalProduccion, registroAnterior.totalProduccion).toFixed(1)}%
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-4 border">
                    <p className="text-xs text-gray-500">Peso balde total</p>
                    <p className="text-2xl font-bold text-gray-900">{(pesoBaldeTotal ?? 0).toLocaleString('es-CL')}</p>
                    <p className="text-xs text-gray-500 mt-1">Se calcula desde `pesosBalde/pb-YYYY-MM-DD`.</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border">
                    <p className="text-xs text-gray-500">Progreso</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {completadosCount.done}/{completadosCount.total}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Pabellones automáticos OK</p>

                    {registroContadores?.createdAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Inicio: <span className="text-gray-700 font-semibold">{formatDateTime(registroContadores.createdAt)}</span>
                      </p>
                    )}
                    {registroContadores?.usuarioNombre && (
                      <p className="text-xs text-gray-500">
                        Por: <span className="text-gray-700 font-semibold">{registroContadores.usuarioNombre}</span>
                      </p>
                    )}
                  </div>
                </div>

                {estadoDia !== 'COMPLETO' && esHoy && (
                  <button
                    onClick={scrollToIngreso}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold"
                  >
                    Ir a ingresar (primer faltante)
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* INGRESO POR PABELLÓN (AUTOMÁTICO) */}
          <div ref={ingresoRef} className="bg-white rounded-xl shadow-md overflow-hidden">
            <button
              onClick={() => setSeccionIngresoAutoExpandida(!seccionIngresoAutoExpandida)}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 flex items-center justify-between hover:from-emerald-700 hover:to-emerald-800 transition-colors"
            >
              <div className="text-left">
                <h2 className="text-2xl font-bold text-white">🏭 Ingreso por Pabellón (Automático)</h2>
                <p className="text-emerald-100 mt-1">
                  Completa 6 contadores + peso por pabellón ({completadosCount.done}/{completadosCount.total} OK)
                </p>
              </div>
              <svg
                className={`w-8 h-8 text-white transition-transform ${seccionIngresoAutoExpandida ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {seccionIngresoAutoExpandida && (
              <div className="p-6 space-y-4">
                {!esHoy && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 text-sm">
                    Solo se permite guardar en la fecha de hoy. Puedes revisar histórico, pero no editar.
                  </div>
                )}

                {(errorIngreso || okIngreso) && (
                  <div className="space-y-2">
                    {errorIngreso && (
                      <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
                        {errorIngreso}
                      </div>
                    )}
                    {okIngreso && (
                      <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-sm">
                        {okIngreso}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  {pabellonesAutomaticosOrden.map((pabId) => {
                    const conts = contadoresPorPabellon[pabId] || []
                    const yaIngresado = pabellonesCompletos.has(pabId)

                    const totalPab = conts.reduce((sum, c) => sum + Number(formContadores?.[pabId]?.[c.id] || 0), 0)
                    const pesoN = parseDecimalFlexible(formPeso?.[pabId] || '')
                    const pesoOk = pesoN !== null && pesoN >= 0

                    const nombreLargo = nombreLargoPorPabId[pabId] || (conts[0]?.pabellonNombre || pabId.toUpperCase())
                    const highlight = highlightPabId === pabId

                    return (
                      <div
                        key={pabId}
                        ref={(el) => {
                          cardRefs.current[pabId] = el
                        }}
                        className={classNames(
                          'border-2 rounded-xl overflow-hidden transition-all',
                          highlight ? 'border-red-500 ring-4 ring-red-200' : 'border-gray-200',
                        )}
                      >
                        <div className="p-4 bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-bold text-gray-900">{nombreLargo}</p>
                              <span
                                className={classNames(
                                  'text-xs px-2 py-1 rounded-full font-semibold',
                                  yaIngresado ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800',
                                )}
                              >
                                {yaIngresado ? 'Ingresado ✅' : 'Pendiente'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {pabId.toUpperCase()} • {conts.length} contadores + peso
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs text-gray-600">Total pabellón</p>
                              <p className="text-xl font-bold text-gray-900">{totalPab.toLocaleString('es-CL')} U</p>
                              <p className="text-xs text-gray-600">
                                Peso:{' '}
                                <span className={pesoOk ? 'font-semibold text-gray-900' : 'font-semibold text-red-700'}>
                                  {formatKg(pesoN)} kg
                                </span>
                              </p>
                            </div>

                            <button
                              disabled={!esHoy || yaIngresado || guardandoPabellon === pabId}
                              onClick={() => guardarPabellon(pabId)}
                              className={classNames(
                                'px-4 py-2 rounded-lg font-semibold text-sm transition-colors',
                                !esHoy || yaIngresado
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white',
                                guardandoPabellon === pabId && 'opacity-70',
                              )}
                              title={yaIngresado ? 'Este pabellón ya fue guardado y quedó bloqueado' : 'Guardar este pabellón'}
                            >
                              {guardandoPabellon === pabId ? 'Guardando...' : 'Guardar pabellón'}
                            </button>
                          </div>
                        </div>

                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                            {conts.map((c) => (
                              <div key={c.id} className="border rounded-lg p-3">
                                <p className="text-xs text-gray-600 font-semibold mb-1">{extraerNumeroContador(c.label)}</p>
                                <input
                                  inputMode="numeric"
                                  value={String(formContadores?.[pabId]?.[c.id] ?? 0)}
                                  onChange={(e) => setContador(pabId, c.id, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                  disabled={!esHoy || yaIngresado || guardandoPabellon === pabId}
                                  placeholder="0"
                                />
                                <p className="text-[11px] text-gray-500 mt-1">unidades</p>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="border rounded-lg p-3">
                              <p className="text-xs text-gray-600 font-semibold mb-1">Peso (kg)</p>
                              <input
                                inputMode="decimal"
                                value={formPeso?.[pabId] ?? ''}
                                onChange={(e) => setPeso(pabId, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                disabled={!esHoy || yaIngresado || guardandoPabellon === pabId}
                                placeholder="Ej: 3,2 o 3.2"
                              />
                              <p className="text-[11px] text-gray-500 mt-1">Se admite decimal (coma o punto).</p>
                            </div>

                            <div className="border rounded-lg p-3 bg-emerald-50">
                              <p className="text-xs text-gray-600 font-semibold mb-1">Estado</p>
                              <p className="text-sm text-gray-800">
                                {yaIngresado ? (
                                  <span className="font-semibold text-green-700">Ingresado y bloqueado ✅</span>
                                ) : (
                                  <span className="font-semibold text-yellow-800">Pendiente</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-600 mt-2">Regla: 6 contadores + peso para permitir guardar.</p>
                            </div>

                            <div className="border rounded-lg p-3 bg-gray-50">
                              <p className="text-xs text-gray-600 font-semibold mb-1">Peso guardado (DB)</p>
                              <p className="text-sm text-gray-900 font-semibold">
                                {formatKg(pesosPorPabellon?.[pabId] ?? null)} kg
                              </p>
                              <p className="text-[11px] text-gray-500 mt-1">Si difiere del input, ese es el valor persistido.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RESUMEN DETALLADO */}
          {contadoresIngresados && registroContadores?.contadores && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <button
                onClick={() => setSeccionResumenExpandida(!seccionResumenExpandida)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between hover:from-blue-700 hover:to-blue-800 transition-colors"
              >
                <div>
                  <h2 className="text-2xl font-bold text-white text-left">📊 Resumen de Contadores del Día</h2>
                  <p className="text-blue-100 mt-1 text-left">Contadores ingresados por pabellón</p>
                </div>
                <svg
                  className={`w-8 h-8 text-white transition-transform ${seccionResumenExpandida ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {seccionResumenExpandida && (
                <div className="p-6 space-y-3">
                  {Object.entries(agruparContadoresPorPabellon(registroContadores.contadores)).map(
                    ([pabellonNombre, contadoresPab]) => {
                      const isExpanded = pabellonesExpandidosResumen.has(pabellonNombre)
                      const totalPabellon = contadoresPab.reduce((sum, c) => sum + c.valor, 0)

                      let variacionPabellon = 0
                      if (registroAnterior?.contadores) {
                        const prev = registroAnterior.contadores.filter((c) => c.pabellonNombre === pabellonNombre)
                        const totalAnterior = prev.reduce((sum, c) => sum + c.valor, 0)
                        if (totalAnterior > 0) variacionPabellon = calcularVariacion(totalPabellon, totalAnterior)
                      }

                      const esPositivo = variacionPabellon >= 0

                      return (
                        <div key={pabellonNombre} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleResumenPabellon(pabellonNombre)}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl font-bold text-gray-800">{pabellonNombre}</span>
                              <span
                                className={classNames(
                                  'px-3 py-1 rounded-full text-sm font-bold',
                                  esPositivo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                                )}
                              >
                                {esPositivo ? '↗' : '↘'} {Math.abs(variacionPabellon).toFixed(1)}% vs día anterior
                              </span>
                            </div>
                            <svg
                              className={`w-6 h-6 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {isExpanded && (
                            <div className="p-6 bg-white border-t-2">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {contadoresPab.map((contador) => {
                                  let variacionIndividual: number | null = null
                                  if (registroAnterior?.contadores) {
                                    const contadorAnterior = registroAnterior.contadores.find(
                                      (c) => c.contadorId === contador.contadorId,
                                    )
                                    if (contadorAnterior && contadorAnterior.valor > 0) {
                                      variacionIndividual = calcularVariacion(contador.valor, contadorAnterior.valor)
                                    }
                                  }

                                  return (
                                    <div key={contador.contadorId} className="bg-gray-50 rounded-lg p-4 text-center">
                                      <p className="text-sm font-semibold text-gray-700 mb-2">{extraerNumeroContador(contador.label)}</p>
                                      <p className="text-3xl font-bold text-blue-600">{contador.valor.toLocaleString('es-CL')}</p>
                                      <p className="text-xs text-gray-500 mt-1">unidades</p>
                                      {variacionIndividual !== null && (
                                        <p
                                          className={classNames(
                                            'text-xs font-semibold mt-2',
                                            variacionIndividual >= 0 ? 'text-green-600' : 'text-red-600',
                                          )}
                                        >
                                          {variacionIndividual >= 0 ? '▲' : '▼'} {variacionIndividual >= 0 ? '+' : ''}
                                          {variacionIndividual.toFixed(1)}%
                                        </p>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>

                              <div className="mt-6 bg-blue-50 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-gray-600 mb-1">Total del Pabellón</p>
                                    <p className="text-3xl font-bold text-blue-600">{totalPabellon.toLocaleString('es-CL')} U</p>
                                  </div>
                                  <div className={`text-right ${esPositivo ? 'text-green-600' : 'text-red-600'}`}>
                                    <p className="text-sm font-medium">vs día anterior</p>
                                    <p className="text-2xl font-bold">
                                      {esPositivo ? '↗' : '↘'} {Math.abs(variacionPabellon).toFixed(1)}%
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    },
                  )}
                </div>
              )}
            </div>
          )}

          {/* PABELLONES (minimizable y estado OK/PENDIENTE) */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <button
              onClick={() => setSeccionPabellonesExpandida(!seccionPabellonesExpandida)}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 flex items-center justify-between hover:from-indigo-700 hover:to-indigo-800 transition-colors"
            >
              <div>
                <h2 className="text-2xl font-bold text-white text-left">🏭 Pabellones de Producción</h2>
                <p className="text-indigo-100 mt-1 text-left">Pabellones activos ({pabellonesActivos.length})</p>
              </div>
              <svg
                className={`w-8 h-8 text-white transition-transform ${seccionPabellonesExpandida ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {seccionPabellonesExpandida && (
              <div className="p-6">
                {pabellonesActivos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg font-medium">No hay pabellones activos configurados</p>
                    <p className="text-sm mt-2">Activa los pabellones en la sección de Configuración</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pabellonesActivos.map((pab) => {
                      const ocupacion = pab.capacidadTotal
                        ? ((pab.cantidadTotal / pab.capacidadTotal) * 100).toFixed(1)
                        : '0.0'

                      const isAuto = (PABELLONES_AUTOMATICOS as readonly string[]).includes(pab.id)
                      const okHoy = isAuto ? pabellonesCompletos.has(pab.id) : false
                      const mini = pabellonesMini.has(pab.id)

                      return (
                        <div key={pab.id} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                          <div className="p-4 bg-gray-50 flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-lg font-bold text-gray-900">{pab.nombre}</p>

                                {isAuto && (
                                  <span
                                    className={classNames(
                                      'text-xs px-2 py-1 rounded-full font-semibold',
                                      okHoy ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800',
                                    )}
                                  >
                                    {okHoy ? 'Ingresado hoy ✅' : esHoy ? 'Pendiente hoy' : 'Histórico'}
                                  </span>
                                )}

                                <span className="text-xs px-2 py-1 rounded-full font-semibold bg-indigo-100 text-indigo-700">
                                  {pab.activo ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>

                              <p className="text-xs text-gray-600 mt-1">
                                Ocupación: <span className="font-semibold">{ocupacion}%</span> • Cantidad:{' '}
                                <span className="font-semibold">{(pab.cantidadTotal || 0).toLocaleString('es-CL')} U</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {isAuto && esHoy && !okHoy && (
                                <button
                                  onClick={scrollToIngreso}
                                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                                >
                                  Ingresar
                                </button>
                              )}

                              <button
                                onClick={() => toggleMiniPabellon(pab.id)}
                                className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-white text-sm font-semibold"
                              >
                                {mini ? 'Expandir' : 'Minimizar'}
                              </button>

                              <button
                                onClick={() => setPabellonDetalle(pab)}
                                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
                              >
                                Ver detalle
                              </button>
                            </div>
                          </div>

                          {!mini && (
                            <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="bg-blue-50 rounded-lg p-4">
                                <p className="text-xs text-gray-600 mb-1 font-semibold">Cantidad actual</p>
                                <p className="text-2xl font-bold text-blue-700">
                                  {(pab.cantidadTotal || 0).toLocaleString('es-CL')}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">unidades</p>
                              </div>

                              <div className="bg-green-50 rounded-lg p-4">
                                <p className="text-xs text-gray-600 mb-1 font-semibold">% ocupación</p>
                                <p className="text-2xl font-bold text-green-700">{ocupacion}%</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  de {(pab.capacidadTotal || 0).toLocaleString('es-CL')} U
                                </p>
                              </div>

                              <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-xs text-gray-600 mb-1 font-semibold">Config</p>
                                <p className="text-sm text-gray-800">
                                  Líneas: <span className="font-semibold">{pab.totalLineas || 0}</span>
                                </p>
                                <p className="text-sm text-gray-800">
                                  Caras/Línea: <span className="font-semibold">{pab.carasPorLinea || 0}</span>
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MODAL detalle */}
          {pabellonDetalle && <VerPabellonModal pabellon={pabellonDetalle} onClose={() => setPabellonDetalle(null)} />}
        </>
      )}
    </div>
  )
}
