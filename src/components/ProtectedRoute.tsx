// src/components/ProtectedRoute.tsx
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth()
  const { t } = useTranslation()

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg)', color: 'var(--text3)',
        fontFamily: 'DM Sans, sans-serif', fontSize: '14px'
      }}>
        {t('common.loading')}
      </div>
    )
  }

  return <>{children}</>
}
