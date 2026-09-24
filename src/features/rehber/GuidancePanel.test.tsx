import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useTasksStore } from '../../stores/tasksStore'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { DEFAULT_SETTINGS } from '../../config/constants'
import type { Task } from '../../types/domain'
import { GuidancePanel } from './GuidancePanel'

function goal(id: string, lifeAreaId: string): Task {
  return {
    id,
    title: id,
    scale: 'month',
    startAt: new Date(2000, 0, 1).toISOString(),
    endAt: new Date(2100, 0, 1).toISOString(),
    lifeAreaId,
    status: 'planned',
    dependencies: [],
    bufferMinutes: 0,
    detailLevel: 'rough',
  }
}

const period = { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1) }

beforeEach(() => {
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
  useLifeAreasStore.setState({
    areas: ['Sağlık', 'Kariyer', 'Sosyal', 'Finans', 'Hobi'].map((name, order) => ({
      id: name,
      name,
      order,
      createdAt: '',
      updatedAt: '',
    })),
    loading: false,
  })
})

describe('GuidancePanel', () => {
  it('veri yokken bile kapasiteyi ve alan önerilerini kullanıcı girdisi olmadan gösterir', () => {
    useTasksStore.setState({ tasks: [goal('Maraton', 'Sağlık')], loading: false })
    render(<GuidancePanel period={period} periodScale="month" />)
    expect(screen.getByText('Ay rehberi')).toBeInTheDocument()
    expect(screen.getByText(/Sağlık: bütçenin .* daha planla/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Sağlık: bütçe/ })).toBeInTheDocument()
  })

  it('çok öneri varsa ilk birkaçını gösterir, gerisini açılır yapar', async () => {
    useTasksStore.setState({ tasks: [], loading: false })
    render(<GuidancePanel period={period} periodScale="month" />)
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    await userEvent.click(screen.getByRole('button', { name: /Tüm önerileri göster \(5\)/ }))
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
  })
})
