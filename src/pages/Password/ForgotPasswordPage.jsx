import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { apiFetch } from '../../services/api'
import SmartKartLogo from '../../components/common/SmartKartLogo'

export default function ForgotPasswordPage({ isDarkMode }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError(''); setMessage('')
    try { const result = await apiFetch('/password/forgot', { method: 'POST', body: JSON.stringify({ email }) }); setMessage(result.message); if (result.development_code) setCode(result.development_code) } catch (submitError) { setError(submitError.message) } finally { setLoading(false) }
  }
  return (
    <section className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-4 py-6 sm:py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-8">
        <div className="flex justify-center">
          <SmartKartLogo isDarkMode={isDarkMode} className="h-auto w-full max-w-[230px]" />
        </div>

        <button
          onClick={() => navigate('/login')}
          className="!mt-12 !inline-flex !h-[42px] !min-w-[104px] !-translate-y-5 !items-center !justify-center !gap-2 !rounded-xl !border !border-slate-300 !bg-transparent !px-4 !py-0 text-base font-medium !text-slate-700 transition hover:!bg-slate-100 dark:!border-slate-700 dark:!text-slate-300 dark:hover:!bg-slate-800"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <h1 className="mt-8 text-3xl font-semibold text-slate-900 dark:text-white">Forgot password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Enter your account email to receive reset instructions.</p>

        <form onSubmit={submit} className="mt-7">
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            className="h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <button
            disabled={loading}
            className="!mx-auto !mt-5 !block min-h-14 w-[92%] max-w-[480px] !rounded-[28px] bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Sending...' : 'Send Reset Instructions'}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
        {code && <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">Development reset code: <strong className="break-all">{code}</strong><button type="button" onClick={() => navigate('/reset-password', { state: { token: code } })} className="!m-0 !mt-2 !block !rounded-none !bg-transparent !p-0 text-cyan-700 underline dark:!text-cyan-300">Continue to reset password</button></div>}
        {error && <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </section>
  )
}
