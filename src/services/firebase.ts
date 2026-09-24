import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

// Firebase web config anahtarları gizli değildir (güvenlik Firestore Security Rules'a
// dayanır, bkz. docs/decisions/0003-firestore-veri-modeli.md), ama yanlış projeye
// bağlanmayı önlemek için tek kaynaktan (env değişkenleri) okunur. Gerçek değerler
// için .env.example'a bakın.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Spark plan günlük okuma kotasını korumak için offline persistence + çoklu sekme
// desteği açık (bkz. docs/decisions/0003-firestore-veri-modeli.md, "Kota koruma stratejisi").
// ignoreUndefinedProperties: opsiyonel alanları (ör. lifeAreaId, requirementId) `undefined`
// bırakabilmek için — Firestore SDK varsayılan olarak undefined değerlerde hata fırlatır.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
})
