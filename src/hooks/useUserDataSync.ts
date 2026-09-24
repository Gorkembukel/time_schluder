import { useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useFinanceCategoriesStore } from '../stores/financeCategoriesStore'
import { useLifeAreasStore } from '../stores/lifeAreasStore'
import { useTasksStore } from '../stores/tasksStore'
import { useRoutinesStore } from '../stores/routinesStore'

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
  const connectRoutines = useRoutinesStore((s) => s.connect)
  const disconnectRoutines = useRoutinesStore((s) => s.disconnect)

  useEffect(() => {
    connectSettings(uid)
    connectCategories(uid)
    connectLifeAreas(uid)
    connectTasks(uid)
    connectRoutines(uid)
    return () => {
      disconnectSettings()
      disconnectCategories()
      disconnectLifeAreas()
      disconnectTasks()
      disconnectRoutines()
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
    connectRoutines,
    disconnectRoutines,
  ])
}
