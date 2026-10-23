import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Barcode, Minus, Plus, Trash2 } from 'lucide-react'
import { apiFetch, jsonBody } from '../../services/api'
import ScannerModal from '../../components/common/ScannerModal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'

const initialForm = { name: '', category: '', sku: '', barcode: '', supplier: '', purchase_price: '', selling_price: '', quantity: '', manufacture_date: '', expiry_date: '', low_stock_threshold: 5 }
const predefinedCategories = [
  'Fresh Items',
  'Grocery & Kitchen',
  'Snacks, Drinks & Biscuits',
  'Beauty & Wellness',
  'Household & Lifestyle',
  'Dairy & Bakery',
  'Fruits & Vegetables',
  'Personal Care',
  'Stationery & Office',
  'Baby Care',
  'Pet Care',
  'Electronics & Accessories',
]
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`
const batchStatusStyles = {
  Healthy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  'Expiring Soon': 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  'Out of Stock': 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Expired: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
}
const productStatusStyles = {
  Healthy: batchStatusStyles.Healthy,
  'Low Stock': batchStatusStyles['Expiring Soon'],
  'Out of Stock': batchStatusStyles.Expired,
}
const displayDate = (value) => value
  ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : 'No expiry date'

export default function InventoryPage() {
  const location = useLocation()
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(initialForm)
  const [productSuggestionsOpen, setProductSuggestionsOpen] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [search, setSearch] = useState(() => location.state?.inventorySearch || '')
  const [filter, setFilter] = useState(() => location.state?.inventoryFilter || '')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [error, setError] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [reorderProducts, setReorderProducts] = useState([])
  const [supplierMenuOpen, setSupplierMenuOpen] = useState(false)
  const [discardTarget, setDiscardTarget] = useState(null)
  const [discardReason, setDiscardReason] = useState('Other')
  const [discardNote, setDiscardNote] = useState('')
  const [discardError, setDiscardError] = useState('')
  const [discarding, setDiscarding] = useState(false)

  const load = useCallback(() => apiFetch(`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`).then(setProducts).catch((loadError) => setError(loadError.message)), [search])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (filter !== 'reorder') {
      const clearTimer = setTimeout(() => setReorderProducts([]), 0)
      return () => clearTimeout(clearTimer)
    }
    apiFetch('/products/reorder')
      .then(setReorderProducts)
      .catch((loadError) => setError(loadError.message))
  }, [filter])

  const openStockEntry = useCallback((product, quantity) => {
    const batch = product.batches?.find((entry) => entry.quantity_remaining > 0 && entry.status !== 'Expired')
    setForm({
      ...initialForm,
      name: product.name || '',
      category: product.category || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      supplier: product.supplier || batch?.supplier || '',
      purchase_price: product.purchase_price ?? batch?.purchase_price ?? '',
      selling_price: batch?.selling_price ?? '',
      quantity: String(quantity || ''),
      low_stock_threshold: product.low_stock_threshold ?? 5,
    })
    setShowForm(true)
    setFormMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const state = location.state
    if (!state?.prefillProduct && !state?.reorderProductId) return
    const loadPrefilledProduct = async () => {
      const records = await apiFetch('/products')
      const product = records.find((entry) => entry.id === (state.prefillProduct?.id || state.reorderProductId))
      if (!product) throw new Error('The selected product is no longer in your inventory.')
      let quantity = state.prefillQuantity
      if (!quantity && state.reorderProductId) {
        const suggestions = await apiFetch(`/products/reorder?product_id=${state.reorderProductId}`)
        quantity = suggestions[0]?.suggested_order_quantity
      }
      if (!quantity) throw new Error('No suggested quantity is available. Enter a quantity to continue.')
      setFilter('')
      openStockEntry(product, quantity)
    }
    loadPrefilledProduct().catch((loadError) => setError(loadError.message))
  }, [location.state, openStockEntry])

  const suppliers = useMemo(() => [...new Set(products.flatMap((product) => product.batches.map((batch) => batch.supplier)).filter(Boolean))].sort(), [products])
  const filteredSuppliers = useMemo(() => {
    const value = form.supplier.trim().toLowerCase()
    if (!value) return suppliers.slice(0, 8)
    return suppliers.filter((supplier) => supplier.toLowerCase().includes(value)).slice(0, 8)
  }, [form.supplier, suppliers])
  const filteredProducts = useMemo(() => {
    let result = products
    if (categoryFilter) result = result.filter((product) => product.category === categoryFilter)
    if (!filter) return result
    const today = new Date().toISOString().slice(0, 10)
    const alertDate = new Date()
    alertDate.setDate(alertDate.getDate() + 30)
    const alertDateString = alertDate.toISOString().slice(0, 10)
    if (filter === 'low-stock') return result.filter((product) => product.status === 'Low Stock' || product.status === 'Out of Stock')
    return result.filter((product) => product.batches.some((batch) => batch.quantity_remaining > 0 && batch.expiry_date > today && batch.expiry_date <= alertDateString))
  }, [categoryFilter, filter, products])
  const matchingNames = productSuggestionsOpen && form.name.length > 1 ? products.filter((product) => product.name.toLowerCase().includes(form.name.toLowerCase())).slice(0, 5) : []

  const addProduct = async (event) => {
    event.preventDefault()
    setError('')
    setFormMessage('')
    if (form.manufacture_date && form.expiry_date && form.expiry_date <= form.manufacture_date) return setError('Expiry date must be after manufacture date.')
    try {
      await apiFetch('/products', { method: 'POST', body: jsonBody({ ...form, purchase_price: Number(form.purchase_price), selling_price: Number(form.selling_price), quantity: Number(form.quantity), low_stock_threshold: Number(form.low_stock_threshold) }) })
      setForm(initialForm); setFormMessage('Product batch saved.'); setShowForm(false); load()
    } catch (submitError) { setError(submitError.message) }
  }

  const openForm = () => {
    setShowForm(true)
  }

  const handleScan = (code) => { setSearch(code); setScannerOpen(false) }
  const remove = async (id) => {
    if (!window.confirm('Delete this product? Historical products used in invoices are protected.')) return
    try { await apiFetch(`/products/${id}`, { method: 'DELETE' }); load() } catch (deleteError) { setError(deleteError.message) }
  }

  const openDiscardDialog = (product, batch) => {
    setDiscardTarget({ product, batch })
    setDiscardReason(batch.status === 'Expired' ? 'Expired' : 'Other')
    setDiscardNote('')
    setDiscardError('')
    setError('')
    setFormMessage('')
  }

  const discardBatch = async () => {
    if (!discardTarget) return
    setDiscarding(true)
    setDiscardError('')
    setError('')
    try {
      const result = await apiFetch(
        `/products/${discardTarget.product.id}/batches/${discardTarget.batch.id}/discard`,
        {
          method: 'POST',
          body: jsonBody({
            expected_quantity: discardTarget.batch.quantity_remaining,
            reason: discardReason,
            note: discardReason === 'Other' ? discardNote.trim() || null : null,
          }),
        },
      )
      setProducts((currentProducts) => currentProducts.map((product) => (
        product.id === result.product.id ? result.product : product
      )))
      setFormMessage(result.message)
      setDiscardTarget(null)
    } catch (discardError) {
      setDiscardError(discardError.message)
    } finally {
      setDiscarding(false)
    }
  }

  return <section className="space-y-6">
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Inventory</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Track live stock, batches, prices, and expiry alerts.</p></div><button onClick={() => showForm ? setShowForm(false) : openForm()} className="!m-0 !inline-flex !items-center !gap-2 !rounded-lg !bg-cyan-500 !px-4 !py-3 !text-sm !font-semibold !text-slate-950"><Plus size={17} /> Add Product / Stock</button></div></div>
    {showForm && <form onSubmit={addProduct} className="rounded-2xl border border-cyan-500/30 bg-white/90 p-5 dark:bg-slate-900/80"><h2 className="font-semibold text-slate-900 dark:text-white">Add product batch</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="relative"><input required value={form.name} onChange={(event) => { setForm({ ...form, name: event.target.value }); setProductSuggestionsOpen(true) }} placeholder="Product name" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />{matchingNames.length > 0 && <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">{matchingNames.map((product) => <button type="button" key={product.id} onClick={() => { setForm({ ...form, name: product.name, category: product.category || '', sku: product.sku || '', barcode: product.barcode || '' }); setProductSuggestionsOpen(false) }} className="!m-0 !block !w-full !rounded-md !bg-transparent !p-2 !text-left !text-sm !text-slate-900 hover:!bg-slate-100 dark:!text-white dark:hover:!bg-slate-800">{product.name} <span className="text-slate-500">{product.sku || ''}</span></button>)}</div>}</div>
      <select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="" disabled>Select category</option>{form.category && !predefinedCategories.includes(form.category) && <option value={form.category}>{form.category}</option>}{predefinedCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
      <input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} placeholder="SKU" className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
      <input value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} placeholder="Barcode" className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
      <div className="relative">
        <input value={form.supplier} onFocus={() => setSupplierMenuOpen(true)} onBlur={() => setTimeout(() => setSupplierMenuOpen(false), 120)} onChange={(event) => { setSupplierMenuOpen(true); setForm({ ...form, supplier: event.target.value }) }} placeholder="Supplier" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        {supplierMenuOpen && filteredSuppliers.length > 0 && <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-44 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {filteredSuppliers.map((supplier) => <button key={supplier} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setForm({ ...form, supplier }); setSupplierMenuOpen(false) }} className="!m-0 !block !w-full !rounded-md !bg-transparent !p-2 !text-left !text-sm !text-slate-900 hover:!bg-slate-100 dark:!text-white dark:hover:!bg-slate-800">{supplier}</button>)}
        </div>}
      </div>
      {['purchase_price','selling_price','quantity','low_stock_threshold'].map((key) => <input key={key} required={key !== 'low_stock_threshold'} type="number" min="0" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={key.replaceAll('_', ' ')} className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />)}
      <input type="date" value={form.manufacture_date} onChange={(event) => setForm({ ...form, manufacture_date: event.target.value })} className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /><input type="date" value={form.expiry_date} onChange={(event) => setForm({ ...form, expiry_date: event.target.value })} className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
    </div><div className="mt-4 flex gap-3"><button className="!m-0 !rounded-lg !bg-cyan-500 !px-4 !py-2 !text-sm !font-semibold !text-slate-950">Save batch</button><button type="button" onClick={() => setShowForm(false)} className="!m-0 !rounded-lg !border !border-slate-300 !bg-transparent !px-4 !py-2 !text-sm !text-slate-700 dark:!border-slate-700 dark:!text-slate-300">Cancel</button></div></form>}
    {formMessage && <p role="status" className="break-words text-sm text-emerald-600 dark:text-emerald-400">{formMessage}</p>}{error && <p role="alert" className="break-words text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    <div className="flex flex-wrap items-center gap-3"><div className="relative w-full min-w-0 max-w-md flex-1"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, SKU, or barcode" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /><button type="button" onClick={() => setScannerOpen(true)} aria-label="Scan inventory barcode" className="!m-0 !absolute !right-1 !top-1/2 !-translate-y-1/2 !bg-transparent !p-2 !text-slate-500 dark:!text-slate-300"><Barcode size={18} /></button></div><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category" className="h-12 min-w-[190px] max-w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">All Categories</option>{predefinedCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by stock or expiry" className="h-12 min-w-[160px] max-w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">All</option><option value="low-stock">Low Stock</option><option value="expiring">Expiring Soon</option><option value="reorder">Reorder Alerts</option></select>{(categoryFilter || filter) && <button type="button" onClick={() => { setCategoryFilter(''); setFilter('') }} className="!m-0 !rounded-lg !border !border-slate-300 !bg-transparent !px-3 !py-2.5 !text-sm !font-medium !text-slate-700 transition hover:!bg-slate-100 dark:!border-slate-700 dark:!text-slate-300 dark:hover:!bg-slate-800">Clear filters</button>}</div>
    {filter === 'reorder' && <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80"><h2 className="font-semibold text-slate-900 dark:text-white">Reorder suggestions</h2>{reorderProducts.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{reorderProducts.map((product) => <div key={product.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"><p className="font-semibold text-slate-900 dark:text-white">{product.name}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{product.category || 'Uncategorized'}</p><div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300"><div className="flex justify-between"><span>Current stock</span><span>{product.current_stock} units</span></div><div className="flex justify-between"><span>Low-stock threshold</span><span>{product.low_stock_threshold} units</span></div><div className="flex justify-between"><span>Supplier</span><span>{product.supplier || 'N/A'}</span></div><div className="flex justify-between"><span>Purchase price</span><span>{product.purchase_price == null ? 'N/A' : money(product.purchase_price)}</span></div><div className="flex justify-between"><span>Next eligible expiry</span><span>{product.soonest_expiry ? `${product.soonest_expiry} · ${product.soonest_expiry_quantity} units` : 'No dated batch'}</span></div><div className="rounded-lg bg-cyan-500/10 p-2 text-sm font-medium text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">Suggested Order Quantity: {product.suggested_order_quantity} units</div><button type="button" onClick={() => openStockEntry(product, product.suggested_order_quantity)} className="!m-0 !rounded-lg !bg-cyan-500 !px-3 !py-2 !text-sm !font-medium !text-slate-950">Prepare stock entry</button><p className="text-xs text-slate-500 dark:text-slate-400">Review and save the batch details to confirm; stock is not changed until you submit.</p></div></div>)}</div> : <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No products need reorder right now.</p>}</div>}
    <div className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {filteredProducts.length ? filteredProducts.map((item) => {
        const activeBatchCount = item.batches.filter((batch) => batch.quantity_remaining > 0 && batch.status !== 'Expired').length
        return (
        <article key={item.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-words text-base font-semibold text-slate-900 dark:text-white">{item.name}</h2>
              <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">{item.category || 'Uncategorized'} <span aria-hidden="true">·</span> SKU: {item.sku || '-'}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${productStatusStyles[item.status] || productStatusStyles.Healthy}`}>{item.status}</span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Available stock</p><p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{item.stock} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">units</span></p></div>
            <span className="pb-1 text-xs text-slate-500 dark:text-slate-400">{activeBatchCount} {activeBatchCount === 1 ? 'batch' : 'batches'}</span>
          </div>
          <div className="mt-4 min-w-0 flex-1 space-y-3">
            {item.batches.filter((batch) => batch.quantity_remaining > 0).map((batch) => (
              <div key={batch.id} className={`min-w-0 rounded-xl border p-3 ${batch.status === 'Expired' ? 'border-rose-200 bg-rose-50/70 dark:border-rose-950 dark:bg-rose-950/20' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60'}`}>
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-900 dark:text-white">{batch.batch_number}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Batch ID #{batch.id}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {batch.sell_first && <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold leading-4 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300">Sell First</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 ${batchStatusStyles[batch.status] || batchStatusStyles.Healthy}`}>{batch.status}</span>
                    {batch.quantity_remaining > 0 && <button type="button" title="Remove/discard batch" aria-label={`Remove/discard batch ${batch.batch_number}`} onClick={() => openDiscardDialog(item, batch)} className="!m-0 !inline-flex !h-7 !w-7 !items-center !justify-center !rounded-md !border !border-rose-200 !bg-white !p-0 !text-rose-600 hover:!bg-rose-50 dark:!border-rose-900 dark:!bg-slate-900 dark:!text-rose-400 dark:hover:!bg-rose-950/50"><Minus size={15} strokeWidth={2.5} /></button>}
                  </div>
                </div>
                <div className="mt-3 grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div className="min-w-0"><p className="text-slate-500 dark:text-slate-400">Available quantity</p><p className="mt-0.5 break-words font-medium text-slate-800 dark:text-slate-200">{batch.quantity_remaining} units</p></div>
                  <div className="min-w-0 text-right"><p className="text-slate-500 dark:text-slate-400">Expiry date</p><p className={`mt-0.5 break-words font-medium ${batch.status === 'Expired' ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-slate-200'}`}>{displayDate(batch.expiry_date)}</p></div>
                  <div className="min-w-0"><p className="text-slate-500 dark:text-slate-400">Purchase price</p><p className="mt-0.5 break-words font-medium text-slate-800 dark:text-slate-200">{money(batch.purchase_price)}</p></div>
                  <div className="min-w-0 text-right"><p className="text-slate-500 dark:text-slate-400">Selling price</p><p className="mt-0.5 break-words font-medium text-slate-800 dark:text-slate-200">{money(batch.selling_price)}</p></div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => remove(item.id)} className="!m-0 !mt-4 !inline-flex !w-fit !items-center !gap-2 !bg-transparent !p-0 !text-sm !text-rose-600 dark:!text-rose-400"><Trash2 size={15} /> Delete product</button>
        </article>
      )}) : <p className="text-sm text-slate-500 dark:text-slate-400">{filter ? `No ${filter === 'low-stock' ? 'low-stock' : 'expiring-soon'} products found.` : 'No products added yet.'}</p>}
    </div>
    <Dialog open={Boolean(discardTarget)} onOpenChange={(open) => { if (!open && !discarding) setDiscardTarget(null) }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-8 text-lg font-semibold">Discard inventory batch?</DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-300">You are about to remove this batch&apos;s remaining stock from active inventory. This action will not affect other batches of the same product.</DialogDescription>
        </DialogHeader>
        {discardTarget && <div className="space-y-4">
          {discardError && <p role="alert" className="break-words rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{discardError}</p>}
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">The remaining quantity will be written off and recorded in the inventory adjustment history.</div>
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-950/70">
            <dt className="text-slate-500 dark:text-slate-400">Product</dt><dd className="break-words text-right font-medium">{discardTarget.product.name}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Batch ID</dt><dd className="text-right font-medium">#{discardTarget.batch.id} · {discardTarget.batch.batch_number}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Remaining quantity</dt><dd className="text-right font-medium">{discardTarget.batch.quantity_remaining} units</dd>
            <dt className="text-slate-500 dark:text-slate-400">Expiry date</dt><dd className="text-right font-medium">{displayDate(discardTarget.batch.expiry_date)}</dd>
          </dl>
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">Reason
            <select value={discardReason} onChange={(event) => setDiscardReason(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
              <option value="Expired">Expired</option><option value="Damaged">Damaged</option><option value="Other">Other</option>
            </select>
          </label>
          {discardReason === 'Other' && <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">Note (optional)
            <input value={discardNote} maxLength={200} onChange={(event) => setDiscardNote(event.target.value)} placeholder="Briefly describe the reason" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>}
        </div>}
        <DialogFooter className="border-slate-200 dark:border-slate-700">
          <button type="button" disabled={discarding} onClick={() => setDiscardTarget(null)} className="!m-0 !rounded-lg !border !border-slate-300 !bg-transparent !px-4 !py-2.5 !text-sm !font-medium !text-slate-700 disabled:!opacity-50 dark:!border-slate-700 dark:!text-slate-200">Cancel</button>
          <button type="button" disabled={discarding || !discardTarget?.batch.quantity_remaining} onClick={() => void discardBatch()} className="!m-0 !rounded-lg !bg-rose-600 !px-4 !py-2.5 !text-sm !font-semibold !text-white disabled:!cursor-wait disabled:!opacity-60">{discarding ? 'Discarding…' : 'Confirm Discard'}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {scannerOpen && <ScannerModal onDetected={handleScan} onClose={() => setScannerOpen(false)} />}
  </section>
}
