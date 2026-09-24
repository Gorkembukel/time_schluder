import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UidProvider } from '../../app/UidContext'
import { useTasksStore } from '../../stores/tasksStore'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import type { Task } from '../../types/domain'
import { KanbanPage } from './KanbanPage'

vi.mock('../../services/repositories/tasksRepository', () => ({
  updateTaskStatus: vi.fn().mockResolvedValue(undefined),
  updateTaskDependencies: vi.fn().mockResolvedValue(undefined),
}))

import {
  updateTaskDependencies,
  updateTaskStatus,
} from '../../services/repositories/tasksRepository'
import { DEPENDENCY_DRAG_MIME } from './dependencies'

function task(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: overrides.id,
    scale: 'month',
    startAt: '2020-01-01T00:00:00.000Z',
    endAt: '2099-01-01T00:00:00.000Z',
    status: 'planned',
    dependencies: [],
    bufferMinutes: 0,
    detailLevel: 'rough',
    ...overrides,
  }
}

beforeEach(() => {
  vi.mocked(updateTaskStatus).mockClear()
  vi.mocked(updateTaskDependencies).mockClear()
  useLifeAreasStore.setState({
    areas: [{ id: 'saglik', name: 'Sağlık', order: 0, createdAt: '', updatedAt: '' }],
    loading: false,
  })
  useTasksStore.setState({
    loading: false,
    tasks: [
      task({ id: 'epic', title: 'Maraton koş', scale: 'year3', lifeAreaId: 'saglik' }),
      task({ id: 'story', title: 'Haftada 3 koşu', parentTaskId: 'epic', status: 'in-progress' }),
      task({
        id: 'late',
        title: 'Ayakkabı al',
        parentTaskId: 'story',
        scale: 'day',
        endAt: '2020-01-02T00:00:00.000Z',
      }),
    ],
  })
})

function renderPage() {
  return render(
    <UidProvider uid="test-uid">
      <KanbanPage />
    </UidProvider>,
  )
}

describe('KanbanPage', () => {
  it('işleri durum kolonlarına dağıtır ve hiyerarşi izini gösterir', () => {
    renderPage()
    const planned = screen.getByRole('region', { name: 'Planlandı' })
    const inProgress = screen.getByRole('region', { name: 'Devam ediyor' })
    expect(within(planned).getByRole('article', { name: 'Maraton koş' })).toBeInTheDocument()
    expect(within(inProgress).getByRole('article', { name: 'Haftada 3 koşu' })).toBeInTheDocument()
    const late = within(planned).getByRole('article', { name: 'Ayakkabı al' })
    const trail = within(late).getByRole('navigation', { name: 'Hiyerarşi' })
    expect(trail).toHaveTextContent('Sağlık')
    expect(trail).toHaveTextContent('Maraton koş')
    expect(trail).toHaveTextContent('Haftada 3 koşu')
  })

  it('bitiş tarihi geçmiş işi Gecikti rozetiyle işaretler', () => {
    renderPage()
    expect(screen.getAllByText('Gecikti')).toHaveLength(1)
  })

  it('ok butonuyla işi sonraki kolona taşır', async () => {
    renderPage()
    await userEvent.click(
      screen.getByRole('button', { name: 'Ayakkabı al: Devam ediyor kolonuna taşı' }),
    )
    expect(updateTaskStatus).toHaveBeenCalledWith('test-uid', 'late', 'in-progress')
  })

  it('sadece gecikenler filtresi uygular', async () => {
    renderPage()
    await userEvent.click(screen.getByLabelText('Sadece gecikenler'))
    expect(screen.queryByRole('article', { name: 'Maraton koş' })).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Ayakkabı al' })).toBeInTheDocument()
  })

  it('bir işin tutamacı başka işin üzerine bırakılınca tür seçtirip bağımlılık kaydeder', async () => {
    renderPage()
    const target = screen.getByRole('article', { name: 'Maraton koş' })
    const dataTransfer = {
      types: [DEPENDENCY_DRAG_MIME],
      getData: (type: string) => (type === DEPENDENCY_DRAG_MIME ? 'late' : ''),
    }
    fireEvent.dragOver(target, { dataTransfer })
    fireEvent.drop(target, { dataTransfer })
    await userEvent.click(within(target).getByRole('button', { name: /^SS/ }))
    expect(updateTaskDependencies).toHaveBeenCalledWith('test-uid', 'epic', [
      { taskId: 'late', type: 'SS', lagMinutes: 0 },
    ])
  })

  it('döngü oluşturacak bağı reddeder', () => {
    renderPage()
    // late zaten epic'e bağlı; epic'i late'e bağlamak döngü yaratır.
    useTasksStore.setState((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === 'late'
          ? { ...t, dependencies: [{ taskId: 'epic', type: 'FS', lagMinutes: 0 }] }
          : t,
      ),
    }))
    const target = screen.getByRole('article', { name: 'Maraton koş' })
    const dataTransfer = { types: [DEPENDENCY_DRAG_MIME], getData: () => 'late' }
    fireEvent.drop(target, { dataTransfer })
    expect(within(target).getByText(/Döngü oluşur/)).toBeInTheDocument()
  })
})
