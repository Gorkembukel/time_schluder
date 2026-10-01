import { useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useFinanceCategoriesStore } from '../stores/financeCategoriesStore'
import { useLifeAreasStore } from '../stores/lifeAreasStore'
import { useTasksStore } from '../stores/tasksStore'
import { useRoutinesStore } from '../stores/routinesStore'
import { useTopicTemplatesStore } from '../stores/topicTemplatesStore'

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
  const connectTopicTemplates = useTopicTemplatesStore((s) => s.connect)
  const disconnectTopicTemplates = useTopicTemplatesStore((s) => s.disconnect)

  useEffect(() => {
    connectSettings(uid)
    connectCategories(uid)
    connectLifeAreas(uid)
    connectTasks(uid)
    connectRoutines(uid)
    connectTopicTemplates(uid)
    return () => {
      disconnectSettings()
      disconnectCategories()
      disconnectLifeAreas()
      disconnectTasks()
      disconnectRoutines()
      disconnectTopicTemplates()
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
    connectTopicTemplates,
    disconnectTopicTemplates,
  ])
}
