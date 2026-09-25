import { useEffect, useState } from 'react'
import { apiFetch } from '../../services/api'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = () => { setLoading(true); apiFetch(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`).then(setCustomers).catch((loadError) => setError(loadError.message)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [search])
  return <section className="space-y-6"><div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"><h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Customers</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Real customer visits and purchase history from completed bills.</p><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, mobile, or email" className="mt-4 w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none" /></div>{error && <p className="text-sm text-rose-400">{error}</p>}<div className="grid gap-4 md:grid-cols-3">{loading ? <p className="text-sm text-slate-500">Loading customers...</p> : customers.length ? customers.map((customer) => <div key={customer.id} className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"><h2 className="font-semibold text-slate-900 dark:text-white">{customer.name}</h2><p className="mt-2 text-sm text-slate-500">Mobile: {customer.mobile || 'Not provided'}</p><p className="mt-1 text-sm text-slate-500">Address: {customer.address || 'Not provided'}</p><div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-xs text-slate-500">Visits</p><p className="text-xl font-semibold text-cyan-400">{customer.visit_count}</p></div><div><p className="text-xs text-slate-500">Invoices</p><p className="text-xl font-semibold text-white">{customer.total_invoices}</p></div></div><p className="mt-3 text-sm text-slate-400">Last purchase: {customer.last_purchase ? new Date(customer.last_purchase).toLocaleDateString() : 'No purchases'}</p><p className="mt-1 text-sm font-semibold text-white">Total purchase: {money(customer.total_purchase)}</p></div>) : <p className="text-sm text-slate-500">No customers yet.</p>}</div></section>
}
