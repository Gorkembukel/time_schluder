import { useState, type FormEvent } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type AuthError,
} from 'firebase/auth'
import { auth } from '../../services/firebase'

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
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
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
          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-text disabled:opacity-60"
          >
            {mode === 'signin' ? 'Giriş yap' : 'Hesap oluştur'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="mt-3 text-sm text-primary"
        >
          {mode === 'signin' ? 'Hesabın yok mu? Oluştur' : 'Zaten hesabın var mı? Giriş yap'}
        </button>
      </div>
    </div>
  )
}
