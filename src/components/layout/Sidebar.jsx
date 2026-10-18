import { Link, NavLink } from 'react-router-dom'
import { LayoutGrid, Boxes, Users, BadgeDollarSign, BarChart3, Sparkles, Settings, FileText, Receipt, LogIn } from 'lucide-react'
import SmartKartLogo from '../common/SmartKartLogo'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/billing', label: 'Billing', icon: Receipt },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/sales', label: 'Sales', icon: BadgeDollarSign },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/ai', label: 'AI Assistant', icon: Sparkles },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ isDarkMode }) {
  return (
    <aside className="flex min-h-screen w-72 flex-col border-r border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/95">
      <Link to="/dashboard" aria-label="Go to Dashboard" title="Go to Dashboard" className="flex h-36 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
        <SmartKartLogo isDarkMode={isDarkMode} className="h-full w-full max-w-[210px]" />
      </Link>

      <nav className="mt-8 space-y-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-700 shadow-sm dark:text-cyan-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <NavLink to="/ai" className="mt-auto block rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:border-cyan-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-cyan-700 dark:hover:bg-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-cyan-500/15 p-2 text-cyan-600 dark:text-cyan-300">
            <LogIn size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Need a quick hand?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Open the AI assistant</p>
          </div>
        </div>
      </NavLink>
    </aside>
  )
}
