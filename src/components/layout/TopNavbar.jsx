import { Bell, LogOut, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../services/api'

function getStoredUser() {
  if (typeof window === 'undefined') return null

  try {
    return JSON.parse(localStorage.getItem('smartkart_user'))
  } catch {
    return null
  }
}

export default function TopNavbar({ darkMode, onToggleTheme }) {
  const [user, setUser] = useState(() => getStoredUser())
  const [notifications, setNotifications] = useState([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  useEffect(() => {
    setUser(getStoredUser())
    apiFetch('/notifications').then(setNotifications).catch(() => setNotifications([]))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('smartkart_user')
    setUser(null)
    navigate('/login')
  }

  const handleNotificationClick = async (item) => {
    if (item.is_read) {
      if (item.type === 'reorder') navigate('/inventory', { state: { inventoryFilter: 'reorder', reorderProductId: item.related_id } })
      return
    }

    try {
      await apiFetch(`/notifications/${item.id}/read`, { method: 'PATCH' })
      setNotifications((items) => items.map((entry) => entry.id === item.id ? { ...entry, is_read: 1 } : entry))
    } catch {
      setNotifications((items) => items)
    }

    if (item.type === 'reorder') {
      navigate('/inventory', { state: { inventoryFilter: 'reorder', reorderProductId: item.related_id } })
    }
  }

  const displayName = user?.name?.trim() ? user.name : 'Store Owner'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <header className="relative z-50 flex items-center justify-between border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div />

      <div className="flex items-center gap-3">
        <div className="relative">
          <button type="button" title="Notifications" onClick={() => setNotificationsOpen((value) => !value)} className="relative rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white">
            <Bell size={18} />
            {notifications.filter((item) => !item.is_read).length > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] text-white">{notifications.filter((item) => !item.is_read).length}</span>}
          </button>
          {notificationsOpen && <div className="absolute right-0 z-50 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between px-2"><p className="font-semibold text-slate-900 dark:text-white">Notifications</p>{notifications.some((item) => !item.is_read) && <button type="button" onClick={async () => { try { await apiFetch('/notifications/read-all', { method: 'PATCH' }); setNotifications((items) => items.map((item) => ({ ...item, is_read: 1 }))) } catch { setNotifications((items) => items) } }} className="!m-0 !bg-transparent !p-0 !text-xs !text-cyan-700 dark:!text-cyan-400">Mark all read</button>}</div><div className="mt-2 max-h-80 space-y-1 overflow-auto">{notifications.some((item) => !item.is_read) ? notifications.map((item) => <button type="button" key={item.id} onClick={() => handleNotificationClick(item)} className={`!m-0 !block !w-full !rounded-xl !p-3 !text-left ${item.is_read ? '!bg-transparent' : '!bg-cyan-50 dark:!bg-cyan-950/30'}`}><p className="text-sm text-slate-900 dark:text-white">{item.message}</p>{item.expiry_date && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Expiry: {item.expiry_date} · {item.days_remaining} days remaining</p>}<p className="mt-1 text-[11px] uppercase text-slate-500 dark:text-slate-400">{item.type === 'reorder' ? 'reorder alert' : item.type.replace('_', ' ')}</p></button>) : <p className="px-2 py-4 text-sm text-slate-500 dark:text-slate-400">No new notifications.</p>}</div></div>}
        </div>
        <button
          onClick={onToggleTheme}
          className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="ml-2 flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-semibold text-white">
            {initials || 'S'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email ? 'Signed in' : 'Store Manager'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-1 rounded-full p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
