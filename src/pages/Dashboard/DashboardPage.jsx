import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, BadgeIndianRupee, Package, TrendingUp } from 'lucide-react'
import { apiFetch, getSession } from '../../services/api'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function DashboardPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const user = getSession()

  const loadSummary = () => {
    setLoading(true)
    setError('')
    apiFetch('/dashboard/summary')
      .then(setSummary)
      .catch((loadError) => setError(loadError.message || 'Unable to load dashboard data.'))
      .finally(() => setLoading(false))
  }

  useEffect(loadSummary, [])

  const stats = summary ? [
    { title: "Today's Sales", value: money(summary.sales), change: `${summary.invoices} invoice${summary.invoices === 1 ? '' : 's'} today`, icon: BadgeIndianRupee, accent: 'text-emerald-600 dark:text-emerald-400', action: () => navigate('/sales') },
    { title: 'Profit', value: money(summary.profit), change: `${summary.customers} customer${summary.customers === 1 ? '' : 's'} served`, icon: TrendingUp, accent: 'text-cyan-600 dark:text-cyan-400' },
    { title: 'Products', value: summary.products.toString(), change: `${summary.expiring} expiring soon`, icon: Package, accent: 'text-violet-600 dark:text-violet-400', action: () => navigate('/inventory', { state: { inventoryFilter: 'expiring' } }) },
    { title: 'Low Stock', value: summary.low_stock.toString(), change: `${money(summary.pending)} pending`, icon: AlertTriangle, accent: 'text-amber-600 dark:text-amber-400', action: () => navigate('/inventory', { state: { inventoryFilter: 'low-stock' } }) },
  ] : []
  const cardHover = 'transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md dark:hover:border-cyan-700'
  const displayName = user?.name?.trim() || 'there'

  return <section className="space-y-6">
    <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70"><p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">Overview</p><div className="mt-2"><h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Dashboard</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Welcome back, {displayName}. Your store activity is calculated from live billing data.</p></div></div>
    {error && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"><span>{error}</span><button type="button" onClick={loadSummary} className="!m-0 !rounded-lg !border !border-rose-300 !bg-transparent !px-3 !py-1.5 !text-sm !text-rose-700 dark:!border-rose-700 dark:!text-rose-300">Retry</button></div>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard data...</p> : summary ? stats.map(({ title, value, change, icon: Icon, accent, action }) => <div key={title} onClick={action} onKeyDown={(event) => { if (action && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); action() } }} role={action ? 'button' : undefined} tabIndex={action ? 0 : undefined} className={`rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 ${cardHover} ${action ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60' : ''}`}><div className="flex items-center justify-between"><p className="text-sm text-slate-600 dark:text-slate-400">{title}</p><div className={`rounded-xl bg-slate-100 p-2 ${accent} dark:bg-slate-800`}><Icon size={18} /></div></div><p className="mt-5 text-3xl font-semibold text-slate-900 dark:text-white">{value}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{change}</p></div>) : null}</div>
    {summary && <div className="grid gap-4 md:grid-cols-3"><div className={`rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/80 ${cardHover}`}><p className="text-sm text-slate-500 dark:text-slate-400">Pending payments</p><p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">{money(summary.pending)}</p></div><div className={`rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/80 ${cardHover}`}><p className="text-sm text-slate-500 dark:text-slate-400">Invoices today</p><p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{summary.invoices}</p></div><div className={`rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/80 ${cardHover}`}><p className="text-sm text-slate-500 dark:text-slate-400">Customers served today</p><p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{summary.customers}</p></div></div>}
  </section>
}
