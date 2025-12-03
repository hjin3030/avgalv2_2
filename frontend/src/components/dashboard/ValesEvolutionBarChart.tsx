// ValesPieTipoHoy.tsx
import { useVales } from '../../hooks/useVales'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#3b82f6', '#f59e0b', '#10b981']

export default function ValesPieTipoHoy() {
  const { vales, loading } = useVales()
  if (loading) return <div>Cargando datos...</div>
  // Agrupación por tipo (solo de HOY)
  const hoy = new Date().toISOString().split('T')[0]
  const agrupados = { ingreso: 0, egreso: 0, reingreso: 0 }
  vales.filter(v => v.fecha === hoy).forEach(v => {
    if (agrupados[v.tipo] !== undefined) agrupados[v.tipo]++
  })
  const data = Object.entries(agrupados).map(([tipo, value]) => ({
    name: tipo.charAt(0).toUpperCase() + tipo.slice(1),
    value
  }))
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (!total) return <div className="text-gray-600 text-center">Sin vales registrados hoy</div>

  return (
    <div className="w-full h-64">
      <h3 className="text-lg font-bold text-center mb-2">📊 % Vales por Tipo (Hoy)</h3>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            dataKey="value"
            isAnimationActive={false}
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(1)}%`
            }
          >
            {data.map((entry, idx) => (
              <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Legend />
          <Tooltip formatter={(value) => `${value} vales`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
