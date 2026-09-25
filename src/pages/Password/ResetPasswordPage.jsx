import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { apiFetch } from '../../services/api'
import SmartKartLogo from '../../components/common/SmartKartLogo'

export default function ResetPasswordPage({ isDarkMode }) {
  const navigate = useNavigate(); const location = useLocation(); const [token, setToken] = useState(location.state?.token || ''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [showPassword, setShowPassword] = useState(false); const [showConfirm, setShowConfirm] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  const submit = async (event) => { event.preventDefault(); if (password !== confirm) return setError('Passwords do not match.'); setLoading(true); setError(''); try { const result = await apiFetch('/password/reset', { method: 'POST', body: JSON.stringify({ token, password, confirm_password: confirm }) }); setMessage(result.message); if (location.state?.fromSettings) localStorage.removeItem('smartkart_user'); setTimeout(() => navigate('/login'), 1000) } catch (submitError) { setError(submitError.message) } finally { setLoading(false) } }
  return (
    <section className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-4 py-6 sm:py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-8">
        <div className="flex justify-center">
          <SmartKartLogo isDarkMode={isDarkMode} className="h-auto w-full max-w-[230px]" />
        </div>

        <button
          onClick={() => navigate('/login')}
          className="!mt-16 !inline-flex !h-11 !w-fit !items-center !gap-2 !rounded-xl !border !border-slate-300 !bg-transparent !px-5 !py-0 text-base font-medium !text-slate-700 transition hover:!bg-slate-100 dark:!border-slate-700 dark:!text-slate-300 dark:hover:!bg-slate-800"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <h1 className="mt-8 text-3xl font-semibold text-slate-900 dark:text-white">Reset password</h1>

        <form onSubmit={submit} className="mt-7">
          {!location.state?.fromSettings && <input
            required
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Reset code"
            className="h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />}
          <div className="relative mt-4 flex h-14 overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:border-cyan-400/70 focus-within:ring-2 focus-within:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-950">
            <input
              required
              minLength={8}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              className="min-w-0 flex-1 border-0 bg-transparent px-4 text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide new password' : 'Show new password'}
              className="!m-0 !flex !h-auto !w-12 !shrink-0 !items-center !justify-center !rounded-none !border-0 !border-l !border-solid !border-slate-300 !bg-transparent !p-0 !text-slate-600 transition hover:!bg-slate-100 hover:!text-slate-900 focus-visible:!bg-slate-100 focus-visible:!text-slate-900 dark:!border-slate-700 dark:!text-white dark:hover:!bg-slate-800/70 dark:hover:!text-white dark:focus-visible:!bg-slate-800/70 dark:focus-visible:!text-white"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="relative mt-4 flex h-14 overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:border-cyan-400/70 focus-within:ring-2 focus-within:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-950">
            <input
              required
              minLength={8}
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Confirm password"
              className="min-w-0 flex-1 border-0 bg-transparent px-4 text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((value) => !value)}
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              className="!m-0 !flex !h-auto !w-12 !shrink-0 !items-center !justify-center !rounded-none !border-0 !border-l !border-solid !border-slate-300 !bg-transparent !p-0 !text-slate-600 transition hover:!bg-slate-100 hover:!text-slate-900 focus-visible:!bg-slate-100 focus-visible:!text-slate-900 dark:!border-slate-700 dark:!text-white dark:hover:!bg-slate-800/70 dark:hover:!text-white dark:focus-visible:!bg-slate-800/70 dark:focus-visible:!text-white"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button disabled={loading} className="!mt-6 min-h-14 w-full !rounded-[28px] bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70">{loading ? 'Updating...' : 'Reset Password'}</button>
        </form>

        {message && <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
        {error && <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </section>
  )
}
