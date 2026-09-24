import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UidProvider } from '../../app/UidContext'
import { useTasksStore } from '../../stores/tasksStore'
import type { Task } from '../../types/domain'
import { RobotPage } from './RobotPage'

vi.mock('../../services/repositories/tasksRepository', () => ({
  updateTaskStatus: vi.fn().mockResolvedValue(undefined),
  updateTaskFields: vi.fn().mockResolvedValue(undefined),
}))

import { updateTaskStatus } from '../../services/repositories/tasksRepository'

const HOUR_MS = 3_600_000

function block(id: string, startOffsetHours: number, overrides: Partial<Task> = {}): Task {
  const start = new Date(Date.now() + startOffsetHours * HOUR_MS)
  return {
    id,
    title: id,
    scale: 'hour',
    startAt: start.toISOString(),
    endAt: new Date(start.getTime() + HOUR_MS).toISOString(),
    status: 'planned',
    dependencies: [],
    bufferMinutes: 0,
    detailLevel: 'detailed',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <UidProvider uid="test-uid">
        <RobotPage />
      </UidProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.mocked(updateTaskStatus).mockClear())

describe('RobotPage', () => {
  it('görev yokken robot boşta olduğunu söyler ve programa yönlendirir', () => {
    useTasksStore.setState({ tasks: [], loading: false })
    renderPage()
    expect(screen.getByText(/Bugün için görevim yok/)).toBeInTheDocument()
    expect(screen.getByText('Seviye 1')).toBeInTheDocument()
  })

  it('şu anki görevi gösterir, tamamlayınca XP kutlaması yapar', async () => {
    useTasksStore.setState({ tasks: [block('Kitap oku', -0.25)], loading: false })
    renderPage()
    expect(screen.getByText(/Şu an "Kitap oku" üzerindeyim/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tamamla' }))
    expect(updateTaskStatus).toHaveBeenCalledWith('test-uid', 'Kitap oku', 'done')
    expect(await screen.findByText(/\+7 XP/)).toBeInTheDocument()
  })
})
