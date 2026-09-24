import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Testler gerçek Firebase'e bağlanmaz: CI'da VITE_FIREBASE_* env değişkenleri yok ve
// initializeApp/getAuth geçersiz API anahtarıyla import anında hata fırlatır. Repository
// davranışı gereken testler kendi repository mock'larını tanımlar.
vi.mock('../services/firebase', () => ({ app: {}, auth: {}, db: {} }))
