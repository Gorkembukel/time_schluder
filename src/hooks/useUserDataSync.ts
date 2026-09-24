import { useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useFinanceCategoriesStore } from '../stores/financeCategoriesStore'
import { useLifeAreasStore } from '../stores/lifeAreasStore'
import { useTasksStore } from '../stores/tasksStore'

/** Kullanıcı oturum açtığında Firestore abonelikleri kurar, çıkışta temizler. */
export function useUserDataSync(uid: string) {
  const connectSettings = useSettingsStore((s) => s.connect)
  const disconnectSettings = useSettingsStore((s) => s.disconnect)
  const connectCategories = useFinanceCategoriesStore((s) => s.connect)
  const disconnectCategories = useFinanceCategoriesStore((s) => s.disconnect)
  const connectLifeAreas = useLifeAreasStore((s) => s.connect)
  const disconnectLifeAreas = useLifeAreasStore((s) => s.disconnect)
  const connectTasks = useTasksStore((s) => s.connect)
  const disconnectTasks = useTasksStore((s) => s.disconnect)

  useEffect(() => {
    connectSettings(uid)
    connectCategories(uid)
    connectLifeAreas(uid)
    connectTasks(uid)
    return () => {
      disconnectSettings()
      disconnectCategories()
      disconnectLifeAreas()
      disconnectTasks()
    }
  }, [
    uid,
    connectSettings,
    disconnectSettings,
    connectCategories,
    disconnectCategories,
    connectLifeAreas,
    disconnectLifeAreas,
    connectTasks,
    disconnectTasks,
  ])
}
