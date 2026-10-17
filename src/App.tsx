import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import GoldItemsPage from './pages/GoldItemsPage'
import styles from './App.module.css'

export default function App() {
  return (
    <BrowserRouter basename="/personal-app">
      <ThemeProvider>
        <div className={styles.canvas}>
          <main className={styles.main}>
            <div className={styles.body}>
              <Routes>
                <Route path="/" element={<GoldItemsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </ThemeProvider>
    </BrowserRouter>
  )
}
