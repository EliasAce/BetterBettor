import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './components/Toast'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import BetPage from './pages/BetPage'
import MyBetsPage from './pages/MyBetsPage'
import LeaguePage from './pages/LeaguePage'

function AppShell() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-shell">
        <div className="spinner-wrap" style={{ height: '100dvh' }}>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  if (!session) return <AuthPage />

  return (
    <div className="app-shell">
      <Header />
      <Routes>
        <Route path="/"        element={<DashboardPage />} />
        <Route path="/bet"     element={<BetPage />} />
        <Route path="/bets"    element={<MyBetsPage />} />
        <Route path="/league"  element={<LeaguePage />} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}


