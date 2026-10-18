import { useEffect, useMemo, useState } from 'react'
import { Barcode, CheckCircle2, PackagePlus, Search, Trash2, UserRound } from 'lucide-react'
import { apiFetch, jsonBody } from '../../services/api'
import ScannerModal from '../../components/common/ScannerModal'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white'
const quoteForItem = (item) => {
  let remaining = item.quantity
  const allocations = []
  for (const batch of item.batches) {
    if (batch.status === 'Expired' || batch.quantity_remaining <= 0) continue
    const quantity = Math.min(remaining, batch.quantity_remaining)
    if (quantity > 0) allocations.push({ batch, quantity })
    remaining -= quantity
    if (!remaining) break
  }
  return {
    allocations,
    amount: allocations.reduce((sum, allocation) => sum + allocation.quantity * allocation.batch.selling_price, 0),
  }
}

export default function BillingPage() {
  const [customerQuery, setCustomerQuery] = useState('')
  const [customers, setCustomers] = useState([])
  const [customer, setCustomer] = useState({ name: '', mobile: '', address: '', email: '' })
  const [productQuery, setProductQuery] = useState('')
  const [products, setProducts] = useState([])
  const [items, setItems] = useState([])
  const [paymentStatus, setPaymentStatus] = useState('Paid')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  useEffect(() => {
    if (customerQuery.trim().length < 2) {
      const clearTimer = setTimeout(() => setCustomers([]), 0)
      return () => clearTimeout(clearTimer)
    }
    const timer = setTimeout(() => apiFetch(`/customers?search=${encodeURIComponent(customerQuery)}`).then(setCustomers).catch(() => setCustomers([])), 250)
    return () => clearTimeout(timer)
  }, [customerQuery])
  useEffect(() => {
    if (productQuery.trim().length < 1) {
      const clearTimer = setTimeout(() => setProducts([]), 0)
      return () => clearTimeout(clearTimer)
    }
    const timer = setTimeout(() => apiFetch(`/products?search=${encodeURIComponent(productQuery)}`).then(setProducts).catch(() => setProducts([])), 250)
    return () => clearTimeout(timer)
  }, [productQuery])

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + quoteForItem(item).amount, 0), [items])
  const addProduct = (product) => {
    const batch = product.batches.find((entry) => entry.quantity_remaining > 0 && entry.status !== 'Expired')
    if (!batch) return setError('This product has no valid stock available.')
    setItems((current) => {
      const existing = current.find((item) => item.product_id === product.id)
      if (existing) return current.map((item) => item.product_id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item)
      return [...current, { product_id: product.id, name: product.name, sku: product.sku || '-', quantity: 1, stock: product.stock, price: batch.selling_price, batch: batch.batch_number, batches: product.batches }]
    })
    setProductQuery(''); setProducts([]); setError('')
  }
  const completeBill = async (event) => {
    event.preventDefault(); setError('')
    if (!customer.name.trim() || items.length === 0) return setError('Add customer details and at least one product.')
    if (items.some((item) => item.quantity < 1 || item.quantity > item.stock)) return setError('A quantity cannot exceed available stock.')
    setSaving(true)
    try {
      const invoice = await apiFetch('/invoices', { method: 'POST', body: jsonBody({ customer, payment_status: paymentStatus, items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })) }) })
      setMessage(`${invoice.invoice_number} completed successfully.`); setCustomer({ name: '', mobile: '', address: '', email: '' }); setItems([]); setPaymentStatus('Paid')
    } catch (submitError) { setError(submitError.message) } finally { setSaving(false) }
  }
  const handleScan = (code) => { setProductQuery(code); setScannerOpen(false) }

  return <section className="space-y-6">
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80"><p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">Point of sale</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Billing</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Create a stock-checked invoice in seconds.</p></div><div className="text-right"><p className="text-sm text-slate-500 dark:text-slate-400">Grand total</p><p className="text-3xl font-semibold text-cyan-600 dark:text-cyan-400">{money(subtotal)}</p></div></div></div>
    <form onSubmit={completeBill} className="grid gap-6 xl:grid-cols-[1fr_1.35fr]">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/80"><div className="flex items-center gap-2"><UserRound size={18} className="text-cyan-600 dark:text-cyan-400" /><h2 className="font-semibold text-slate-900 dark:text-white">Customer details</h2></div><div className="relative mt-4"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Search existing customer..." className={`${fieldClass} px-10`} />{customers.length > 0 && <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">{customers.map((entry) => <button type="button" key={entry.id} onClick={() => { setCustomer(entry); setCustomerQuery(''); setCustomers([]) }} className="!m-0 !block !w-full !rounded-md !bg-transparent !p-3 !text-left !text-sm !text-slate-900 hover:!bg-slate-100 dark:!text-white dark:hover:!bg-slate-800">{entry.name}<span className="ml-2 text-slate-500 dark:text-slate-400">{entry.mobile}</span></button>)}</div>}</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><input required value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Customer name" className={fieldClass} /><input value={customer.mobile || ''} onChange={(event) => setCustomer({ ...customer, mobile: event.target.value })} placeholder="Mobile number" className={fieldClass} /><input value={customer.email || ''} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} placeholder="Email (optional)" className={fieldClass} /><input value={customer.address || ''} onChange={(event) => setCustomer({ ...customer, address: event.target.value })} placeholder="Address" className={fieldClass} /></div></div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/80"><div className="flex items-center gap-2"><PackagePlus size={18} className="text-cyan-600 dark:text-cyan-400" /><h2 className="font-semibold text-slate-900 dark:text-white">Add product</h2></div><div className="relative mt-4"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Search by product, SKU, or barcode..." className={`${fieldClass} px-10 pr-12`} /><button type="button" onClick={() => setScannerOpen(true)} aria-label="Scan billing barcode" className="!m-0 !absolute !right-1 !top-1/2 !-translate-y-1/2 !bg-transparent !p-2 !text-slate-500 dark:!text-slate-300"><Barcode size={18} /></button>{products.length > 0 && <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">{products.map((product) => <button type="button" key={product.id} onClick={() => addProduct(product)} className="!m-0 !flex !w-full !items-center !justify-between !rounded-md !bg-transparent !p-3 !text-left !text-sm !text-slate-900 hover:!bg-slate-100 dark:!text-white dark:hover:!bg-slate-800"><span>{product.name}<small className="ml-2 text-slate-500 dark:text-slate-400">{product.sku || 'No SKU'}</small></span><span className="text-cyan-700 dark:text-cyan-300">{product.stock} in stock</span></button>)}</div>}</div></div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/80"><h2 className="font-semibold text-slate-900 dark:text-white">Bill items</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400"><tr><th className="pb-3">Product</th><th className="pb-3">Batch</th><th className="pb-3">Qty</th><th className="pb-3">Selling price</th><th className="pb-3">Amount</th><th /></tr></thead><tbody>{items.map((item) => { const quote = quoteForItem(item); return <tr key={item.product_id} className="border-b border-slate-100 dark:border-slate-800"><td className="py-3 font-medium text-slate-900 dark:text-white">{item.name}<small className="block text-slate-500 dark:text-slate-400">{item.sku}</small></td><td className="py-3 text-slate-600 dark:text-slate-400">{quote.allocations.map(({ batch }) => batch.batch_number).join(', ') || item.batch}</td><td className="py-3"><input type="number" min="1" max={item.stock} value={item.quantity} onChange={(event) => setItems(items.map((line) => line.product_id === item.product_id ? { ...line, quantity: Number(event.target.value) } : line))} className="w-20 rounded border border-slate-300 bg-white px-2 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></td><td className="py-3 text-slate-600 dark:text-slate-400">{quote.allocations.length > 1 ? 'FEFO batch prices' : money(item.price)}</td><td className="py-3 font-semibold text-slate-900 dark:text-white">{money(quote.amount)}</td><td><button type="button" onClick={() => setItems(items.filter((line) => line.product_id !== item.product_id))} aria-label={`Remove ${item.name}`} className="!m-0 !bg-transparent !p-2 !text-rose-600 dark:!text-rose-400"><Trash2 size={16} /></button></td></tr> })}</tbody></table>{items.length === 0 && <div className="py-14 text-center text-sm text-slate-500 dark:text-slate-400">Search inventory to add products.</div>}</div><div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800"><div className="flex justify-between text-sm text-slate-600 dark:text-slate-400"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2">{['Paid', 'Pending'].map((status) => <button type="button" key={status} onClick={() => setPaymentStatus(status)} className={`!m-0 !rounded-lg !px-4 !py-2 !text-sm ${paymentStatus === status ? '!bg-cyan-500 !text-slate-950' : '!border !border-slate-300 !bg-transparent !text-slate-700 dark:!border-slate-700 dark:!text-slate-300'}`}>{status}</button>)}</div><button disabled={saving || items.length === 0} className="!m-0 !inline-flex !items-center !gap-2 !rounded-lg !bg-cyan-500 !px-5 !py-3 !text-sm !font-semibold !text-slate-950 disabled:!cursor-not-allowed disabled:!opacity-60"><CheckCircle2 size={17} />{saving ? 'Completing...' : 'Complete Bill'}</button></div>{message && <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}{error && <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>}</div></div>
    </form>
    {scannerOpen && <ScannerModal onDetected={handleScan} onClose={() => setScannerOpen(false)} />}
  </section>
}
