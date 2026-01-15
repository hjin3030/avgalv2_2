// src/pages/salaL/salaL.tsx

import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { GRAMOS_POR_UNIDAD } from '@/utils/constants'
import { useAuth } from '@/hooks/useAuth'
import type { UserProfile } from '@/types'

type StockSalaLItem = {
  id: string
  skuCodigo: string
  skuNombre?: string
  cantidad: number
  updatedAt?: any
}

type DetalleCBU = { totalUnidades?: number; cajas?: number; bandejas?: number; unidades?: number }

type LoteLimpieza = {
  id: string
  loteCodigo: string
  estado: string
  skuCodigoSucio: string
  skuNombreSucio?: string
  pabellonId?: string | null
  pabellonNombre?: string | null

  ingreso?: DetalleCBU // MAN (sucio)
  lavado?: DetalleCBU // en Sala L lo usaremos como SINCAL observado (lavado)
  desechoKg?: number
  desechoUnidades?: number // DES Sala L (uds)

  porcentajeLavado?: number // % SINCAL vs MAN (orientación)
  porcentajeDesecho?: number // % DES vs MAN (orientación)
  diferenciaSalaL?: number // (SINCAL + DES) - MAN (orientación)

  fechaIngresoSalaL?: string
  horaIngresoSalaL?: string
  usuarioIngresoSalaLId?: string
  usuarioIngresoSalaLNombre?: string

  timestampIngresoSalaL?: any
  timestampLavado?: any

  // metadata útil para siguientes etapas
  skuDestinoSincal?: string
  sincalUnidades?: number // redundante: lavado.totalUnidades
  desSalaLUnidades?: number // redundante: desechoUnidades
  referenciaManUnidades?: number // redundante: ingreso.totalUnidades

  createdAt?: any
  updatedAt?: any
}

const SALA_L_SKUS = ['BLA MAN', 'COL MAN', 'BLA SINCAL', 'COL SINCAL', 'DES'] as const

type TabKey = 'lotes' | 'stock' | 'cartola'
type SortDir = 'asc' | 'desc'

type Movimiento = {
  id: string
  tipo: 'ingreso' | 'egreso' | 'reingreso' | 'ajuste'
  skuCodigo: string
  skuNombre?: string
  cantidad: number
  origenNombre?: string
  destinoNombre?: string
  valeId?: string
  valeReferencia?: string
  valeEstado?: string
  loteId?: string
  fecha?: string
  hora?: string
  createdAt?: any
  timestamp?: any
  usuarioId?: string
  usuarioNombre?: string
  metadata?: any
}

const UNIDADES_POR_CAJA = 180
const UNIDADES_POR_BANDEJA = 30

function n(v: any): number {
  const x = Number(v ?? 0)
  return isNaN(x) ? 0 : x
}

function formatUds(v: any) {
  return n(v).toLocaleString('es-CL')
}

function formatKg(v: any) {
  return n(v).toLocaleString('es-CL', { maximumFractionDigits: 2 })
}

function udsDesdeKg(kg: any) {
  const gramos = n(kg) * 1000
  if (GRAMOS_POR_UNIDAD <= 0) return 0
  return Math.round(gramos / GRAMOS_POR_UNIDAD)
}

function badgeEstado(estado: string) {
  const e = String(estado || '').toUpperCase()
  if (e === 'EN_SALA') return { label: 'En Sala', cls: 'bg-yellow-100 text-yellow-900 border-yellow-200' }
  if (e === 'LAVADO_OK') return { label: 'Lavado OK', cls: 'bg-blue-100 text-blue-900 border-blue-200' }
  if (e === 'ENVIADO_A_CALIBRAR') return { label: 'Enviado', cls: 'bg-purple-100 text-purple-900 border-purple-200' }
  if (e === 'CERRADO') return { label: 'Cerrado', cls: 'bg-green-100 text-green-900 border-green-200' }
  return { label: estado || '—', cls: 'bg-gray-100 text-gray-900 border-gray-200' }
}

function pct(num: number, den: number): number {
  if (den <= 0) return 0
  return (num / den) * 100
}

function formatDetalleCBU(d?: DetalleCBU) {
  const total = n(d?.totalUnidades)
  const cajas = n(d?.cajas)
  const bandejas = n(d?.bandejas)
  const unidades = n(d?.unidades)

  const partes: string[] = []
  if (cajas) partes.push(`${cajas}C`)
  if (bandejas) partes.push(`${bandejas}B`)
  if (unidades) partes.push(`${unidades}U`)

  return partes.length ? `${formatUds(total)} (${partes.join(', ')})` : `${formatUds(total)}`
}

function desglose180_30(totalUnidades: number) {
  const abs = Math.abs(n(totalUnidades))
  const cajas = Math.floor(abs / UNIDADES_POR_CAJA)
  const resto = abs % UNIDADES_POR_CAJA
  const bandejas = Math.floor(resto / UNIDADES_POR_BANDEJA)
  const unidades = resto % UNIDADES_POR_BANDEJA

  const partes: string[] = []
  if (cajas) partes.push(`${cajas}C`)
  if (bandejas) partes.push(`${bandejas}B`)
  if (unidades) partes.push(`${unidades}U`)
  return partes.length ? `(${partes.join(', ')})` : ''
}

function inferSkuSincalDesdeSucio(skuCodigoSucio: string) {
  const sku = String(skuCodigoSucio || '').toUpperCase()
  if (sku.startsWith('BLA')) return 'BLA SINCAL'
  if (sku.startsWith('COL')) return 'COL SINCAL'
  return 'BLA SINCAL'
}

function nombreSkuSincal(skuCodigo: string) {
  if (skuCodigo === 'BLA SINCAL') return 'blanco sin calibrar'
  if (skuCodigo === 'COL SINCAL') return 'color sin calibrar'
  return skuCodigo
}

function nombreSkuDes() {
  return 'desecho'
}

function horaChileHHmm(date: Date) {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function toggleSort(currentKey: string, currentDir: SortDir, nextKey: string): { key: string; dir: SortDir } {
  if (currentKey !== nextKey) return { key: nextKey, dir: 'asc' }
  return { key: nextKey, dir: currentDir === 'asc' ? 'desc' : 'asc' }
}

function monthRange(yyyyMm: string): { desde: string; hasta: string } {
  const [yStr, mStr] = yyyyMm.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  const first = new Date(y, m - 1, 1)
  const last = new Date(y, m, 0)
  const desde = first.toISOString().slice(0, 10)
  const hasta = last.toISOString().slice(0, 10)
  return { desde, hasta }
}

function inRange(fecha: string | undefined, desde?: string, hasta?: string) {
  if (!fecha) return false
  if (desde && fecha < desde) return false
  if (hasta && fecha > hasta) return false
  return true
}

export default function SalaLPage() {
  const { profile } = useAuth() as { profile: UserProfile | null }

  const [tab, setTab] = useState<TabKey>('lotes')

  const [stockSalaL, setStockSalaL] = useState<StockSalaLItem[]>([])
  const [lotes, setLotes] = useState<LoteLimpieza[]>([])
  const [loading, setLoading] = useState(true)

  // Movimientos (Cartola) - DEBEN IR DENTRO DEL COMPONENTE
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loadingMov, setLoadingMov] = useState(false)

  const [selectedLote, setSelectedLote] = useState<LoteLimpieza | null>(null)

  // Acciones (inputs modal) -> acá “Lavado” = SINCAL observado (no neto)
  const [lavC, setLavC] = useState(0)
  const [lavB, setLavB] = useState(0)
  const [lavU, setLavU] = useState(0)
  const [desKg, setDesKg] = useState(0)

  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Filtros
  const [qText, setQText] = useState('')
  const [fEstado, setFEstado] = useState<string>('TODOS')
  const [fSku, setFSku] = useState<string>('TODOS')

  // Filtro fecha global (para TODOS LOS DATOS de esta página)
  const [fechaDesde, setFechaDesde] = useState<string>('')
  const [fechaHasta, setFechaHasta] = useState<string>('')
  const [mes, setMes] = useState<string>('')

  // Sort tablas
  const [sortLotesKey, setSortLotesKey] = useState<string>('updatedAt')
  const [sortLotesDir, setSortLotesDir] = useState<SortDir>('desc')

  const [sortStockKey, setSortStockKey] = useState<string>('skuCodigo')
  const [sortStockDir, setSortStockDir] = useState<SortDir>('asc')

  const headerBtn = (
    label: string,
    key: string,
    currentKey: string,
    currentDir: SortDir,
    onToggle: (k: string, d: SortDir) => void,
    align: 'left' | 'center' | 'right' = 'left',
  ) => {
    const is = currentKey === key
    const arrow = is ? (currentDir === 'asc' ? '▲' : '▼') : ''
    const cls = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'

    return (
      <button
        type="button"
        className={`w-full flex items-center gap-2 ${cls} hover:underline`}
        onClick={() => {
          const next = toggleSort(currentKey, currentDir, key)
          onToggle(next.key, next.dir)
        }}
      >
        <span>{label}</span>
        <span className="text-[10px] text-gray-500">{arrow}</span>
      </button>
    )
  }

  // =========================
  // SNAPSHOT MOVIMIENTOS (CARTOLA)
  // =========================
  useEffect(() => {
    setLoadingMov(true)

    const qMov = query(collection(db, 'movimientos'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      qMov,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Movimiento[]
        setMovimientos(data)
        setLoadingMov(false)
      },
      (err) => {
        console.error('movimientos snapshot error', err)
        setLoadingMov(false)
      },
    )

    return () => unsub()
  }, [])

  // =========================
  // STOCK + LOTES
  // =========================
  useEffect(() => {
    setLoading(true)

    const qStock = query(collection(db, 'stockSalaL'))
    const unsubStock = onSnapshot(
      qStock,
      (snap) => {
        const data = snap.docs.map((d) => {
          const x = d.data() as any
          return {
            id: d.id,
            skuCodigo: x.skuCodigo ?? d.id,
            skuNombre: x.skuNombre ?? '',
            cantidad: Number(x.cantidad ?? 0),
            updatedAt: x.updatedAt,
          } as StockSalaLItem
        })
        setStockSalaL(data)
      },
      (err) => console.error('stockSalaL snapshot error', err),
    )

    const qLotes = query(collection(db, 'lotesLimpieza'), orderBy('updatedAt', 'desc'))
    const unsubLotes = onSnapshot(
      qLotes,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as LoteLimpieza[]
        setLotes(data)
        setLoading(false)
      },
      (err) => {
        console.error('lotesLimpieza snapshot error', err)
        setLoading(false)
      },
    )

    return () => {
      unsubStock()
      unsubLotes()
    }
  }, [])

  // Si eligen mes completo -> setea rango automáticamente
  useEffect(() => {
    if (!mes) return
    const { desde, hasta } = monthRange(mes)
    setFechaDesde(desde)
    setFechaHasta(hasta)
  }, [mes])

  const limpiarFiltros = () => {
    setQText('')
    setFEstado('TODOS')
    setFSku('TODOS')
    setFechaDesde('')
    setFechaHasta('')
    setMes('')
  }

  const stockFiltrado = useMemo(() => {
    const desde = fechaDesde || undefined
    const hasta = fechaHasta || undefined
    if (!(desde || hasta)) return stockSalaL

    // Stock no tiene fecha negocio; aplicamos por updatedAt cuando exista
    return stockSalaL.filter((s) => {
      const fechaBase = s.updatedAt?.toDate ? s.updatedAt.toDate().toISOString().slice(0, 10) : ''
      return inRange(fechaBase, desde, hasta)
    })
  }, [stockSalaL, fechaDesde, fechaHasta])

  const stockOrdenado = useMemo(() => {
    const arr = [...stockFiltrado]
    const dir = sortStockDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      let va: any
      let vb: any
      switch (sortStockKey) {
        case 'skuCodigo':
          va = a.skuCodigo
          vb = b.skuCodigo
          break
        case 'skuNombre':
          va = a.skuNombre || ''
          vb = b.skuNombre || ''
          break
        case 'cantidad':
          va = n(a.cantidad)
          vb = n(b.cantidad)
          break
        default:
          va = a.skuCodigo
          vb = b.skuCodigo
      }
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
    return arr
  }, [stockFiltrado, sortStockKey, sortStockDir])

  const skuOptions = useMemo(() => {
    const s = new Set<string>()
    lotes.forEach((l) => {
      if (l.skuCodigoSucio) s.add(l.skuCodigoSucio)
    })
    return Array.from(s).sort()
  }, [lotes])

  const lotesFiltrados = useMemo(() => {
    const t = qText.trim().toLowerCase()
    const desde = fechaDesde || undefined
    const hasta = fechaHasta || undefined

    return lotes.filter((l) => {
      if (fEstado !== 'TODOS' && String(l.estado) !== fEstado) return false
      if (fSku !== 'TODOS' && String(l.skuCodigoSucio) !== fSku) return false

      // filtro fecha global (para todos los datos)
      if (desde || hasta) {
        const fechaBase =
          l.fechaIngresoSalaL ||
          (l.updatedAt?.toDate
            ? l.updatedAt.toDate().toISOString().slice(0, 10)
            : l.createdAt?.toDate
              ? l.createdAt.toDate().toISOString().slice(0, 10)
              : '')
        if (!inRange(fechaBase, desde, hasta)) return false
      }

      if (!t) return true

      const hay =
        String(l.loteCodigo || '').toLowerCase().includes(t) ||
        String(l.id || '').toLowerCase().includes(t) ||
        String(l.skuCodigoSucio || '').toLowerCase().includes(t) ||
        String(l.skuNombreSucio || '').toLowerCase().includes(t) ||
        String(l.pabellonNombre || '').toLowerCase().includes(t)

      return hay
    })
  }, [lotes, qText, fEstado, fSku, fechaDesde, fechaHasta])

  const lotesOrdenados = useMemo(() => {
    const arr = [...lotesFiltrados]
    const dir = sortLotesDir === 'asc' ? 1 : -1

    const getVal = (l: LoteLimpieza) => {
      switch (sortLotesKey) {
        case 'loteCodigo':
          return l.loteCodigo || ''
        case 'estado':
          return l.estado || ''
        case 'sku':
          return l.skuCodigoSucio || ''
        case 'pabellon':
          return l.pabellonNombre || ''
        case 'man':
          return n(l.ingreso?.totalUnidades)
        case 'sincal':
          return n(l.lavado?.totalUnidades)
        case 'des':
          return n(l.desechoUnidades) || udsDesdeKg(l.desechoKg)
        case 'dif': {
          const manU = n(l.ingreso?.totalUnidades)
          const sincalU = n(l.lavado?.totalUnidades)
          const desU = n(l.desechoUnidades) || udsDesdeKg(l.desechoKg)
          return sincalU + desU - manU
        }
        case 'fecha':
          return l.fechaIngresoSalaL || ''
        default:
          return l.updatedAt?.toDate ? l.updatedAt.toDate().getTime() : 0
      }
    }

    arr.sort((a, b) => {
      const va: any = getVal(a)
      const vb: any = getVal(b)
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })

    return arr
  }, [lotesFiltrados, sortLotesKey, sortLotesDir])

  const kpis = useMemo(() => {
    const totalLotes = lotesOrdenados.length
    const enSala = lotesOrdenados.filter((l) => l.estado === 'EN_SALA').length
    const lavadoOK = lotesOrdenados.filter((l) => l.estado === 'LAVADO_OK').length

    const totalIngreso = lotesOrdenados.reduce((sum, l) => sum + n(l.ingreso?.totalUnidades), 0)
    const totalSincal = lotesOrdenados.reduce((sum, l) => sum + n(l.lavado?.totalUnidades), 0)

    const totalDesechoKg = lotesOrdenados.reduce((sum, l) => sum + n(l.desechoKg), 0)
    const totalDesechoUds = lotesOrdenados.reduce((sum, l) => sum + (n(l.desechoUnidades) || udsDesdeKg(l.desechoKg)), 0)

    const stockTotalSalaL = stockFiltrado.reduce((sum, s) => sum + n(s.cantidad), 0)

    return {
      totalLotes,
      enSala,
      lavadoOK,
      totalIngreso,
      totalSincal,
      totalDesechoKg,
      totalDesechoUds,
      stockTotalSalaL,
    }
  }, [lotesOrdenados, stockFiltrado])

  const movimientosSalaL = useMemo(() => {
    const desde = fechaDesde || undefined
    const hasta = fechaHasta || undefined

    return movimientos.filter((m) => {
      if (!SALA_L_SKUS.includes(m.skuCodigo as any)) return false

      const origen = String(m.origenNombre || '')
      if (!origen.includes('Sala L')) return false

      if (desde || hasta) {
        const f = String(m.fecha || '')
        if (!inRange(f, desde, hasta)) return false
      }

      return true
    })
  }, [movimientos, fechaDesde, fechaHasta])

  const resetAccionesInputs = () => {
    setLavC(0)
    setLavB(0)
    setLavU(0)
    setDesKg(0)
    setActionError(null)
  }

  const abrirLote = (l: LoteLimpieza) => {
    setSelectedLote(l)
    resetAccionesInputs()
  }

  const cerrarLote = () => {
    setSelectedLote(null)
    resetAccionesInputs()
  }

  const sincalUdsInput = useMemo(() => n(lavC) * UNIDADES_POR_CAJA + n(lavB) * UNIDADES_POR_BANDEJA + n(lavU), [lavC, lavB, lavU])
  const desechoUdsInput = useMemo(() => udsDesdeKg(desKg), [desKg])

  const loteEditable = selectedLote?.estado === 'EN_SALA'

  async function confirmarSalaL() {
    if (!selectedLote) return

    if (!profile?.uid || !profile?.nombre) {
      setActionError('No hay usuario autenticado.')
      return
    }

    if (!loteEditable) {
      setActionError('Este lote ya fue confirmado y no se puede editar.')
      return
    }

    if (sincalUdsInput <= 0) {
      setActionError('Debe ingresar SINCAL (CBU) > 0.')
      return
    }

    if (n(desKg) < 0) {
      setActionError('Desecho (kg) no puede ser negativo.')
      return
    }

    setActionLoading(true)
    setActionError(null)

    try {
      const ahora = new Date()
      const ts = Timestamp.fromDate(ahora)
      const fecha = ahora.toISOString().split('T')[0]
      const hora = horaChileHHmm(ahora)

      const skuSincal = inferSkuSincalDesdeSucio(selectedLote.skuCodigoSucio)
      const skuSincalNombre = nombreSkuSincal(skuSincal)

      const skuDes = 'DES'
      const skuDesNombre = nombreSkuDes()

      await runTransaction(db, async (tx) => {
        const loteRef = doc(db, 'lotesLimpieza', selectedLote.id)
        const loteSnap = await tx.get(loteRef)
        if (!loteSnap.exists()) throw new Error('Lote no existe')

        const data = loteSnap.data() as any

        if (String(data.estado) !== 'EN_SALA') {
          throw new Error('Este lote ya fue confirmado y no se puede editar.')
        }

        const ingresoU = n(data.ingreso?.totalUnidades) // MAN
        const totalSalidaObs = sincalUdsInput + desechoUdsInput
        const diferencia = totalSalidaObs - ingresoU

        const pctSincal = pct(sincalUdsInput, ingresoU)
        const pctDes = pct(desechoUdsInput, ingresoU)

        const lavadoNuevo: DetalleCBU = {
          cajas: n(lavC),
          bandejas: n(lavB),
          unidades: n(lavU),
          totalUnidades: sincalUdsInput,
        }

        const evRef = doc(collection(db, 'lotesLimpieza', selectedLote.id, 'eventos'))
        tx.set(evRef, {
          tipo: 'SALA_L_CONFIRMADO',
          referencia: {
            manUnidades: ingresoU,
            sincalUnidades: sincalUdsInput,
            desUnidades: desechoUdsInput,
            totalSalidaObs,
            diferenciaVsMan: diferencia,
            porcSincalVsMan: pctSincal,
            porcDesVsMan: pctDes,
          },
          sincal: {
            sku: skuSincal,
            cajas: n(lavC),
            bandejas: n(lavB),
            unidades: n(lavU),
            totalUnidades: sincalUdsInput,
          },
          desecho: {
            sku: 'DES',
            kg: n(desKg),
            unidades: desechoUdsInput,
            gramosPorUnidad: GRAMOS_POR_UNIDAD,
          },
          fecha,
          hora,
          usuarioId: profile.uid,
          usuarioNombre: profile.nombre,
          createdAt: ts,
        })

        tx.update(loteRef, {
          estado: 'LAVADO_OK',
          lavado: lavadoNuevo,

          desechoKg: n(desKg),
          desechoUnidades: desechoUdsInput,

          porcentajeLavado: pctSincal,
          porcentajeDesecho: pctDes,
          diferenciaSalaL: diferencia,

          timestampLavado: ts,
          updatedAt: ts,

          skuDestinoSincal: skuSincal,
          sincalUnidades: sincalUdsInput,
          desSalaLUnidades: desechoUdsInput,
          referenciaManUnidades: ingresoU,
        })
      })

      const batch = writeBatch(db)

      // stock SINCAL
      const stockSincalRef = doc(db, 'stock', skuSincal)
      const stockSincalSnap = await getDoc(stockSincalRef)
      const sincalActual = stockSincalSnap.exists() ? n((stockSincalSnap.data() as any).cantidad) : 0
      const sincalNuevo = sincalActual + sincalUdsInput

      if (!stockSincalSnap.exists()) {
        batch.set(stockSincalRef, {
          skuCodigo: skuSincal,
          skuNombre: skuSincalNombre,
          cantidad: sincalNuevo,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } else {
        batch.update(stockSincalRef, {
          cantidad: sincalNuevo,
          updatedAt: serverTimestamp(),
        })
      }

      // stock DES
      if (desechoUdsInput > 0) {
        const stockDesRef = doc(db, 'stock', skuDes)
        const stockDesSnap = await getDoc(stockDesRef)
        const desActual = stockDesSnap.exists() ? n((stockDesSnap.data() as any).cantidad) : 0
        const desNuevo = desActual + desechoUdsInput

        if (!stockDesSnap.exists()) {
          batch.set(stockDesRef, {
            skuCodigo: skuDes,
            skuNombre: skuDesNombre,
            cantidad: desNuevo,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        } else {
          batch.update(stockDesRef, {
            cantidad: desNuevo,
            updatedAt: serverTimestamp(),
          })
        }
      }

      // movimiento SINCAL
      const movSincalRef = doc(collection(db, 'movimientos'))
      batch.set(movSincalRef, {
        tipo: 'ingreso',
        skuCodigo: skuSincal,
        skuNombre: skuSincalNombre,
        cantidad: sincalUdsInput,

        origenNombre: 'Sala L (MAN)',
        destinoNombre: 'Bodega (SINCAL)',

        valeId: selectedLote.id,
        valeReferencia: selectedLote.loteCodigo || selectedLote.id,
        valeEstado: 'validado',

        loteId: selectedLote.id,

        fecha,
        hora,
        usuarioId: profile.uid,
        usuarioNombre: profile.nombre,

        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(),
      })

      // movimiento DES
      if (desechoUdsInput > 0) {
        const movDesRef = doc(collection(db, 'movimientos'))
        batch.set(movDesRef, {
          tipo: 'ingreso',
          skuCodigo: skuDes,
          skuNombre: skuDesNombre,
          cantidad: desechoUdsInput,

          origenNombre: 'Sala L (MAN)',
          destinoNombre: 'Bodega (DES)',

          valeId: selectedLote.id,
          valeReferencia: selectedLote.loteCodigo || selectedLote.id,
          valeEstado: 'validado',

          loteId: selectedLote.id,

          metadata: {
            desechoKgSalaL: n(desKg),
            gramosPorUnidad: GRAMOS_POR_UNIDAD,
          },

          fecha,
          hora,
          usuarioId: profile.uid,
          usuarioNombre: profile.nombre,

          createdAt: serverTimestamp(),
          timestamp: serverTimestamp(),
        })
      }

      await batch.commit()
      cerrarLote()
    } catch (e: any) {
      setActionError(e?.message || 'Error al confirmar Sala L')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-4 bg-white shadow-sm border border-gray-200 rounded-lg">
        <div className="p-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sala L</h1>
            <p className="text-gray-600 mt-1">Ingreso MAN → salidas observadas: SINCAL + DES (control por % y diferencias).</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTab('lotes')}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
                tab === 'lotes' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              Lotes
            </button>
            <button
              onClick={() => setTab('stock')}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
                tab === 'stock' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              Stock
            </button>
            <button
              onClick={() => setTab('cartola')}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
                tab === 'cartola' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              Cartola
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="text-xs text-gray-600 font-semibold">Lotes</div>
            <div className="text-xl font-bold text-gray-900">{formatUds(kpis.totalLotes)}</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-xs text-yellow-800 font-semibold">En sala</div>
            <div className="text-xl font-bold text-yellow-900">{formatUds(kpis.enSala)}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs text-blue-800 font-semibold">Lavado OK</div>
            <div className="text-xl font-bold text-blue-900">{formatUds(kpis.lavadoOK)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-xs text-gray-600 font-semibold">Ingreso MAN (uds)</div>
            <div className="text-xl font-bold text-gray-900">{formatUds(kpis.totalIngreso)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-xs text-gray-600 font-semibold">SINCAL (uds)</div>
            <div className="text-xl font-bold text-gray-900">{formatUds(kpis.totalSincal)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-xs text-gray-600 font-semibold">DES Sala L</div>
            <div className="text-sm font-bold text-gray-900">
              {formatKg(kpis.totalDesechoKg)} kg <span className="text-gray-600">({formatUds(kpis.totalDesechoUds)} uds)</span>
            </div>
          </div>
        </div>

        {/* Filtro fecha global + limpiar */}
        <div className="px-4 pb-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 grid grid-cols-1 lg:grid-cols-6 gap-3 items-end">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1">Mes completo</label>
              <input className="w-full px-3 py-2 border rounded-lg" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Desde</label>
              <input className="w-full px-3 py-2 border rounded-lg" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Hasta</label>
              <input className="w-full px-3 py-2 border rounded-lg" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>

            <div className="lg:col-span-2">
              <button onClick={limpiarFiltros} className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700">
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>
      </div>



  {loading ? (
    <div className="bg-white border rounded-lg p-6 text-gray-600">Cargando...</div>
  ) : (
    <>
      {tab === 'lotes' && (
        <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1">Buscar</label>
              <input
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="Lote, SKU, pabellón..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Estado</label>
              <select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="TODOS">Todos</option>
                <option value="EN_SALA">EN_SALA</option>
                <option value="LAVADO_OK">LAVADO_OK</option>
                <option value="ENVIADO_A_CALIBRAR">ENVIADO_A_CALIBRAR</option>
                <option value="CERRADO">CERRADO</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">SKU sucio</label>
              <select value={fSku} onChange={(e) => setFSku(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="TODOS">Todos</option>
                {skuOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-600">
            Mostrando <span className="font-bold">{lotesFiltrados.length}</span> de {lotes.length} lotes.
          </div>
        </div>
      )}

      {tab === 'stock' ? (
        // =======================
        // TAB: STOCK
        // =======================
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold">Stock Sala L</h2>
            <div className="text-sm text-gray-600">
              Total: <span className="font-bold">{formatUds(kpis.stockTotalSalaL)}</span> uds
            </div>
          </div>

          <div className="p-4 overflow-x-auto">
            {stockOrdenado.length === 0 ? (
              <div className="text-gray-500">Sin stock registrado.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">
                      {headerBtn('SKU', 'skuCodigo', sortStockKey, sortStockDir, (k, d) => {
                        setSortStockKey(k)
                        setSortStockDir(d)
                      })}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">
                      {headerBtn('Nombre', 'skuNombre', sortStockKey, sortStockDir, (k, d) => {
                        setSortStockKey(k)
                        setSortStockDir(d)
                      })}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-600">
                      {headerBtn(
                        'Cantidad (uds)',
                        'cantidad',
                        sortStockKey,
                        sortStockDir,
                        (k, d) => {
                          setSortStockKey(k)
                          setSortStockDir(d)
                        },
                        'right',
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stockOrdenado.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2 font-semibold">{s.skuCodigo}</td>
                      <td className="px-3 py-2 text-gray-700">{s.skuNombre || '-'}</td>
                      <td className="px-3 py-2 text-right font-bold">
                        {formatUds(s.cantidad)} <span className="text-xs text-gray-600">{desglose180_30(s.cantidad)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : tab === 'cartola' ? (
        // =======================
        // TAB: CARTOLA (MOVIMIENTOS)
        // =======================
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold">Cartola Sala L</h2>
            <div className="text-sm text-gray-600">{movimientosSalaL.length} movimientos</div>
          </div>

          <div className="p-4 overflow-x-auto">
            {loadingMov ? (
              <div className="text-gray-600">Cargando movimientos...</div>
            ) : movimientosSalaL.length === 0 ? (
              <div className="text-gray-500">Sin movimientos para los filtros actuales.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">Fecha</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">SKU</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-600">Cantidad</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">Origen</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">Destino</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">Vale</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">Usuario</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {movimientosSalaL.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{(m.fecha || '-') + ' ' + (m.hora || '')}</td>
                      <td className="px-3 py-2">{m.tipo}</td>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">{m.skuCodigo}</td>
                      <td className="px-3 py-2 text-right font-bold">
                        {formatUds(m.cantidad)} <span className="text-xs text-gray-600">{desglose180_30(m.cantidad)}</span>
                      </td>
                      <td className="px-3 py-2">{m.origenNombre || '-'}</td>
                      <td className="px-3 py-2">{m.destinoNombre || '-'}</td>
                      <td className="px-3 py-2">{m.valeReferencia || '-'}</td>
                      <td className="px-3 py-2">{(m as any).usuarioNombre || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        // =======================
        // TAB: LOTES (default)
        // =======================
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold">Lotes</h2>
            <div className="text-xs text-gray-600">Conversión DES: 1 unidad = {GRAMOS_POR_UNIDAD} g</div>
          </div>

          <div className="p-4 overflow-x-auto">
            {lotesFiltrados.length === 0 ? (
              <div className="text-gray-500">Sin lotes para los filtros actuales.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">
                      {headerBtn('Lote', 'loteCodigo', sortLotesKey, sortLotesDir, (k, d) => {
                        setSortLotesKey(k)
                        setSortLotesDir(d)
                      })}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">
                      {headerBtn('Estado', 'estado', sortLotesKey, sortLotesDir, (k, d) => {
                        setSortLotesKey(k)
                        setSortLotesDir(d)
                      })}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">
                      {headerBtn('SKU', 'sku', sortLotesKey, sortLotesDir, (k, d) => {
                        setSortLotesKey(k)
                        setSortLotesDir(d)
                      })}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">
                      {headerBtn('Pabellón', 'pabellon', sortLotesKey, sortLotesDir, (k, d) => {
                        setSortLotesKey(k)
                        setSortLotesDir(d)
                      })}
                    </th>

                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-600">
                      {headerBtn(
                        'MAN',
                        'man',
                        sortLotesKey,
                        sortLotesDir,
                        (k, d) => {
                          setSortLotesKey(k)
                          setSortLotesDir(d)
                        },
                        'right',
                      )}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-600">
                      {headerBtn(
                        'SINCAL',
                        'sincal',
                        sortLotesKey,
                        sortLotesDir,
                        (k, d) => {
                          setSortLotesKey(k)
                          setSortLotesDir(d)
                        },
                        'right',
                      )}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-600">
                      {headerBtn(
                        'DES',
                        'des',
                        sortLotesKey,
                        sortLotesDir,
                        (k, d) => {
                          setSortLotesKey(k)
                          setSortLotesDir(d)
                        },
                        'right',
                      )}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-600">
                      {headerBtn(
                        'Dif',
                        'dif',
                        sortLotesKey,
                        sortLotesDir,
                        (k, d) => {
                          setSortLotesKey(k)
                          setSortLotesDir(d)
                        },
                        'right',
                      )}
                    </th>

                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">
                      {headerBtn('Ingreso Sala L', 'fecha', sortLotesKey, sortLotesDir, (k, d) => {
                        setSortLotesKey(k)
                        setSortLotesDir(d)
                      })}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">Usuario</th>

                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-600"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {lotesOrdenados.map((l) => {
                    const manU = n(l.ingreso?.totalUnidades)
                    const sincalU = n(l.lavado?.totalUnidades)
                    const desU = n(l.desechoUnidades) || udsDesdeKg(l.desechoKg)

                    const totalSalidas = sincalU + desU
                    const dif = totalSalidas - manU
                    const pctDif = manU > 0 ? (dif / manU) * 100 : 0

                    const pctS = l.porcentajeLavado ?? pct(sincalU, manU)
                    const pctD = l.porcentajeDesecho ?? pct(desU, manU)

                    const badge = badgeEstado(l.estado)

                    return (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-semibold whitespace-nowrap">{l.loteCodigo || l.id}</td>

                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded border text-xs font-bold ${badge.cls}`}>{badge.label}</span>
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="font-semibold">{l.skuCodigoSucio}</div>
                          <div className="text-xs text-gray-600">{l.skuNombreSucio || ''}</div>
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap">{l.pabellonNombre || '-'}</td>

                        <td className="px-3 py-2 text-right font-semibold">{formatUds(manU)}</td>

                        <td className="px-3 py-2 text-right">
                          <div className="font-semibold">{formatDetalleCBU(l.lavado)}</div>
                          <div className="text-xs text-gray-600">{pctS.toFixed(1)}%</div>
                        </td>

                        <td className="px-3 py-2 text-right">
                          <div className="font-semibold">
                            {formatKg(l.desechoKg)} kg <span className="text-gray-600">({formatUds(desU)} uds)</span>
                          </div>
                          <div className="text-xs text-gray-600">{pctD.toFixed(1)}%</div>
                        </td>

                        <td className="px-3 py-2 text-right">
                          <span className={`font-bold ${dif !== 0 ? 'text-amber-700' : 'text-green-700'}`}>
                            {formatUds(dif)} <span className="text-xs text-gray-600">({pctDif.toFixed(1)}%)</span>
                          </span>
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap">{(l.fechaIngresoSalaL || '-') + ' ' + (l.horaIngresoSalaL || '')}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{l.usuarioIngresoSalaLNombre || '-'}</td>

                        <td className="px-3 py-2 text-center">
                          <button className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700" onClick={() => abrirLote(l)}>
                            Ver / Acciones
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {selectedLote && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full overflow-hidden">
            <div className="p-4 border-b flex justify-between items-start gap-3">
              <div>
                <div className="font-bold text-lg">Lote {selectedLote.loteCodigo || selectedLote.id}</div>
                <div className="text-sm text-gray-600">
                  {selectedLote.skuCodigoSucio} · {selectedLote.pabellonNombre || 'Sin pabellón'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Ingreso Sala L: {(selectedLote.fechaIngresoSalaL || '-') + ' ' + (selectedLote.horaIngresoSalaL || '')} ·{' '}
                  {selectedLote.usuarioIngresoSalaLNombre || '-'}
                </div>
              </div>
              <button className="text-2xl font-bold text-gray-700 hover:text-gray-900" onClick={cerrarLote}>
                ×
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border rounded-lg p-3 bg-gray-50">
                <div className="text-xs text-gray-600 font-bold mb-2">Resumen (control)</div>

                {(() => {
                  const manU = n(selectedLote.ingreso?.totalUnidades)
                  const sincalU = n(selectedLote.lavado?.totalUnidades)
                  const desU = n(selectedLote.desechoUnidades) || udsDesdeKg(selectedLote.desechoKg)
                  const totalSalidas = sincalU + desU
                  const dif = totalSalidas - manU

                  const pctS = selectedLote.porcentajeLavado ?? pct(sincalU, manU)
                  const pctD = selectedLote.porcentajeDesecho ?? pct(desU, manU)

                  const badge = badgeEstado(selectedLote.estado)

                  return (
                    <div className="space-y-2">
                      <div>
                        <span className={`inline-flex items-center px-2 py-1 rounded border text-xs font-bold ${badge.cls}`}>{badge.label}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-white border rounded p-2">
                          <div className="text-xs text-gray-600 font-semibold">MAN (ingreso)</div>
                          <div className="font-bold">{formatUds(manU)} uds</div>
                        </div>

                        {/* OK mostrar DIF histórico (ya guardado) */}
                        <div className="bg-white border rounded p-2">
                          <div className="text-xs text-gray-600 font-semibold">Dif (SINCAL+DES - MAN)</div>
                          <div className={`font-bold ${dif !== 0 ? 'text-amber-700' : 'text-green-700'}`}>{formatUds(dif)} uds</div>
                        </div>

                        <div className="bg-white border rounded p-2">
                          <div className="text-xs text-gray-600 font-semibold">SINCAL</div>
                          <div className="font-bold">{formatDetalleCBU(selectedLote.lavado)} uds</div>
                          <div className="text-xs text-gray-600">{pctS.toFixed(1)}%</div>
                        </div>

                        <div className="bg-white border rounded p-2">
                          <div className="text-xs text-gray-600 font-semibold">DES Sala L</div>
                          <div className="font-bold">
                            {formatKg(selectedLote.desechoKg)} kg <span className="text-gray-600">({formatUds(desU)} uds)</span>
                          </div>
                          <div className="text-xs text-gray-600">{pctD.toFixed(1)}%</div>
                        </div>
                      </div>

                      <div className="text-xs text-gray-600">
                        Nota: SINCAL + DES ≈ MAN es una orientación; por eso se muestra diferencia y % (no se bloquea por no cuadrar).
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="border rounded-lg p-3">
                <div className="text-xs text-gray-600 font-bold mb-2">Acciones</div>

                {!loteEditable && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-900 mb-3">
                    Este lote ya fue confirmado. No es editable.
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900 mb-3">
                  Orientación: MAN = SINCAL + DES (Sala L). No se fuerza cuadratura; se guarda % y diferencia para control.
                  <div className="text-xs text-blue-900 mt-1">Conversión DES: 1 unidad = {GRAMOS_POR_UNIDAD} g.</div>
                  <div className="text-xs text-blue-900 mt-1">
                    Conversión SINCAL: 1 caja = {UNIDADES_POR_CAJA} uds; 1 bandeja = {UNIDADES_POR_BANDEJA} uds.
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">SINCAL Cajas</label>
                    <input
                      className="w-full px-3 py-2 border rounded-lg"
                      type="number"
                      value={lavC}
                      onChange={(e) => setLavC(n(e.target.value))}
                      disabled={!loteEditable || actionLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">SINCAL Bandejas</label>
                    <input
                      className="w-full px-3 py-2 border rounded-lg"
                      type="number"
                      value={lavB}
                      onChange={(e) => setLavB(n(e.target.value))}
                      disabled={!loteEditable || actionLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">SINCAL Unidades</label>
                    <input
                      className="w-full px-3 py-2 border rounded-lg"
                      type="number"
                      value={lavU}
                      onChange={(e) => setLavU(n(e.target.value))}
                      disabled={!loteEditable || actionLoading}
                    />
                  </div>
                </div>

                <div className="text-xs text-gray-700 mb-3">
                  Total SINCAL a registrar: <span className="font-bold">{formatUds(sincalUdsInput)} uds</span>{' '}
                  <span className="text-gray-500">{desglose180_30(sincalUdsInput)}</span>
                  {' · '}
                  SKU destino: <span className="font-bold">{inferSkuSincalDesdeSucio(selectedLote.skuCodigoSucio)}</span>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Desecho Sala L (kg)</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg"
                    type="number"
                    value={desKg}
                    onChange={(e) => setDesKg(n(e.target.value))}
                    disabled={!loteEditable || actionLoading}
                  />
                  <div className="text-xs text-gray-600 mt-1">
                    Equivale a: <span className="font-bold">{formatUds(desechoUdsInput)} uds</span> (SKU DES)
                  </div>
                </div>

                {/* FIX: NO calcular/mostrar DIF en esta ventana (antes de confirmar). Solo % */}
                {(() => {
                  const manU = n(selectedLote.ingreso?.totalUnidades)
                  const pctS = pct(sincalUdsInput, manU)
                  const pctD = pct(desechoUdsInput, manU)

                  return (
                    <div className="text-xs text-gray-700 mb-3 space-y-1">
                      <div>
                        MAN: <span className="font-bold">{formatUds(manU)}</span>
                      </div>
                      <div>
                        % SINCAL vs MAN: <span className="font-bold">{pctS.toFixed(1)}%</span> · % DES vs MAN:{' '}
                        <span className="font-bold">{pctD.toFixed(1)}%</span>
                      </div>
                    </div>
                  )
                })()}

                {actionError && <div className="text-sm text-red-700 font-bold mb-2">{actionError}</div>}

                <button
                  className={`w-full px-4 py-2 rounded-lg font-bold text-white ${
                    actionLoading || !loteEditable ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                  }`}
                  disabled={actionLoading || !loteEditable}
                  onClick={confirmarSalaL}
                >
                  {actionLoading ? 'Guardando...' : 'Confirmar Sala L (SINCAL + DES)'}
                </button>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button className="px-4 py-2 bg-gray-200 rounded font-semibold" onClick={cerrarLote} disabled={actionLoading}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )}
</div>
)
}
