import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { apiFetch, saveSession } from '../../services/api'
import SmartKartLogo from '../../components/common/SmartKartLogo'

export default function LoginPage({ isDarkMode }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await apiFetch('/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      saveSession(data)

      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-4 py-6 sm:py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-8">
        <div className="flex justify-center">
          <SmartKartLogo isDarkMode={isDarkMode} className="h-auto w-full max-w-[230px]" />
        </div>
        <h1 className="mt-10 text-3xl font-semibold text-slate-900 dark:text-white">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Sign in to access your retail intelligence workspace.</p>

        <form onSubmit={handleSubmit} className="mt-7">
          <input
            className="h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <div className="relative mt-4 flex h-14 overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:border-cyan-400/70 focus-within:ring-2 focus-within:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-950">
            <input
              className="min-w-0 flex-1 border-0 bg-transparent px-4 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-500 dark:text-white"
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="!m-0 !flex !h-auto !w-12 !shrink-0 !items-center !justify-center !rounded-none !border-0 !border-l !border-solid !border-slate-300 !bg-transparent !p-0 !text-slate-600 transition hover:!bg-slate-100 hover:!text-slate-900 focus-visible:!bg-slate-100 focus-visible:!text-slate-900 dark:!border-slate-700 dark:!text-white dark:hover:!bg-slate-800/70 dark:hover:!text-white dark:focus-visible:!bg-slate-800/70 dark:focus-visible:!text-white"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="button" onClick={() => navigate('/forgot-password')} className="!m-0 !mt-3 !bg-transparent !p-0 text-left text-[15px] font-medium text-cyan-700 transition hover:underline dark:!text-cyan-400">Forgot password?</button>

          {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="!mx-auto !mt-7 !block min-h-14 w-[92%] max-w-[480px] !rounded-[28px] bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="!m-0 !inline !rounded-none !bg-transparent !p-0 font-semibold !text-cyan-400 hover:underline"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </section>
  )
}
