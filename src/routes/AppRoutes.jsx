import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import LoginPage from '../pages/Login/LoginPage'
import RegisterPage from '../pages/Register/RegisterPage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import InventoryPage from '../pages/Inventory/InventoryPage'
import CustomersPage from '../pages/Customers/CustomersPage'
import SalesPage from '../pages/Sales/SalesPage'
import ReportsPage from '../pages/Reports/ReportsPage'
import AIPage from '../pages/AI/AIPage'
import InvoicesPage from '../pages/Invoices/InvoicesPage'
import SettingsPage from '../pages/Settings/SettingsPage'
import BillingPage from '../pages/Billing/BillingPage'
import ForgotPasswordPage from '../pages/Password/ForgotPasswordPage'
import ResetPasswordPage from '../pages/Password/ResetPasswordPage'

function AppShell({ children, darkMode, onToggleTheme }) {
  return <DashboardLayout darkMode={darkMode} onToggleTheme={onToggleTheme}>{children}</DashboardLayout>
}

function getStoredUser() {
  if (typeof window === 'undefined') return null

  try {
    const user = JSON.parse(localStorage.getItem('smartkart_user'))
    return user?.token ? user : null
  } catch {
    return null
  }
}

function ProtectedRoute({ children }) {
  const user = getStoredUser()
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const user = getStoredUser()
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function AppRoutes() {
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={getStoredUser() ? <Navigate to="/dashboard" replace /> : <Navigate to="/register" replace />} />
        <Route path="/login" element={<PublicRoute><LoginPage isDarkMode={darkMode} /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage isDarkMode={darkMode} /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage isDarkMode={darkMode} /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPasswordPage isDarkMode={darkMode} />} />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><AppShell darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)}><DashboardPage /></AppShell></ProtectedRoute>}
        />
        <Route
          path="/inventory"
          element={<ProtectedRoute><AppShell darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)}><InventoryPage /></AppShell></ProtectedRoute>}
        />
        <Route
          path="/billing"
          element={<ProtectedRoute><AppShell darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)}><BillingPage /></AppShell></ProtectedRoute>}
        />
        <Route
          path="/customers"
          element={<ProtectedRoute><AppShell darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)}><CustomersPage /></AppShell></ProtectedRoute>}
        />
        <Route
          path="/sales"
          element={<ProtectedRoute><AppShell darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)}><SalesPage /></AppShell></ProtectedRoute>}
        />
        <Route
          path="/reports"
          element={<ProtectedRoute><AppShell darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)}><ReportsPage /></AppShell></ProtectedRoute>}
        />
        <Route
          path="/ai"
          element={<ProtectedRoute><AppShell darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)}><AIPage /></AppShell></ProtectedRoute>}
        />
        <Route
          path="/invoices"
          element={<ProtectedRoute><AppShell darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)}><InvoicesPage /></AppShell></ProtectedRoute>}
        />
        <Route
          path="/settings"
          element={<ProtectedRoute><AppShell darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)}><SettingsPage /></AppShell></ProtectedRoute>}
        />
      </Routes>
    </BrowserRouter>
  )
}
