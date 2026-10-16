import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import GoldItemsPage from './pages/GoldItemsPage'
import styles from './App.module.css'

function AppReady() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg)', color: 'var(--text3)',
        fontSize: '14px', fontFamily: 'sans-serif'
      }}>
        Loading…
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<GoldItemsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/personal-app">
      <ThemeProvider>
        <AuthProvider>
          <div className={styles.canvas}>
            <main className={styles.main}>
              <div className={styles.body}>
                <AppReady />
              </div>
            </main>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
