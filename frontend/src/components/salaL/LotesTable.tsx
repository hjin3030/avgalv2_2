// frontend/src/components/salaL/LotesTable.tsx

import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import LoteAccionesModal from '@/components/salaL/LoteAccionesModal'

type Lote = {
  id: string
  loteCodigo: string
  estado: string
  skuCodigoSucio: string
  skuNombreSucio: string
  pabellonNombre?: string | null

  ingreso?: { cajas?: number; bandejas?: number; unidades?: number; totalUnidades?: number }
  lavadoTotalUnidades?: number
  desechoKg?: number

  fechaIngresoSalaL?: string
  horaIngresoSalaL?: string
  usuarioIngresoSalaLNombre?: string
}

function fmtCantidadConDesglose(total: number, d?: { cajas?: number; bandejas?: number; unidades?: number }) {
  const cajas = Number(d?.cajas ?? 0)
  const bandejas = Number(d?.bandejas ?? 0)
  const unidades = Number(d?.unidades ?? 0)

  const partes: string[] = []
  if (cajas) partes.push(`${cajas}C`)
  if (bandejas) partes.push(`${bandejas}B`)
  if (unidades) partes.push(`${unidades}U`)

  return partes.length ? `${total} (${partes.join(', ')})` : String(total)
}

export default function LotesTable() {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Lote | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'lotesLimpieza'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Lote[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        setLotes(rows)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [])

  const rows = useMemo(() => lotes, [lotes])

  if (loading) return <div className="p-4">Cargando lotes...</div>

  return (
    <div className="p-4">
      <div className="text-xl font-bold mb-3">Lotes</div>

      <div className="overflow-x-auto bg-white rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left px-4 py-3">Lote</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">SKU</th>
              <th className="text-left px-4 py-3">Pabellón</th>

              <th className="text-right px-4 py-3">Ingreso</th>
              <th className="text-right px-4 py-3">Lavado</th>
              <th className="text-right px-4 py-3">Desecho (kg)</th>

              <th className="text-left px-4 py-3">Ingreso Sala L (F/H)</th>
              <th className="text-left px-4 py-3">Usuario</th>

              <th className="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((l) => {
              const ingresoTotal = Number(l.ingreso?.totalUnidades ?? 0)
              const lavado = Number(l.lavadoTotalUnidades ?? 0)
              const desechoKg = Number(l.desechoKg ?? 0)

              return (
                <tr key={l.id} className="border-t">
                  <td className="px-4 py-3 font-semibold">{l.loteCodigo}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded bg-amber-100 text-amber-800">{l.estado}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{l.skuCodigoSucio}</div>
                    <div className="text-xs text-gray-500">{l.skuNombreSucio}</div>
                  </td>
                  <td className="px-4 py-3">{l.pabellonNombre || '-'}</td>

                  <td className="px-4 py-3 text-right">{fmtCantidadConDesglose(ingresoTotal, l.ingreso)}</td>
                  <td className="px-4 py-3 text-right">{lavado}</td>
                  <td className="px-4 py-3 text-right">{desechoKg}</td>

                  <td className="px-4 py-3">
                    {(l.fechaIngresoSalaL || '-') + ' ' + (l.horaIngresoSalaL || '')}
                  </td>
                  <td className="px-4 py-3">{l.usuarioIngresoSalaLNombre || '-'}</td>

                  <td className="px-4 py-3 text-right">
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
                      onClick={() => {
                        setSelected(l)
                        setOpen(true)
                      }}
                    >
                      Ver / Acciones
                    </button>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={10}>
                  No hay lotes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <LoteAccionesModal
          isOpen={open}
          onClose={() => setOpen(false)}
          onSaved={() => {
            // no hace falta refetch manual porque onSnapshot
          }}
          lote={selected}
        />
      )}
    </div>
  )
}
