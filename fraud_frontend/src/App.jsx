import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import PredictPage from './pages/Predict'
import TransactionsPage from './pages/Transactions'
import HighRiskPage from './pages/HighRisk'
import ModelsPage from './pages/Models'
import LoginPage from './pages/Login'
import './index.css'

function AppShell() {
  const { auth, logout } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [modelKey, setModelKey] = useState(0)

  if (!auth) return <LoginPage />

  const isAdmin = auth.role === 'admin'

  const pages = {
    dashboard:    <Dashboard />,
    transactions: <TransactionsPage />,
    'high-risk':  <HighRiskPage />,
    ...(!isAdmin && {
      predict: <PredictPage />,
    }),
    ...(isAdmin && {
      models: <ModelsPage onModelChange={() => setModelKey(k => k + 1)} />,
    }),
  }

  // Nếu customer cố truy cập predict / models → redirect về dashboard
  const activePage = pages[page] ? page : 'dashboard'

  return (
    <div className="app-shell">
      <Sidebar
        key={modelKey}
        page={activePage}
        setPage={setPage}
        role={auth.role}
        username={auth.username}
        onLogout={logout}
      />
      <main className="main-content">
        {pages[activePage] ?? <Dashboard />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppShell />
      </NotificationProvider>
    </AuthProvider>
  )
}
