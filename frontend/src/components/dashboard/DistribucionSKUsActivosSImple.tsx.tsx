// DistribucionSKUsActivosSimple.tsx
import { useStock } from '../../hooks/useStock'
import { useSkus } from '../../hooks/useSkus'

export default function DistribucionSKUsActivosSimple() {
  const { stock, loading: loadingStock } = useStock()
  const { skus: allSkus, loading: loadingSkus } = useSkus(true)
  if (loadingStock || loadingSkus) return <div>Cargando datos...</div>
  
  // Lógica igual que bodega.tsx: solo activos y map por código
  const skusActivos = allSkus.filter(s => s.activo === true)
  const codigosActivos = skusActivos.map(s => s.codigo)
  const stockFiltrado = stock.filter(item => codigosActivos.includes(item.skuCodigo))
  
  // Mostrar tabla/leyenda simple
  return (
    <div className="w-full p-4">
      <h3 className="text-lg font-bold mb-3">📦 Distribución de Stock por SKU Activo</h3>
      <div className="max-w-xl mx-auto border rounded shadow bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-2 py-2">SKU</th>
              <th className="text-left px-2 py-2">Nombre</th>
              <th className="text-right px-2 py-2">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {skusActivos
              .filter(sku => {
                const item = stockFiltrado.find(st => st.skuCodigo === sku.codigo)
                return item && item.cantidad > 0
              })
              .sort((a, b) => {
                const acant = (stockFiltrado.find(st => st.skuCodigo === a.codigo)?.cantidad ?? 0)
                const bcant = (stockFiltrado.find(st => st.skuCodigo === b.codigo)?.cantidad ?? 0)
                return bcant - acant
              })
              .map(sku => {
                const item = stockFiltrado.find(st => st.skuCodigo === sku.codigo)
                return (
                  <tr key={sku.codigo}>
                    <td className="px-2 py-1 font-mono">{sku.codigo}</td>
                    <td className="px-2 py-1">{sku.nombre}</td>
                    <td className="px-2 py-1 text-right">{item?.cantidad?.toLocaleString('es-CL') ?? 0}</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
