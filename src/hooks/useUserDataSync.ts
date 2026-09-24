import { useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useFinanceCategoriesStore } from '../stores/financeCategoriesStore'

/** Kullanıcı oturum açtığında Firestore abonelikleri kurar, çıkışta temizler. */
export function useUserDataSync(uid: string) {
  const connectSettings = useSettingsStore((s) => s.connect)
  const disconnectSettings = useSettingsStore((s) => s.disconnect)
  const connectCategories = useFinanceCategoriesStore((s) => s.connect)
  const disconnectCategories = useFinanceCategoriesStore((s) => s.disconnect)

  useEffect(() => {
    connectSettings(uid)
    connectCategories(uid)
    return () => {
      disconnectSettings()
      disconnectCategories()
    }
  }, [uid, connectSettings, disconnectSettings, connectCategories, disconnectCategories])
}
