import type { ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { useAuth } from '../features/auth/useAuth'
import { GirisPage } from '../features/auth/GirisPage'

export function AuthGate({ children }: { children: (user: User) => ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-secondary">
        Yükleniyor…
      </div>
    )
  }

  if (!user) {
    return <GirisPage />
  }

  return <>{children(user)}</>
}
