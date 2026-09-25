import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Barcode, Plus, Trash2 } from 'lucide-react'
import { apiFetch, jsonBody } from '../../services/api'
import ScannerModal from '../../components/common/ScannerModal'

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

export default function InventoryPage() {
  const location = useLocation()
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(initialForm)
  const [showForm, setShowForm] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(() => location.state?.inventoryFilter || '')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [error, setError] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [reorderProducts, setReorderProducts] = useState([])
  const [supplierMenuOpen, setSupplierMenuOpen] = useState(false)

  const load = () => apiFetch(`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`).then(setProducts).catch((loadError) => setError(loadError.message))
  useEffect(() => { load() }, [search])
  useEffect(() => {
    if (filter !== 'reorder') {
      setReorderProducts([])
      return
    }
    apiFetch('/products/reorder')
      .then(setReorderProducts)
      .catch(() => setReorderProducts([]))
  }, [filter])

  const suppliers = useMemo(() => [...new Set(products.flatMap((product) => product.batches.map((batch) => batch.supplier)).filter(Boolean))].sort(), [products])
  const filteredSuppliers = useMemo(() => {
    const value = form.supplier.trim().toLowerCase()
    if (!value) return suppliers.slice(0, 8)
    return suppliers.filter((supplier) => supplier.toLowerCase().includes(value)).slice(0, 8)
  }, [form.supplier, suppliers])
  const filteredProducts = useMemo(() => {
    let result = categoryFilter ? products.filter((product) => product.category === categoryFilter) : products
    if (!filter) return result
    const today = new Date().toISOString().slice(0, 10)
    const alertDate = new Date()
    alertDate.setDate(alertDate.getDate() + 30)
    const alertDateString = alertDate.toISOString().slice(0, 10)
    if (filter === 'low-stock') return result.filter((product) => product.status === 'Low Stock' || product.status === 'Out of Stock')
    return result.filter((product) => product.batches.some((batch) => batch.quantity_remaining > 0 && batch.expiry_date > today && batch.expiry_date <= alertDateString))
  }, [categoryFilter, filter, products])
  const matchingNames = form.name.length > 1 ? products.filter((product) => product.name.toLowerCase().includes(form.name.toLowerCase())).slice(0, 5) : []

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

  return <section className="space-y-6">
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Inventory</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Track live stock, batches, prices, and expiry alerts.</p></div><button onClick={() => showForm ? setShowForm(false) : openForm()} className="!m-0 !inline-flex !items-center !gap-2 !rounded-lg !bg-cyan-500 !px-4 !py-3 !text-sm !font-semibold !text-slate-950"><Plus size={17} /> Add Product / Stock</button></div></div>
    {showForm && <form onSubmit={addProduct} className="rounded-2xl border border-cyan-500/30 bg-white/90 p-5 dark:bg-slate-900/80"><h2 className="font-semibold text-slate-900 dark:text-white">Add product batch</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="relative"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Product name" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />{matchingNames.length > 0 && <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">{matchingNames.map((product) => <button type="button" key={product.id} onClick={() => setForm({ ...form, name: product.name, category: product.category || '', sku: product.sku || '', barcode: product.barcode || '' })} className="!m-0 !block !w-full !rounded-md !bg-transparent !p-2 !text-left !text-sm !text-slate-900 hover:!bg-slate-100 dark:!text-white dark:hover:!bg-slate-800">{product.name} <span className="text-slate-500">{product.sku || ''}</span></button>)}</div>}</div>
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
    {formMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400">{formMessage}</p>}{error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    <div className="flex flex-wrap items-center gap-3"><div className="relative w-full min-w-0 max-w-md flex-1"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, SKU, or barcode" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /><button type="button" onClick={() => setScannerOpen(true)} aria-label="Scan inventory barcode" className="!m-0 !absolute !right-1 !top-1/2 !-translate-y-1/2 !bg-transparent !p-2 !text-slate-500 dark:!text-slate-300"><Barcode size={18} /></button></div><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category" className="h-12 min-w-[190px] max-w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">All Categories</option>{predefinedCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by stock or expiry" className="h-12 min-w-[160px] max-w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">All</option><option value="low-stock">Low Stock</option><option value="expiring">Expiring Soon</option><option value="reorder">Reorder Alerts</option></select>{(categoryFilter || filter) && <button type="button" onClick={() => { setCategoryFilter(''); setFilter('') }} className="!m-0 !rounded-lg !border !border-slate-300 !bg-transparent !px-3 !py-2.5 !text-sm !font-medium !text-slate-700 transition hover:!bg-slate-100 dark:!border-slate-700 dark:!text-slate-300 dark:hover:!bg-slate-800">Clear filters</button>}</div>
    {filter === 'reorder' && <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80"><h2 className="font-semibold text-slate-900 dark:text-white">Reorder suggestions</h2>{reorderProducts.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{reorderProducts.map((product) => <div key={product.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"><p className="font-semibold text-slate-900 dark:text-white">{product.name}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{product.category || 'Uncategorized'}</p><div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300"><div className="flex justify-between"><span>Current stock</span><span>{product.current_stock} units</span></div><div className="flex justify-between"><span>Low-stock threshold</span><span>{product.low_stock_threshold} units</span></div><div className="flex justify-between"><span>Supplier</span><span>{product.supplier || 'N/A'}</span></div><div className="flex justify-between"><span>Purchase price</span><span>₹{Number(product.purchase_price || 0).toLocaleString('en-IN')}</span></div><div className="rounded-lg bg-cyan-500/10 p-2 text-sm font-medium text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">Suggested Order Quantity: {product.suggested_order_quantity} units</div></div></div>)}</div> : <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No products need reorder right now.</p>}</div>}
    <div className="grid gap-4 lg:grid-cols-3">{filteredProducts.length ? filteredProducts.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-900 dark:text-white">{item.name}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.status === 'Low Stock' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : item.status === 'Out of Stock' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>{item.status}</span></div><p className="mt-2 text-sm text-slate-500">{item.category || 'Uncategorized'} · SKU: {item.sku || '-'}</p><p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">{item.stock} units</p><div className="mt-4 space-y-2">{item.batches.map((batch) => <div key={batch.id} className="rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-950"><div className="flex justify-between text-slate-500"><span>{batch.batch_number}</span><span>{batch.quantity_remaining} left</span></div><div className="mt-1 flex justify-between text-slate-400"><span>Buy {money(batch.purchase_price)} · Sell {money(batch.selling_price)}</span><span>{batch.expiry_date || 'No expiry'}</span></div></div>)}</div><button onClick={() => remove(item.id)} className="!m-0 !mt-4 !inline-flex !items-center !gap-2 !bg-transparent !p-0 !text-sm !text-rose-600 dark:!text-rose-400"><Trash2 size={15} /> Delete</button></div>) : <p className="text-sm text-slate-500 dark:text-slate-400">{filter ? `No ${filter === 'low-stock' ? 'low-stock' : 'expiring-soon'} products found.` : 'No products added yet.'}</p>}</div>
    {scannerOpen && <ScannerModal onDetected={handleScan} onClose={() => setScannerOpen(false)} />}
  </section>
}
