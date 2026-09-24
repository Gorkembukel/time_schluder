import { useState, type FormEvent } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type AuthError,
} from 'firebase/auth'
import { Clock } from 'lucide-react'
import { auth } from '../../services/firebase'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'

function translateAuthError(error: AuthError): string {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi.'
    case 'auth/email-already-in-use':
      return 'Bu e-posta ile zaten bir hesap var, giriş yapmayı dene.'
    case 'auth/weak-password':
      return 'Şifre en az 6 karakter olmalı.'
    case 'auth/invalid-credential':
      return 'E-posta veya şifre hatalı.'
    default:
      return 'Bir şeyler ters gitti, tekrar dene.'
  }
}

export function GirisPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      setError(translateAuthError(err as AuthError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Clock size={24} />
          </div>
          <p className="text-sm font-bold tracking-tight text-text">Zaman Schluder</p>
        </div>
        <Card className="p-6">
          <h1 className="text-lg font-semibold text-text">
            {mode === 'signin' ? 'Giriş yap' : 'Hesap oluştur'}
          </h1>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              E-posta
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Şifre
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" disabled={submitting} className="mt-1 w-full">
              {mode === 'signin' ? 'Giriş yap' : 'Hesap oluştur'}
            </Button>
          </form>
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="mt-3 text-sm text-primary hover:underline"
          >
            {mode === 'signin' ? 'Hesabın yok mu? Oluştur' : 'Zaten hesabın var mı? Giriş yap'}
          </button>
        </Card>
      </div>
    </div>
  )
}
