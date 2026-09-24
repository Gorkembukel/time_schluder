import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addDays } from 'date-fns'
import { UidProvider } from '../../app/UidContext'
import { useTasksStore } from '../../stores/tasksStore'
import { useRoutinesStore } from '../../stores/routinesStore'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { DEFAULT_SETTINGS } from '../../config/constants'
import { weekRange } from '../../lib/dateRange'
import type { Task } from '../../types/domain'
import { ProgramPage } from './ProgramPage'

vi.mock('../../services/repositories/tasksRepository', () => {
  let n = 0
  return {
    createTask: vi.fn(),
    createTasksBatch: vi.fn().mockResolvedValue(undefined),
    deleteTask: vi.fn(),
    newTaskId: () => `id-${++n}`,
    updateTaskFields: vi.fn(),
    updateTaskStatus: vi.fn(),
    updateTaskDependencies: vi.fn(),
  }
})
vi.mock('../../services/repositories/routinesRepository', () => ({
  createRoutine: vi.fn(),
  deleteRoutine: vi.fn(),
}))

import { createTasksBatch } from '../../services/repositories/tasksRepository'

const nextWeek = weekRange(addDays(new Date(), 7), DEFAULT_SETTINGS.calendarTime.weekStartsOn)

const weekGoal: Task = {
  id: 'wg',
  title: 'Tez bölümü yaz',
  scale: 'week',
  startAt: nextWeek.start.toISOString(),
  endAt: nextWeek.end.toISOString(),
  lifeAreaId: 'kariyer',
  status: 'planned',
  dependencies: [],
  bufferMinutes: 0,
  detailLevel: 'detailed',
}

function renderPage() {
  return render(
    <MemoryRouter>
      <UidProvider uid="test-uid">
        <ProgramPage />
      </UidProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(createTasksBatch).mockClear()
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
  useLifeAreasStore.setState({
    areas: [{ id: 'kariyer', name: 'Kariyer', order: 0, createdAt: '', updatedAt: '' }],
    loading: false,
  })
  useTasksStore.setState({ tasks: [weekGoal], loading: false })
  useRoutinesStore.setState({
    routines: [
      {
        id: 'r',
        title: 'Fizik dersi',
        weekdays: [1, 2, 3, 4, 5, 6, 7],
        startTime: '09:00',
        endTime: '11:00',
        createdAt: '',
      },
    ],
    loading: false,
  })
})

describe('ProgramPage', () => {
  it('sabit programı ızgarada, haftanın hedefini havuzda gösterir', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Sonraki hafta' }))
    expect(screen.getAllByText('Fizik dersi').length).toBeGreaterThanOrEqual(7)
    expect(screen.getByRole('listitem', { name: 'Tez bölümü yaz' })).toBeInTheDocument()
  })

  it('havuzdaki işi ilk uygun boşluğa, rutinle çakıştırmadan yerleştirir', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Sonraki hafta' }))
    const item = screen.getByRole('listitem', { name: 'Tez bölümü yaz' })
    await userEvent.click(within(item).getByRole('button', { name: /ilk uygun boşluğa/ }))
    const [, created] = vi.mocked(createTasksBatch).mock.calls[0]
    expect(created).toHaveLength(1)
    const start = new Date(created[0].startAt)
    expect(created[0].parentTaskId).toBe('wg')
    // gün 06:00'da başlar, 09:00–11:00 rutin; 60 dk blok 06:00'a sığar
    expect(start.getHours()).toBe(DEFAULT_SETTINGS.calendarTime.dayStartHour)
  })

  it('otomatik plan önizlemesi gösterir ve onaylanınca toplu yazar', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Sonraki hafta' }))
    await userEvent.click(screen.getByRole('button', { name: /Otomatik planla/ }))
    expect(screen.getByText('Robot planı önizlemesi')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Uygula ve robota ver/ }))
    expect(createTasksBatch).toHaveBeenCalled()
    expect(await screen.findByText(/Robota \d+ yeni görev verildi/)).toBeInTheDocument()
  })
})
