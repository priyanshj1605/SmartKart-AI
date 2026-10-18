import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../services/api'
import { filterUpcomingFestivals } from './upcomingFestivals'

const festivalDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export default function AIPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(true)
  const [error, setError] = useState('')
  const [dismissed, setDismissed] = useState([])

  const loadInsights = useCallback(async () => {
    setLoading(true)
    setError('')
    setData(null)
    try {
      const preferences = await apiFetch('/preferences')
      setEnabled(preferences.ai_suggestions)
      if (!preferences.ai_suggestions) {
        setData(null)
        return
      }
      const insights = await apiFetch('/ai/festival-insights')
      setData({
        ...insights,
        festivals: filterUpcomingFestivals(insights.festivals || []),
      })
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void loadInsights()
    }
    const timer = setTimeout(refresh, 0)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [loadInsights])

  useEffect(() => {
    let timer
    const scheduleMidnightRefresh = () => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 1, 0)
      timer = window.setTimeout(() => {
        void loadInsights()
        scheduleMidnightRefresh()
      }, midnight.getTime() - now.getTime())
    }
    scheduleMidnightRefresh()
    return () => window.clearTimeout(timer)
  }, [loadInsights])

  const visibleFestivals = (data?.festivals || []).filter((festival) => !dismissed.includes(festival.name + festival.date))

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">AI Assistant</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Festival and seasonal retail insights based on your store inventory and sales.</p>
          </div>
          <button type="button" disabled={loading || !enabled} onClick={() => void loadInsights()} className="!m-0 !rounded-lg !border !border-slate-300 !bg-transparent !px-4 !py-2 !text-sm !font-medium !text-slate-700 disabled:!opacity-50 dark:!border-slate-700 dark:!text-slate-300">Refresh insights</button>
        </div>
      </div>

      {!enabled && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">AI suggestions are disabled in Settings. Enable them to view festival insights.</div>}
      {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Upcoming Festival Insights</h2>
          {data && <span className="text-xs text-slate-500 dark:text-slate-400">{data.region ? `Regional calendar · ${data.region} · next 90 days` : 'India-wide and regional calendar · next 90 days'}</span>}
        </div>
        {data?.ai_summary && <p className="mt-3 rounded-xl bg-cyan-50 p-4 text-sm text-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-100">{data.ai_summary}</p>}
        {data && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{data.estimate_disclaimer} {data.ai_assisted ? 'AI summary uses only the displayed, non-customer store context.' : 'Showing safe inventory-based recommendations; live AI summary is unavailable.'}</p>}
        {loading ? <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Loading festival insights...</p> : visibleFestivals.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {visibleFestivals.map((festival) => (
              <article key={festival.name + festival.date} className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="text-lg font-semibold text-slate-900 dark:text-white">{festival.name}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{festivalDate(festival.date)} · {festival.days_remaining === 0 ? 'Today' : `${festival.days_remaining} days remaining`}</p></div>
                  <button type="button" onClick={() => setDismissed((items) => [...items, festival.name + festival.date])} className="!m-0 !bg-transparent !p-1 !text-xs !text-slate-500">Dismiss</button>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{festival.reason}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Preparation window: {festival.preparation_window_days} days before the festival</p>
                {festival.date_status === 'provisional' && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Provisional lunar date; confirm with your local calendar. <a href={festival.date_source.url} target="_blank" rel="noreferrer" className="underline">Date source</a></p>}
                {festival.applicable_regions?.length > 0 && !festival.applicable_regions.some((item) => item.code === 'IN') && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Regional observance: {festival.applicable_regions.map((item) => item.name).join(', ')}</p>}
                <div className="mt-3 flex flex-wrap gap-2">{festival.suggested_categories.map((category) => <span key={category} className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300">{category}</span>)}</div>

                {festival.products.some((product) => product.current_stock > 0) ? <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">Matching inventory</h4>
                  {festival.products.filter((product) => product.current_stock > 0).map((product) => <div key={product.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium text-slate-900 dark:text-white">{product.name}</span><span className="text-xs text-slate-600 dark:text-slate-300">{product.current_stock} eligible units</span></div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{product.sales_history_sufficient ? `90-day sales: ${product.quantity_sold_last_90_days} · Estimated demand: ${product.estimated_demand_units} units` : 'General recommendation; insufficient store-specific sales history for demand estimates.'}</p>
                    {product.suggested_reorder_quantity > 0 && <p className="mt-1 text-xs font-medium text-cyan-700 dark:text-cyan-300">Estimated reorder: {product.suggested_reorder_quantity} units</p>}
                    {product.quantity_expiring_in_preparation_window > 0 && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Expiry warning: {product.quantity_expiring_in_preparation_window} units expire on or before the festival date and are excluded from eligible stock.</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => navigate('/inventory', { state: { inventorySearch: product.name } })} className="!m-0 !rounded-md !border !border-slate-300 !bg-transparent !px-2.5 !py-1.5 !text-xs !text-slate-700 dark:!border-slate-700 dark:!text-slate-300">View inventory</button>
                      <button type="button" onClick={() => navigate('/sales')} className="!m-0 !rounded-md !border !border-slate-300 !bg-transparent !px-2.5 !py-1.5 !text-xs !text-slate-700 dark:!border-slate-700 dark:!text-slate-300">View sales history</button>
                      {product.suggested_reorder_quantity > 0 && <button type="button" onClick={() => navigate('/inventory', { state: { prefillProduct: product, prefillQuantity: product.suggested_reorder_quantity } })} className="!m-0 !rounded-md !bg-cyan-500 !px-2.5 !py-1.5 !text-xs !font-medium !text-slate-950">Review reorder suggestion</button>}
                    </div>
                  </div>)}
                </div> : festival.products.length > 0
                  ? <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Matching products exist, but no eligible stock is currently available for this festival.</p>
                  : <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No matching inventory found for this festival.</p>}
              </article>
            ))}
          </div>
        ) : !loading && enabled ? <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">No upcoming festivals were found in the next 90 days for this calendar.</p> : null}
      </div>
    </section>
  )
}
