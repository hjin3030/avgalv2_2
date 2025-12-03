import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// Si tienes los tipos definidos en tu proyecto, reemplaza 'any' por tus tipos reales.
type StockItem = {
  id: string
  skuCodigo: string
  skuNombre: string
}

type Movimiento = {
  skuCodigo: string
  tipo: string // 'ingreso' | 'reingreso' | 'egreso'
  cantidad: number
  fecha: string
}

interface Props {
  stock: StockItem[]
  movimientos: Movimiento[]
}

export default function MovimientosSkuBarChart({ stock, movimientos }: Props) {
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [selectedSkus, setSelectedSkus] = useState<string[]>([])
  const [showIngreso, setShowIngreso] = useState(true)
  const [showEgreso, setShowEgreso] = useState(true)
  const [showTotal, setShowTotal] = useState(true)

  // Filtrado por fecha
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter(m => {
      if (fechaDesde && m.fecha < fechaDesde) return false
      if (fechaHasta && m.fecha > fechaHasta) return false
      return true
    })
  }, [movimientos, fechaDesde, fechaHasta])

  // Data agrupada por SKU
  const barData = useMemo(() => {
    const skusParaMostrar = selectedSkus.length > 0
      ? stock.filter(s => selectedSkus.includes(s.skuCodigo))
      : stock
    return skusParaMostrar.map(sku => {
      const movSku = movimientosFiltrados.filter(m => m.skuCodigo === sku.skuCodigo)
      const ingreso = movSku
        .filter(m => m.tipo === 'ingreso' || m.tipo === 'reingreso')
        .reduce((sum, m) => sum + m.cantidad, 0)
      const egreso = movSku
        .filter(m => m.tipo === 'egreso')
        .reduce((sum, m) => sum + m.cantidad, 0)
      return {
        id: `${sku.id}-${sku.skuCodigo}`,
        sku: sku.skuCodigo,
        nombre: sku.skuNombre,
        ingreso,
        egreso,
        total: ingreso - egreso
      }
    })
  }, [movimientosFiltrados, stock, selectedSkus])

  return (
    <div className="mb-8 bg-white shadow-sm border border-gray-200 p-6 rounded-lg">
      <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
        <div className="flex items-center gap-2">
          <label>Fecha desde:</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
            className="border px-2 py-1 rounded text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <label>Fecha hasta:</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
            className="border px-2 py-1 rounded text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <label className="font-bold text-sm mr-2">SKUs:</label>
          <select
            multiple
            value={selectedSkus}
            onChange={e => setSelectedSkus(Array.from(e.target.selectedOptions).map(opt => opt.value))}
            className="h-9 rounded border border-gray-300 px-2 text-xs"
            style={{ minWidth: 120 }}
          >
            {stock.map(s => (
              <option value={s.skuCodigo} key={`${s.id}-${s.skuCodigo}`}>
                {s.skuCodigo} - {s.skuNombre}
              </option>
            ))}
          </select>
          <button
            className="text-xs px-3 py-1 rounded bg-gray-200"
            onClick={() => setSelectedSkus([])}
          >
            Limpiar selección
          </button>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <label><input type="checkbox" checked={showIngreso} onChange={e => setShowIngreso(e.target.checked)} /> Ingreso</label>
          <label><input type="checkbox" checked={showEgreso} onChange={e => setShowEgreso(e.target.checked)} /> Egreso</label>
          <label><input type="checkbox" checked={showTotal} onChange={e => setShowTotal(e.target.checked)} /> Total</label>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={barData}>
          <XAxis dataKey="sku" interval={0} angle={-30} textAnchor="end" height={70} />
          <YAxis />
          <Tooltip formatter={v => Number(v).toLocaleString('es-CL')} />
          <Legend />
          {showIngreso && (
            <Bar dataKey="ingreso" name="Ingreso/Reingreso" fill="#1d4ed8" />
          )}
          {showEgreso && (
            <Bar dataKey="egreso" name="Egreso" fill="#f59e42" />
          )}
          {showTotal && (
            <Bar dataKey="total" name="Total Stock Neto" fill="#16a34a" />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
