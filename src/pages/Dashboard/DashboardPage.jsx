import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, BadgeIndianRupee, Package, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { apiFetch, getSession } from '../../services/api'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const localDateString = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-')
const lastSevenDates = () => Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - (6 - index))
  return localDateString(date)
})
const shortDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
  weekday: 'short',
  day: 'numeric',
})
const compactMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
})}`

export default function DashboardPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState([])
  const [salesError, setSalesError] = useState('')
  const [salesLoading, setSalesLoading] = useState(true)
  const user = getSession()

  const loadSummary = () => {
    setLoading(true)
    setError('')
    apiFetch('/dashboard/summary')
      .then(setSummary)
      .catch((loadError) => setError(loadError.message || 'Unable to load dashboard data.'))
      .finally(() => setLoading(false))
  }

  const loadSales = () => {
    const dates = lastSevenDates()
    setSalesLoading(true)
    setSalesError('')
    apiFetch(`/sales?start=${dates[0]}&end=${dates[6]}`)
      .then((dailySales) => {
        const salesByDate = new Map(dailySales.map((day) => [day.date, Number(day.amount) || 0]))
        setSales(dates.map((date) => ({
          date,
          label: shortDate(date),
          amount: salesByDate.get(date) || 0,
        })))
      })
      .catch((loadError) => {
        setSalesError(loadError.message || 'Unable to load sales history.')
        setSales([])
      })
      .finally(() => setSalesLoading(false))
  }

  useEffect(() => {
    const timer = window.setTimeout(loadSummary, 0)
    return () => window.clearTimeout(timer)
  }, [])
  useEffect(() => {
    const timer = window.setTimeout(loadSales, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const stats = summary ? [
    { title: "Today's Sales", value: money(summary.sales), change: `${summary.invoices} invoice${summary.invoices === 1 ? '' : 's'} today`, icon: BadgeIndianRupee, accent: 'text-emerald-600 dark:text-emerald-400', action: () => navigate('/sales') },
    { title: 'Profit', value: money(summary.profit), change: `${summary.customers} customer${summary.customers === 1 ? '' : 's'} served`, icon: TrendingUp, accent: 'text-cyan-600 dark:text-cyan-400', action: () => navigate('/reports') },
    { title: 'Products', value: summary.products.toString(), change: `${summary.expiring} expiring soon`, icon: Package, accent: 'text-violet-600 dark:text-violet-400', action: () => navigate('/inventory', { state: { inventoryFilter: 'expiring' } }) },
    { title: 'Low Stock', value: summary.low_stock.toString(), change: `${money(summary.pending)} pending`, icon: AlertTriangle, accent: 'text-amber-600 dark:text-amber-400', action: () => navigate('/inventory', { state: { inventoryFilter: 'low-stock' } }) },
  ] : []
  const cardHover = 'transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md dark:hover:border-cyan-700'
  const displayName = user?.name?.trim() || 'there'
  const openSales = () => navigate('/sales')

  return <section className="space-y-6">
    <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70"><p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">Overview</p><div className="mt-2"><h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Dashboard</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Welcome back, {displayName}. Your store activity is calculated from live billing data.</p></div></div>
    {error && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"><span>{error}</span><button type="button" onClick={loadSummary} className="!m-0 !rounded-lg !border !border-rose-300 !bg-transparent !px-3 !py-1.5 !text-sm !text-rose-700 dark:!border-rose-700 dark:!text-rose-300">Retry</button></div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard data...</p> : summary ? stats.map(({ title, value, change, icon: Icon, accent, action }) => <div key={title} onClick={action} onKeyDown={(event) => { if (action && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); action() } }} role={action ? 'button' : undefined} tabIndex={action ? 0 : undefined} className={`rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 ${cardHover} ${action ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60' : ''}`}><div className="flex items-center justify-between"><p className="text-sm text-slate-600 dark:text-slate-400">{title}</p><div className={`rounded-xl bg-slate-100 p-2 ${accent} dark:bg-slate-800`}><Icon size={18} /></div></div><p className="mt-4 text-3xl font-semibold text-slate-900 dark:text-white">{value}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{change}</p></div>) : null}</div>
    {summary && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><div className={`rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/80 ${cardHover}`}><p className="text-sm text-slate-500 dark:text-slate-400">Pending payments</p><p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">{money(summary.pending)}</p></div><div className={`rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/80 ${cardHover}`}><p className="text-sm text-slate-500 dark:text-slate-400">Invoices today</p><p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{summary.invoices}</p></div><div className={`rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/80 ${cardHover}`}><p className="text-sm text-slate-500 dark:text-slate-400">Customers served today</p><p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{summary.customers}</p></div></div>}
    <section aria-labelledby="weekly-sales-heading" className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="weekly-sales-heading" className="text-lg font-semibold text-slate-900 dark:text-white">Sales — Last 7 Days</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Daily recorded sales revenue, including zero-sale days.</p>
        </div>
        {sales.length > 0 && <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">{money(sales.reduce((total, day) => total + day.amount, 0))} total</p>}
      </div>
      {salesError ? <div role="alert" className="mt-5 flex flex-wrap items-center gap-3 text-sm text-rose-600 dark:text-rose-400"><span>{salesError}</span><button type="button" onClick={loadSales} className="!m-0 !rounded-lg !border !border-rose-300 !bg-transparent !px-3 !py-1.5 !text-sm !text-rose-700 dark:!border-rose-700 dark:!text-rose-300">Retry</button></div>
        : salesLoading ? <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Loading seven-day sales...</p>
          : <><div className="mt-5 h-64 w-full sm:h-72" aria-label="Bar chart of sales revenue for the last seven days">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sales} margin={{ top: 12, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748b33" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={compactMoney} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={58} />
                <Tooltip
                  cursor={{ fill: '#06b6d422' }}
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload
                    return active && point ? <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-950">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{money(point.amount)}</p>
                    </div> : null
                  }}
                />
                <Bar
                  dataKey="amount"
                  name="Sales"
                  fill="#22d3ee"
                  radius={[5, 5, 0, 0]}
                  minPointSize={3}
                  shape={(props) => {
                    const { x, y, width, height: barHeight, fill, payload } = props
                    const height = Math.max(barHeight, 3)
                    return <rect
                      x={x}
                      y={y - (height - barHeight)}
                      width={width}
                      height={height}
                      fill={fill}
                      rx={5}
                      ry={5}
                      tabIndex={0}
                      role="link"
                      aria-label={`${payload.date}: ${money(payload.amount)} sales. Open Sales page.`}
                      className="cursor-pointer transition-opacity hover:opacity-75 focus:outline-none focus:stroke-cyan-700 focus:stroke-2 dark:focus:stroke-white"
                      onClick={openSales}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openSales()
                        }
                      }}
                    />
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {sales.every((day) => day.amount === 0) && <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">No sales recorded in the last seven days.</p>}
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">Select a bar to open Sales history.</p>
        </>}
    </section>
  </section>
}
