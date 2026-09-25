import { useEffect, useState } from 'react'
import { apiFetch } from '../../services/api'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`
const localDate = (offset = 0) => { const date = new Date(); date.setDate(date.getDate() + offset); return date.toLocaleDateString('en-CA') }

export default function SalesPage() {
  const [date, setDate] = useState(localDate())
  const [summary, setSummary] = useState(null)
  const [details, setDetails] = useState([])
  const [performance, setPerformance] = useState({ fast: [], slow: [] })
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch(`/sales?date=${date}`),
      apiFetch(`/sales/details?date=${date}`),
      apiFetch(`/sales/performance?date=${date}`),
    ])
      .then(([sales, rows, analytics]) => {
        setSummary(sales[0] || null)
        setDetails(rows)
        setPerformance(analytics || { fast: [], slow: [] })
      })
      .catch((loadError) => setError(loadError.message))
  }, [date])

  return <section className="space-y-6">
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Sales</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Search completed billing data by any date.</p></div>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{[['Today', 0], ['Yesterday', -1]].map(([label, offset]) => <button key={label} onClick={() => setDate(localDate(offset))} className="!m-0 !rounded-lg !border !border-slate-300 !bg-transparent !px-3 !py-2 !text-sm !text-slate-700 dark:!border-slate-700 dark:!text-slate-300">{label}</button>)}</div>
    </div>
    {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    <div className="grid gap-4 md:grid-cols-5">{[['Invoices', summary?.invoices || 0], ['Revenue', money(summary?.amount)], ['Cost', money(summary?.cost)], ['Profit', money(summary?.profit)], ['Products sold', summary?.quantity || 0]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/80"><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80">
        <h2 className="font-semibold text-slate-900 dark:text-white">Fast Selling Products</h2>
        {performance.fast.length ? <div className="mt-4 space-y-3">{performance.fast.map((product) => <div key={product.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"><div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-900 dark:text-white">{product.name}</p><span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Fast</span></div><div className="mt-2 grid gap-1 text-sm text-slate-600 dark:text-slate-300"><div className="flex justify-between"><span>Quantity sold</span><span>{product.quantity_sold}</span></div><div className="flex justify-between"><span>Revenue</span><span>{money(product.revenue)}</span></div><div className="flex justify-between"><span>Transactions</span><span>{product.transactions || 0}</span></div></div></div>)}</div> : <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Not enough sales data yet.</p>}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80">
        <h2 className="font-semibold text-slate-900 dark:text-white">Slow Selling Products</h2>
        {performance.slow.length ? <div className="mt-4 space-y-3">{performance.slow.map((product) => <div key={product.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"><div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-900 dark:text-white">{product.name}</p><span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">Slow</span></div><div className="mt-2 grid gap-1 text-sm text-slate-600 dark:text-slate-300"><div className="flex justify-between"><span>Quantity sold</span><span>{product.quantity_sold}</span></div><div className="flex justify-between"><span>Revenue</span><span>{money(product.revenue)}</span></div><div className="flex justify-between"><span>Transactions</span><span>{product.transactions || 0}</span></div></div></div>)}</div> : <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Not enough sales data yet.</p>}
      </div>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80">
      <h2 className="font-semibold text-slate-900 dark:text-white">Product sales for {date}</h2>
      {details.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400"><tr><th className="pb-3">Customer</th><th className="pb-3">Batch</th><th className="pb-3">Qty</th><th className="pb-3">Selling</th><th className="pb-3">Purchase</th><th className="pb-3">Revenue</th><th className="pb-3">Profit</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{details.map((row, index) => <tr key={`${row.batch}-${index}`}><td className="py-3 font-medium text-slate-900 dark:text-white">{row.customer_name || 'Walk-in Customer'}</td><td className="py-3 text-slate-600 dark:text-slate-300">{row.batch}</td><td className="py-3 text-slate-600 dark:text-slate-300">{row.quantity}</td><td className="py-3 text-slate-600 dark:text-slate-300">{money(row.selling_price)}</td><td className="py-3 text-slate-600 dark:text-slate-300">{money(row.purchase_price)}</td><td className="py-3 text-slate-600 dark:text-slate-300">{money(row.revenue)}</td><td className="py-3 font-semibold text-emerald-600 dark:text-emerald-400">{money(row.profit)}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No sales for this date.</p>}
    </div>
  </section>
}
