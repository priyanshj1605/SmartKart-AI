import { useEffect, useState } from 'react'
import { apiFetch } from '../../services/api'

export default function AIPage() {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSuggestions() {
      try {
        const data = await apiFetch('/ai/suggestions')
        setSuggestions(data.suggestions || [])
      } catch (error) {
        console.error('Failed to load AI suggestions', error)
      } finally {
        setLoading(false)
      }
    }

    loadSuggestions()
  }, [])

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">AI Assistant</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Use smart recommendations and predictive insights for your retail operations.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <h2 className="font-semibold text-slate-900 dark:text-white">Suggested actions</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading AI suggestions...</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {suggestions.map((item) => (
              <li key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
