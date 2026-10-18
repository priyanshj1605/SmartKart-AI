import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, jsonBody } from '../../services/api'

const rowClass = 'flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition dark:border-slate-800'
const regions = [
  ['AN', 'Andaman and Nicobar Islands'], ['AP', 'Andhra Pradesh'], ['AR', 'Arunachal Pradesh'], ['AS', 'Assam'],
  ['BR', 'Bihar'], ['CH', 'Chandigarh'], ['CG', 'Chhattisgarh'], ['DH', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['DL', 'Delhi'], ['GA', 'Goa'], ['GJ', 'Gujarat'], ['HR', 'Haryana'],
  ['HP', 'Himachal Pradesh'], ['JK', 'Jammu and Kashmir'], ['JH', 'Jharkhand'], ['KA', 'Karnataka'],
  ['KL', 'Kerala'], ['LA', 'Ladakh'], ['LD', 'Lakshadweep'], ['MP', 'Madhya Pradesh'],
  ['MH', 'Maharashtra'], ['MN', 'Manipur'], ['ML', 'Meghalaya'], ['MZ', 'Mizoram'], ['NL', 'Nagaland'],
  ['OD', 'Odisha'], ['PY', 'Puducherry'], ['PB', 'Punjab'], ['RJ', 'Rajasthan'], ['SK', 'Sikkim'],
  ['TN', 'Tamil Nadu'], ['TS', 'Telangana'], ['TR', 'Tripura'], ['UP', 'Uttar Pradesh'],
  ['UK', 'Uttarakhand'], ['WB', 'West Bengal'],
]
const emptyPreferences = { auto_reorder_alerts: null, ai_suggestions: null, region: null }

export default function SettingsPage() {
  const navigate = useNavigate()
  const [preferences, setPreferences] = useState(emptyPreferences)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch('/preferences')
      .then((saved) => setPreferences({ ...emptyPreferences, ...saved }))
      .catch((loadError) => { setError(loadError.message); setLoadFailed(true) })
      .finally(() => setLoaded(true))
  }, [])

  const savePreferences = async (next) => {
    const previous = preferences
    setPreferences(next)
    setError('')
    setSaving(true)
    try {
      setPreferences(await apiFetch('/preferences', { method: 'PUT', body: jsonBody(next) }))
    } catch (saveError) {
      setPreferences(previous)
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const togglePreference = (key) => {
    void savePreferences({ ...preferences, [key]: !preferences[key] })
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
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80">
      <h2 className="font-semibold text-slate-900 dark:text-white">Store preferences</h2>
      <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
        {[['auto_reorder_alerts', 'Auto reorder alerts'], ['ai_suggestions', 'AI suggestions']].map(([key, label]) => <div key={key} className={rowClass}>
          <span>{label}</span>
          <button type="button" disabled={!loaded || loadFailed || saving} onClick={() => togglePreference(key)} aria-pressed={loaded && !loadFailed ? preferences[key] : false} className={`!m-0 !rounded-lg !px-3 !py-1.5 !text-sm !font-medium disabled:!cursor-wait disabled:!opacity-60 ${preferences[key] ? '!bg-emerald-100 !text-emerald-700 dark:!bg-emerald-950/40 dark:!text-emerald-400' : '!border !border-slate-300 !bg-transparent !text-slate-600 dark:!border-slate-700 dark:!text-slate-400'}`}>{!loaded ? 'Loading' : loadFailed ? 'Unavailable' : (preferences[key] ? 'Enabled' : 'Disabled')}</button>
        </div>)}
        <label className={`${rowClass} gap-4`}><span>Festival region</span><select aria-label="Festival region" disabled={!loaded || loadFailed || saving} value={preferences.region || ''} onChange={(event) => void savePreferences({ ...preferences, region: event.target.value || null })} className="max-w-[65%] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><option value="">{loadFailed ? 'Unavailable' : 'General India'}</option>{regions.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
        <p className="px-1 text-xs text-slate-500 dark:text-slate-400">Regional festival dates are included where available; leave at General India for national recommendations.</p>
        <button type="button" onClick={openChangePassword} className={`${rowClass} !m-0 !w-full !bg-transparent !text-left hover:!border-cyan-300 hover:!bg-slate-50 dark:hover:!border-cyan-800 dark:hover:!bg-slate-800/50`}><span><span className="block font-medium text-slate-700 dark:text-slate-200">Change Password</span><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Update your account password</span></span><ChevronRight size={18} /></button>
      </div>
    </div>
    {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
  </section>
}
