import { useState, useMemo } from 'react'
import { useSkus } from '@/hooks/useSkus'
import { useDestinos } from '@/hooks/useDestinos'
import { useOrigenes } from '@/hooks/useOrigenes'
import { useTransportistas } from '@/hooks/useTransportistas'
import { crearVale } from '@/utils/valeHelpers'
import { useAuth } from '@/hooks/useAuth'

type TipoVale = 'egreso' | 'reingreso'

interface CrearValeModalProps {
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

export default function CrearValeModal({ isOpen, onClose, onValeCreated }: CrearValeModalProps) {
  const { profile } = useAuth()
  const { skus } = useSkus()
  const { destinos } = useDestinos()
  const { origenes } = useOrigenes()
  const { transportistas } = useTransportistas()

  const [tipoVale, setTipoVale] = useState<TipoVale | null>(null)
  const [paso, setPaso] = useState(1)
  const [destinoId, setDestinoId] = useState('')
  const [origenId, setOrigenId] = useState('')
  const [transportistaId, setTransportistaId] = useState('')
  const [guiaDespacho, setGuiaDespacho] = useState('')
  const [comentario, setComentario] = useState('')

  const [productos, setProductos] = useState<ProductoTemporal[]>([])
  const [skuSeleccionado, setSkuSeleccionado] = useState('')
  const [cajas, setCajas] = useState(0)
  const [bandejas, setBandejas] = useState(0)
  const [unidades, setUnidades] = useState(0)
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null)
  const [creando, setCreando] = useState(false)

  const skusActivos = useMemo(() => skus.filter(s => s.activo), [skus])
  const destinosActivos = useMemo(() => destinos.filter(d => d.activo && d.nombre.toLowerCase() !== 'bodega'), [destinos])
  const origenesActivos = useMemo(() => origenes.filter(o => o.activo), [origenes])
  const transportistasActivos = useMemo(() => transportistas.filter(t => t.activo), [transportistas])

  const skuData = useMemo(() => skusActivos.find((s) => s.id === skuSeleccionado), [skuSeleccionado, skusActivos])
  const totalUnidadesProducto = useMemo(() => {
    if (!skuData) return 0
    return cajas * skuData.unidadesPorCaja + bandejas * skuData.unidadesPorBandeja + unidades
  }, [cajas, bandejas, unidades, skuData])

  const totalesVale = useMemo(() => {
    const totalUnidades = productos.reduce((sum, p) => sum + p.totalUnidades, 0)
    let cajasTotal = 0, bandejasTotal = 0, unidadesTotal = 0
    productos.forEach((p) => {
      cajasTotal += p.cajas
      bandejasTotal += p.bandejas
      unidadesTotal += p.unidades
    })
    return {
      totalUnidades,
      cajas: cajasTotal,
      bandejas: bandejasTotal,
      unidades: unidadesTotal,
    }
  }, [productos])

  const destinoNombre = useMemo(() => destinos.find(d => d.id === destinoId)?.nombre || 'Bodega', [destinoId, destinos])
  const origenNombre = useMemo(() => origenes.find(o => o.id === origenId)?.nombre || 'Bodega', [origenId, origenes])

  const fechaHoraActual = useMemo(() => {
    const ahora = new Date()
    return {
      fecha: ahora.toLocaleDateString('es-CL'),
      hora: ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    }
  }, [])

  // --- PRODUCTOS
  const handleAgregarProducto = () => {
    if (!skuSeleccionado || totalUnidadesProducto === 0) {
      alert('Debes seleccionar un SKU y agregar cantidades válidas')
      return
    }
    const skuObj = skusActivos.find(s => s.id === skuSeleccionado)
    if (!skuObj) return
    const nuevoProducto: ProductoTemporal = {
      sku: skuSeleccionado,
      skuNombre: skuObj.nombre,
      cajas,
      bandejas,
      unidades,
      totalUnidades: totalUnidadesProducto,
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
    setTipoVale(null)
    setPaso(1)
    setDestinoId('')
    setOrigenId('')
    setTransportistaId('')
    setGuiaDespacho('')
    setComentario('')
    setProductos([])
    setSkuSeleccionado('')
    setCajas(0)
    setBandejas(0)
    setUnidades(0)
    setEditandoIndex(null)
    onClose()
  }

  // --- CONFIRMAR
  const handleConfirmar = async () => {
    if (!profile || productos.length === 0 || !tipoVale) {
      alert('Datos incompletos')
      return
    }
    // Validación de selección
    if (tipoVale === 'egreso' && !destinoId) {
      alert('Debes seleccionar un destino')
      return
    }
    if (tipoVale === 'reingreso' && !origenId) {
      alert('Debes seleccionar un origen')
      return
    }
    setCreando(true)
    try {
      // Ahora siempre seteamos todos los campos requeridos
      const params: any = {
        tipo: tipoVale,
        detalles: productos,
        comentario,
        usuarioCreadorId: profile.uid,
        usuarioCreadorNombre: profile.nombre,
        // SIEMPRE presentes
        origenId: tipoVale === 'egreso' ? 'bodega' : origenId,
        origenNombre: tipoVale === 'egreso' ? 'Bodega' : origenNombre,
        destinoId: tipoVale === 'egreso' ? destinoId : 'bodega',
        destinoNombre: tipoVale === 'egreso' ? destinoNombre : 'Bodega',
      }
      if (tipoVale === 'egreso' && transportistaId) {
        params.transportistaId = transportistaId
        params.transportistaNombre = transportistasActivos.find((t) => t.id === transportistaId)?.nombre
      }
      if (tipoVale === 'egreso' && guiaDespacho) {
        params.guiaDespacho = guiaDespacho
      }
      await crearVale(params)
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

  if (!tipoVale) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">📋 Crear Nuevo Vale</h2>
          <p className="text-gray-600 mb-6">Selecciona el tipo de vale que deseas crear:</p>
          <div className="space-y-4">
            <button
              onClick={() => setTipoVale('egreso')}
              className="w-full p-6 border-2 border-red-300 rounded-lg hover:bg-red-50 transition-colors text-left"
            >
              <div className="text-2xl mb-2">📤</div>
              <div className="font-bold text-lg text-red-900">Egreso</div>
              <div className="text-sm text-gray-600 mt-1">Salida de mercadería desde bodega a clientes/destinos</div>
              <div className="text-xs text-red-700 mt-2">✓ Resta del stock inmediatamente</div>
            </button>
            <button
              onClick={() => setTipoVale('reingreso')}
              className="w-full p-6 border-2 border-cyan-300 rounded-lg hover:bg-cyan-50 transition-colors text-left"
            >
              <div className="text-2xl mb-2">🔄</div>
              <div className="font-bold text-lg text-cyan-900">Reingreso</div>
              <div className="text-sm text-gray-600 mt-1">Devolución de mercadería desde vendedores/rutas</div>
              <div className="text-xs text-cyan-700 mt-2">✓ Suma al stock inmediatamente</div>
            </button>
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={handleCerrar} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getTituloColor = () => (tipoVale === 'egreso' ? 'bg-red-50 text-red-900' : 'bg-cyan-50 text-cyan-900')
  const getIcono = () => (tipoVale === 'egreso' ? '📤' : '🔄')
  const getTitulo = () => (tipoVale === 'egreso' ? 'Vale de Egreso' : 'Vale de Reingreso')
  const getOrigenDestino = () => (tipoVale === 'egreso' ? `Bodega → ${destinoNombre}` : `${origenNombre} → Bodega`)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 my-8">
        <div className={`${getTituloColor()} px-4 py-3 rounded-lg mb-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{getIcono()} {getTitulo()}</h2>
              <p className="text-sm mt-1">{getOrigenDestino()} - Paso {paso} de 3</p>
            </div>
            <button onClick={() => setTipoVale(null)} className="text-sm text-gray-600 hover:text-gray-800 underline">
              ← Cambiar tipo
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
                  <input type="text" value={fechaHoraActual.fecha} disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hora</label>
                  <input type="text" value={fechaHoraActual.hora} disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg" />
                </div>
              </div>

              {tipoVale === 'egreso' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Destino (Cliente) *</label>
                    <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                      <option value="">Seleccionar destino...</option>
                      {destinosActivos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Transportista (opcional)</label>
                    <select value={transportistaId} onChange={(e) => setTransportistaId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="">Sin transportista</option>
                      {transportistasActivos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Guía de Despacho (opcional)</label>
                    <input type="text" value={guiaDespacho} onChange={(e) => setGuiaDespacho(e.target.value)} placeholder="Número de guía..." className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Origen (Vendedor/Ruta) *</label>
                    <select value={origenId} onChange={(e) => setOrigenId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                      <option value="">Seleccionar origen...</option>
                      {origenesActivos.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Destino</label>
                    <input type="text" value="Bodega" disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones (opcional)</label>
                <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Información adicional..." />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button type="button" onClick={handleCerrar} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Cancelar</button>
              <button type="submit" disabled={tipoVale === 'egreso' ? !destinoId : !origenId} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Siguiente →</button>
            </div>
          </form>
        )}

        {paso === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); setPaso(3) }} className="space-y-6">
            <div style={{ backgroundColor: '#e8f5e9', padding: 16, borderRadius: 8, border: '2px solid #4caf50' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#2e7d32', marginBottom: 8 }}>{totalesVale.totalUnidades.toLocaleString()} U</div>
              <div style={{ fontSize: 14, color: '#555' }}>{totalesVale.cajas}C, {totalesVale.bandejas}B, {totalesVale.unidades}U</div>
            </div>

            {productos.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold text-gray-700">📦 Productos agregados al vale</h3>
                {productos.map((prod, index) => (
                  <div key={index} style={{ padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{prod.sku} - {prod.skuNombre}</div>
                      <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                        {prod.totalUnidades.toLocaleString()} U ({prod.cajas}C, {prod.bandejas}B, {prod.unidades}U)
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleEditarProducto(index)} className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">✏️ Editar</button>
                      <button type="button" onClick={() => handleEliminarProducto(index)} className="text-sm px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <h3 className="font-bold text-gray-700">{editandoIndex !== null ? '✏️ Editando Producto' : '➕ Agregar Producto'}</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
                <select value={skuSeleccionado} onChange={(e) => setSkuSeleccionado(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">Seleccionar SKU...</option>
                  {skusActivos.map(s => (
                    <option key={s.id} value={s.id}>{s.codigo} - {s.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cajas</label>
                  <input type="number" min="0" value={cajas} onChange={e => setCajas(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bandejas</label>
                  <input type="number" min="0" value={bandejas} onChange={e => setBandejas(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unidades</label>
                  <input type="number" min="0" value={unidades} onChange={e => setUnidades(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div className="text-sm text-gray-600">
                Total a agregar: <strong>{totalUnidadesProducto.toLocaleString()} unidades</strong>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={handleAgregarProducto} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  {editandoIndex !== null ? 'Actualizar' : 'Agregar'}
                </button>
                {editandoIndex !== null && (
                  <button type="button" onClick={handleCancelarEdicion} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button type="button" onClick={() => setPaso(1)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                ← Atrás
              </button>
              <button type="submit" disabled={productos.length === 0} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Siguiente →
              </button>
            </div>
          </form>
        )}

        {paso === 3 && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <h3 className="font-bold text-gray-700 text-lg">📋 Resumen del Vale</h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Fecha</strong>
                  <p className="mt-1">{fechaHoraActual.fecha}</p>
                </div>
                <div>
                  <strong>Hora</strong>
                  <p className="mt-1">{fechaHoraActual.hora}</p>
                </div>
                <div>
                  <strong>Origen</strong>
                  <p className="mt-1">{tipoVale === 'egreso' ? 'Bodega' : origenNombre}</p>
                </div>
                <div>
                  <strong>Destino</strong>
                  <p className="mt-1">{tipoVale === 'egreso' ? destinoNombre : 'Bodega'}</p>
                </div>
              </div>

              <div>
                <strong>Total del Vale</strong>
                <div className="text-2xl font-bold text-green-700 mt-1">{totalesVale.totalUnidades.toLocaleString()} U</div>
                <div className="text-sm text-gray-600">({totalesVale.cajas}C, {totalesVale.bandejas}B, {totalesVale.unidades}U)</div>
              </div>

              <div>
                <strong>{productos.length} producto{productos.length !== 1 ? 's' : ''}</strong>
              </div>

              {transportistaId && tipoVale === 'egreso' && (
                <div>
                  <strong>Transportista</strong>
                  <p className="mt-1">{transportistasActivos.find((t) => t.id === transportistaId)?.nombre}</p>
                </div>
              )}

              {guiaDespacho && tipoVale === 'egreso' && (
                <div>
                  <strong>Guía de Despacho</strong>
                  <p className="mt-1">{guiaDespacho}</p>
                </div>
              )}

              {comentario && (
                <div>
                  <strong>Observaciones</strong>
                  <p className="mt-1 text-sm text-gray-600">{comentario}</p>
                </div>
              )}
            </div>

            <div className={`p-4 border rounded-lg ${tipoVale === 'egreso' ? 'bg-red-50 border-red-200' : 'bg-cyan-50 border-cyan-200'}`}>
              <p className={`text-sm ${tipoVale === 'egreso' ? 'text-red-800' : 'text-cyan-800'}`}>
                ⚠️ <strong>Importante:</strong> Este vale {tipoVale === 'egreso' ? 'restará' : 'sumará'} el stock <strong>inmediatamente</strong> al confirmarlo.
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <div className="flex gap-3">
                <button type="button" onClick={() => setPaso(2)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                  ← Atrás
                </button>
                <button type="button" onClick={handleCerrar} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                  Cancelar
                </button>
              </div>
              <button type="button" onClick={handleConfirmar} disabled={creando} className={`px-6 py-2 text-white rounded-lg disabled:opacity-50 ${tipoVale === 'egreso' ? 'bg-red-600 hover:bg-red-700' : 'bg-cyan-600 hover:bg-cyan-700'}`}>
                {creando ? 'Creando...' : `${getIcono()} Confirmar ${getTitulo()}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
