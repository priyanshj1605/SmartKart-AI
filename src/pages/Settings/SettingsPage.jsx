import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, jsonBody } from '../../services/api'

const rowClass = 'flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition dark:border-slate-800'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [preferences, setPreferences] = useState({ auto_reorder_alerts: true, ai_suggestions: true })
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/preferences').then(setPreferences).catch((loadError) => setError(loadError.message))
  }, [])

  const togglePreference = async (key) => {
    const next = { ...preferences, [key]: !preferences[key] }
    setPreferences(next)
    try {
      await apiFetch('/preferences', { method: 'PUT', body: jsonBody(next) })
    } catch (saveError) {
      setPreferences(preferences)
      setError(saveError.message)
    }
  }

  const openChangePassword = async () => {
    try {
      const result = await apiFetch('/password/change-token', { method: 'POST' })
      navigate('/reset-password', { state: { token: result.token, fromSettings: true } })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return <section className="space-y-6">
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80"><h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Settings</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Configure store preferences and account security.</p></div>
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80"><h2 className="font-semibold text-slate-900 dark:text-white">Store preferences</h2><div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
      {[['auto_reorder_alerts', 'Auto reorder alerts'], ['ai_suggestions', 'AI suggestions']].map(([key, label]) => <div key={key} className={rowClass}><span>{label}</span><button type="button" onClick={() => togglePreference(key)} aria-pressed={preferences[key]} className={`!m-0 !rounded-lg !px-3 !py-1.5 !text-sm !font-medium ${preferences[key] ? '!bg-emerald-100 !text-emerald-700 dark:!bg-emerald-950/40 dark:!text-emerald-400' : '!border !border-slate-300 !bg-transparent !text-slate-600 dark:!border-slate-700 dark:!text-slate-400'}`}>{preferences[key] ? 'Enabled' : 'Disabled'}</button></div>)}
      <button type="button" onClick={openChangePassword} className={`${rowClass} !m-0 !w-full !bg-transparent !text-left hover:!border-cyan-300 hover:!bg-slate-50 dark:hover:!border-cyan-800 dark:hover:!bg-slate-800/50`}><span><span className="block font-medium text-slate-700 dark:text-slate-200">Change Password</span><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Update your account password</span></span><ChevronRight size={18} /></button>
    </div></div>
    {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
  </section>
}
