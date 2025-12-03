import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result.success) {
        navigate('/home')
      } else {
        setError(result.error || 'Error al iniciar sesión')
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-600 to-slate-400">
      <div className="bg-white/80 backdrop-blur-xl border border-slate-300 rounded-3xl shadow-2xl p-12 w-full max-w-xl flex flex-col items-center">
        <h3 className="text-4xl font-bold text-center mb-7 text-blue-750 drop-shadow">AVGAL SYS 2025</h3>
        <h2 className="text-4xl font-bold text-center mb-7 text-blue-700 drop-shadow">Iniciar sesión</h2>
        <form onSubmit={handleSubmit} className="space-y-8 w-full max-w-md">
          {/* Email */}
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-14 py-4 rounded-xl border border-blue-200 bg-slate-100 text-blue-900 placeholder:text-slate-400 shadow focus:ring-2 focus:ring-blue-400 outline-none transition"
              placeholder="Correo electrónico"
              required
              disabled={loading}
              autoComplete="email"
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-400">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 6l10 7l10-7" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 6v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6" />
              </svg>
            </span>
          </div>
          {/* Password */}
          <div className="relative">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-14 py-4 rounded-xl border border-blue-200 bg-slate-100 text-blue-900 placeholder:text-slate-400 shadow focus:ring-2 focus:ring-blue-400 outline-none transition"
              placeholder="Contraseña"
              required
              disabled={loading}
              autoComplete="current-password"
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-400">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rcle cx="12" cy="12" r="4" strokeWidth={2} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 16v2a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </span>
          </div>
          {/* Recuérdame */}
          <div className="flex items-center gap-2 text-md text-blue-700 font-medium">
            <input type="checkbox" id="remember" className="form-checkbox accent-blue-500" disabled={loading} />
            <label htmlFor="remember">Recuérdame</label>
          </div>
          {/* Error */}
          {error && (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-center">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}
          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg disabled:bg-blue-200 disabled:text-slate-400"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

