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
  return (
    <section className="min-w-0 space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Customers</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Real customer visits and purchase history from completed bills.
            </p>
          </div>
          <div className="relative w-full lg:max-w-md lg:flex-1">
            <label htmlFor="customer-search" className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Search customers
            </label>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute left-3.5 top-[2.55rem] h-4 w-4 text-slate-400"
            >
              <circle cx="10.8" cy="10.8" r="6.3" stroke="currentColor" strokeWidth="1.7" />
              <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <input
              id="customer-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, mobile, or email"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400"
            />
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}

      <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading customers...</p>
        ) : customers.length ? (
          customers.map((customer) => (
            <article
              key={customer.id}
              className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 sm:p-6"
            >
              <div className="min-w-0">
                <h2 className="break-words text-base font-semibold leading-6 text-slate-900 dark:text-white">{customer.name}</h2>
                <div className="mt-3 space-y-2 text-sm leading-5 text-slate-600 dark:text-slate-400">
                  <p className="break-words"><span className="font-medium text-slate-700 dark:text-slate-300">Mobile:</span> {customer.mobile || 'Not provided'}</p>
                  <p className="break-words"><span className="font-medium text-slate-700 dark:text-slate-300">Address:</span> {customer.address || 'Not provided'}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="min-w-0 rounded-xl border border-cyan-100 bg-cyan-50/70 px-4 py-3 dark:border-cyan-900/50 dark:bg-cyan-950/30">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Visits</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-cyan-700 dark:text-cyan-300">{customer.visit_count}</p>
                </div>
                <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Invoices</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{customer.total_invoices}</p>
                </div>
              </div>

              <div className="mt-auto border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="break-words text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Last purchase:</span>{' '}
                  {customer.last_purchase ? new Date(customer.last_purchase).toLocaleDateString() : 'No purchases'}
                </p>
                <p className="mt-2 break-words text-sm font-semibold text-slate-900 dark:text-white">
                  <span className="font-medium text-slate-600 dark:text-slate-400">Total purchase:</span>{' '}
                  {money(customer.total_purchase)}
                </p>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No customers yet.</p>
        )}
      </div>
    </section>
  )
}
