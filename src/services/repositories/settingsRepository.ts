import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase'
import { DEFAULT_SETTINGS, type Settings } from '../../config/constants'

function settingsDocRef(uid: string) {
  return doc(db, 'users', uid, 'meta', 'settings')
}

/** Ayar dokümanı yoksa (ilk giriş) varsayılanlarla seed eder. */
export function subscribeSettings(uid: string, onChange: (settings: Settings) => void): Unsubscribe {
  return onSnapshot(settingsDocRef(uid), (snapshot) => {
    if (snapshot.exists()) {
      onChange({ ...DEFAULT_SETTINGS, ...(snapshot.data() as Partial<Settings>) })
    } else {
      void setDoc(settingsDocRef(uid), DEFAULT_SETTINGS)
      onChange(DEFAULT_SETTINGS)
    }
  })
}

export async function updateSettings(uid: string, partial: Partial<Settings>): Promise<void> {
  await setDoc(settingsDocRef(uid), partial, { merge: true })
}
