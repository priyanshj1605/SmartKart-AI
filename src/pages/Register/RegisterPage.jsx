import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { apiFetch } from '../../services/api'
import SmartKartLogo from '../../components/common/SmartKartLogo'

export default function RegisterPage({ isDarkMode }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.name || !form.email || !form.password) {
      setMessage('Please fill in all fields.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      await apiFetch('/register', { method: 'POST', body: JSON.stringify(form) })
      setMessage('Account created successfully. Please sign in to continue.')
      setTimeout(() => navigate('/login'), 900)
    } catch (error) {
      setMessage(error.message || 'Registration failed')
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
        <h1 className="mt-10 text-3xl font-semibold text-slate-900 dark:text-white">Create account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Register as a new store owner and start managing your retail business.</p>

        <form onSubmit={handleSubmit} className="mt-7">
          <input name="name" value={form.name} onChange={handleChange} className="h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Full name" />
          <input name="email" value={form.email} onChange={handleChange} className="mt-4 h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Email address" />
          <div className="relative mt-4 flex h-14 overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:border-cyan-400/70 focus-within:ring-2 focus-within:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-950">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              className="min-w-0 flex-1 border-0 bg-transparent px-4 text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:text-white"
              placeholder="Password"
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

          {message ? <p className="text-sm text-cyan-400">{message}</p> : null}

          <button type="submit" disabled={loading} className="!mx-auto !mt-6 !block min-h-14 w-[92%] max-w-[480px] !rounded-[28px] bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70">
            {loading ? 'Creating account...' : 'Register'}
          </button>
          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account? <Link to="/login" className="font-semibold text-cyan-400 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </section>
  )
}
