import Sidebar from '../components/layout/Sidebar'
import TopNavbar from '../components/layout/TopNavbar'

export default function DashboardLayout({ children, darkMode, onToggleTheme }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar isDarkMode={darkMode} />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopNavbar darkMode={darkMode} onToggleTheme={onToggleTheme} />
          <main className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(135deg,_#f8fafc,_#e2e8f0)] p-6 dark:bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_35%),linear-gradient(135deg,_#020617,_#0f172a)]">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
