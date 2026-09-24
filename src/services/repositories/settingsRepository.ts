import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase'
import { DEFAULT_SETTINGS, type Settings } from '../../config/constants'

function settingsDocRef(uid: string) {
  return doc(db, 'users', uid, 'meta', 'settings')
}

/**
 * Kayıtlı ayarları varsayılanlarla bölüm bazında birleştirir — sonradan eklenen bir alan
 * (ör. planningEngine.plannableRatio) eski dokümanlarda eksik olsa bile varsayılanı gelir.
 */
export function mergeWithDefaults(stored: Partial<Settings>): Settings {
  const merged = { ...DEFAULT_SETTINGS } as Record<string, unknown>
  for (const [key, value] of Object.entries(stored)) {
    if (value === undefined) continue
    const fallback = (DEFAULT_SETTINGS as unknown as Record<string, unknown>)[key]
    merged[key] =
      fallback && typeof fallback === 'object' && value && typeof value === 'object'
        ? { ...fallback, ...value }
        : value
  }
  return merged as unknown as Settings
}

/** Ayar dokümanı yoksa (ilk giriş) varsayılanlarla seed eder. */
export function subscribeSettings(
  uid: string,
  onChange: (settings: Settings) => void,
): Unsubscribe {
  return onSnapshot(settingsDocRef(uid), (snapshot) => {
    if (snapshot.exists()) {
      onChange(mergeWithDefaults(snapshot.data() as Partial<Settings>))
    } else {
      void setDoc(settingsDocRef(uid), DEFAULT_SETTINGS)
      onChange(DEFAULT_SETTINGS)
    }
  })
}

export async function updateSettings(uid: string, partial: Partial<Settings>): Promise<void> {
  await setDoc(settingsDocRef(uid), partial, { merge: true })
}
