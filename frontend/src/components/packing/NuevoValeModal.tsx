// frontend/src/components/packing/NuevoValeModal.tsx

import { useState, useMemo } from 'react'
import { useSkus } from '@/hooks/useSkus'
import { usePabellones } from '@/hooks/usePabellones'
import { crearVale } from '@/utils/valeHelpers'
import { useAuth } from '@/hooks/useAuth'

interface NuevoValeModalProps {
  isOpen: boolean
  onClose: () => void
  onValeCreated?: () => void
}

interface ProductoTemporal {
  sku: string
  skuNombre: string
  cajas: number
  bandejas: number
  unidades: number
  totalUnidades: number
}

export default function NuevoValeModal({ isOpen, onClose, onValeCreated }: NuevoValeModalProps) {
  const { profile } = useAuth()
  const { skus } = useSkus()
  const { pabellones } = usePabellones()

  const [paso, setPaso] = useState(1)
  const [pabellonId, setPabellonId] = useState('')
  const [comentario, setComentario] = useState('')
  const [productos, setProductos] = useState<ProductoTemporal[]>([])

  const [skuSeleccionado, setSkuSeleccionado] = useState('')
  const [cajas, setCajas] = useState(0)
  const [bandejas, setBandejas] = useState(0)
  const [unidades, setUnidades] = useState(0)
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null)

  const [creando, setCreando] = useState(false)

  const skusActivos = useMemo(() => skus.filter(s => s.activo === true), [skus])
  const pabellonesActivos = useMemo(() => pabellones.filter(p => p.activo === true), [pabellones])

  const skuData = useMemo(() => skusActivos.find((s) => s.codigo === skuSeleccionado), [skuSeleccionado, skusActivos])

  const totalUnidadesProducto = useMemo(() => {
    if (!skuData) return 0
    return cajas * skuData.unidadesPorCaja + bandejas * skuData.unidadesPorBandeja + unidades
  }, [cajas, bandejas, unidades, skuData])

  const totalesVale = useMemo(() => {
    const totalUnidades = productos.reduce((sum, p) => sum + p.totalUnidades, 0)

    let cajasTotal = 0
    let bandejasTotal = 0
    let unidadesTotal = 0

    productos.forEach((p) => {
      cajasTotal += p.cajas
      bandejasTotal += p.bandejas
      unidadesTotal += p.unidades
    })

    return {
      totalUnidades,
      cajas: cajasTotal,
      bandejas: bandejasTotal,
      unidades: unidadesTotal
    }
  }, [productos])

  const pabellonNombre = useMemo(() => {
    return pabellonesActivos.find((p) => p.id === pabellonId)?.nombre || '—'
  }, [pabellonId, pabellonesActivos])

  const fechaHoraActual = useMemo(() => {
    const ahora = new Date()
    return {
      fecha: ahora.toLocaleDateString('es-CL'),
      hora: ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    }
  }, [])

  const handleAgregarProducto = () => {
    if (!skuSeleccionado || totalUnidadesProducto === 0) {
      alert('Debes seleccionar un SKU y agregar cantidades válidas')
      return
    }

    const skuObj = skusActivos.find((s) => s.codigo === skuSeleccionado)
    if (!skuObj) return

    const nuevoProducto: ProductoTemporal = {
      sku: skuSeleccionado,
      skuNombre: skuObj.nombre,
      cajas,
      bandejas,
      unidades,
      totalUnidades: totalUnidadesProducto
    }

    if (editandoIndex !== null) {
      const nuevosProductos = [...productos]
      nuevosProductos[editandoIndex] = nuevoProducto
      setProductos(nuevosProductos)
      setEditandoIndex(null)
    } else {
      setProductos([...productos, nuevoProducto])
    }

    setSkuSeleccionado('')
    setCajas(0)
    setBandejas(0)
    setUnidades(0)
  }

  const handleEditarProducto = (index: number) => {
    const producto = productos[index]
    setSkuSeleccionado(producto.sku)
    setCajas(producto.cajas)
    setBandejas(producto.bandejas)
    setUnidades(producto.unidades)
    setEditandoIndex(index)
  }

  const handleEliminarProducto = (index: number) => {
    setProductos(productos.filter((_, i) => i !== index))
  }

  const handleCancelarEdicion = () => {
    setSkuSeleccionado('')
    setCajas(0)
    setBandejas(0)
    setUnidades(0)
    setEditandoIndex(null)
  }

  const handleCerrar = () => {
    setPaso(1)
    setPabellonId('')
    setComentario('')
    setProductos([])
    setSkuSeleccionado('')
    setCajas(0)
    setBandejas(0)
    setUnidades(0)
    setEditandoIndex(null)
    onClose()
  }

  const handleConfirmar = async () => {
    if (!profile || !pabellonId || productos.length === 0) {
      alert('Datos incompletos')
      return
    }

    setCreando(true)

    try {
      await crearVale({
        tipo: 'ingreso',
        origenId: pabellonId,
        origenNombre: pabellonNombre,
        destinoId: 'bodega',
        destinoNombre: 'Bodega',
        detalles: productos,
        comentario: comentario.trim() || undefined,
        usuarioCreadorId: profile.uid,
        usuarioCreadorNombre: profile.nombre
      })

      alert('✅ Vale creado exitosamente')
      if (onValeCreated) onValeCreated()
      handleCerrar()
    } catch (error: any) {
      console.error('Error al crear vale:', error)
      alert(`❌ Error: ${error.message || 'No se pudo crear el vale'}`)
    } finally {
      setCreando(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 my-8">
        <div className="bg-green-50 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-green-900">📥 Nuevo Vale de Ingreso</h2>
              <p className="text-sm mt-1 text-green-700">→ Bodega - Paso {paso} de 3</p>
            </div>
            <button
              onClick={handleCerrar}
              className="text-2xl text-gray-600 hover:text-gray-800"
            >
              ✕
            </button>
          </div>
        </div>

        {paso === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); setPaso(2) }} className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <h3 className="font-bold text-gray-700">📋 Información del Vale</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                  <input
                    type="text"
                    value={fechaHoraActual.fecha}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hora</label>
                  <input
                    type="text"
                    value={fechaHoraActual.hora}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Vale</label>
                <input
                  type="text"
                  value="Ingreso"
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Origen</label>
                <input
                  type="text"
                  value="Packing"
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Destino</label>
                <input
                  type="text"
                  value="Bodega"
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pabellón *</label>
                <select
                  value={pabellonId}
                  onChange={(e) => setPabellonId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Seleccionar pabellón...</option>
                  {pabellonesActivos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comentario (opcional)</label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Observaciones sobre el ingreso..."
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handleCerrar}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!pabellonId}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Siguiente →
              </button>
            </div>
          </form>
        )}

        {paso === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); setPaso(3) }} className="space-y-6">
            <div style={{ backgroundColor: '#e8f5e9', padding: '16px', borderRadius: '8px', border: '2px solid #4caf50' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '8px' }}>
                {totalesVale.totalUnidades.toLocaleString()} U
              </div>
              <div style={{ fontSize: '14px', color: '#555' }}>
                {totalesVale.cajas}C, {totalesVale.bandejas}B, {totalesVale.unidades}U
              </div>
            </div>

            {productos.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold text-gray-700">📦 Productos agregados al vale</h3>
                {productos.map((prod, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        {prod.sku} - {prod.skuNombre}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                        {prod.totalUnidades.toLocaleString()} U ({prod.cajas}C, {prod.bandejas}B, {prod.unidades}U)
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditarProducto(index)}
                        className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminarProducto(index)}
                        className="text-sm px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <h3 className="font-bold text-gray-700">
                {editandoIndex !== null ? '✏️ Editando Producto' : '➕ Agregar Producto'}
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
                <select
                  value={skuSeleccionado}
                  onChange={(e) => setSkuSeleccionado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Seleccionar SKU...</option>
                  {skusActivos.map((s) => (
                    <option key={s.id} value={s.codigo}>
                      {s.codigo} - {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cajas</label>
                  <input
                    type="number"
                    min="0"
                    value={cajas}
                    onChange={(e) => setCajas(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bandejas</label>
                  <input
                    type="number"
                    min="0"
                    value={bandejas}
                    onChange={(e) => setBandejas(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unidades</label>
                  <input
                    type="number"
                    min="0"
                    value={unidades}
                    onChange={(e) => setUnidades(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="text-sm text-gray-600">
                Total a agregar: <strong>{totalUnidadesProducto.toLocaleString()} unidades</strong>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAgregarProducto}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {editandoIndex !== null ? 'Actualizar' : 'Agregar'}
                </button>
                {editandoIndex !== null && (
                  <button
                    type="button"
                    onClick={handleCancelarEdicion}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Atrás
              </button>
              <button
                type="submit"
                disabled={productos.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Siguiente →
              </button>
            </div>
          </form>
        )}

        {paso === 3 && (
          <div className="space-y-6">
            <div className="p-6 bg-gray-50 rounded-lg space-y-5">
              <h3 className="font-bold text-gray-700 text-xl mb-4">📋 Resumen del Vale</h3>

              <div className="grid grid-cols-2 gap-6 text-base">
                <div>
                  <strong className="text-gray-700">Fecha</strong>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{fechaHoraActual.fecha}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Hora</strong>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{fechaHoraActual.hora}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Origen</strong>
                  <p className="mt-1 text-lg font-semibold text-gray-900">Packing - {pabellonNombre}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Destino</strong>
                  <p className="mt-1 text-lg font-semibold text-gray-900">Bodega</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <strong className="text-gray-700">Total del Vale</strong>
                <div className="text-3xl font-bold text-green-700 mt-2">
                  {totalesVale.totalUnidades.toLocaleString()} U
                </div>
                <div className="text-base text-gray-600 mt-1">
                  ({totalesVale.cajas}C, {totalesVale.bandejas}B, {totalesVale.unidades}U)
                </div>
              </div>

              <div>
                <strong className="text-gray-700">{productos.length} producto{productos.length !== 1 ? 's' : ''}</strong>
              </div>

              {comentario && (
                <div className="border-t pt-4">
                  <strong className="text-gray-700">Comentario</strong>
                  <p className="mt-1 text-base text-gray-600">{comentario}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-2 border-gray-200 rounded-lg space-y-3">
              <h3 className="font-bold text-gray-700 text-lg">📦 Productos del Vale</h3>
              {productos.map((prod, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="font-bold text-lg text-gray-900">
                    {prod.sku} - {prod.skuNombre}
                  </div>
                  <div className="text-base text-gray-600 mt-2 font-semibold">
                    {prod.totalUnidades.toLocaleString()} U ({prod.cajas}C, {prod.bandejas}B, {prod.unidades}U)
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Importante:</strong> Este vale quedará en estado <strong>"pendiente"</strong> hasta que sea validado por bodega. 
                El stock NO se sumará hasta que se valide.
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPaso(2)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  ← Atrás
                </button>
                <button
                  type="button"
                  onClick={handleCerrar}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancelar
                </button>
              </div>
              <button
                type="button"
                onClick={handleConfirmar}
                disabled={creando}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold"
              >
                {creando ? 'Creando...' : '✅ Confirmar Vale'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
