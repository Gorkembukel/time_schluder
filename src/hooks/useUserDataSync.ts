import { useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useFinanceCategoriesStore } from '../stores/financeCategoriesStore'
import { useLifeAreasStore } from '../stores/lifeAreasStore'

/** Kullanıcı oturum açtığında Firestore abonelikleri kurar, çıkışta temizler. */
export function useUserDataSync(uid: string) {
  const connectSettings = useSettingsStore((s) => s.connect)
  const disconnectSettings = useSettingsStore((s) => s.disconnect)
  const connectCategories = useFinanceCategoriesStore((s) => s.connect)
  const disconnectCategories = useFinanceCategoriesStore((s) => s.disconnect)
  const connectLifeAreas = useLifeAreasStore((s) => s.connect)
  const disconnectLifeAreas = useLifeAreasStore((s) => s.disconnect)

  useEffect(() => {
    connectSettings(uid)
    connectCategories(uid)
    connectLifeAreas(uid)
    return () => {
      disconnectSettings()
      disconnectCategories()
      disconnectLifeAreas()
    }
  }, [
    uid,
    connectSettings,
    disconnectSettings,
    connectCategories,
    disconnectCategories,
    connectLifeAreas,
    disconnectLifeAreas,
  ])
}
