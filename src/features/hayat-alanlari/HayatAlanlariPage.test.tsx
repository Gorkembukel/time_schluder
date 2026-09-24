import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { UidProvider } from '../../app/UidContext'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { HayatAlanlariPage } from './HayatAlanlariPage'

vi.mock('../../services/repositories/lifeAreasRepository', () => ({
  subscribeLifeAreas: vi.fn(() => () => {}),
  createLifeArea: vi.fn().mockResolvedValue(undefined),
  renameLifeArea: vi.fn(),
  deleteLifeArea: vi.fn(),
}))

vi.mock('../../services/repositories/requirementsRepository', () => ({
  subscribeRequirements: vi.fn(() => () => {}),
  createRequirement: vi.fn(),
  updateRequirementProgress: vi.fn(),
  deleteRequirement: vi.fn(),
}))

import { createLifeArea } from '../../services/repositories/lifeAreasRepository'

function renderPage() {
  return render(
    <MemoryRouter>
      <UidProvider uid="test-uid">
        <HayatAlanlariPage />
      </UidProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useLifeAreasStore.setState({ areas: [], loading: false, uid: null, unsubscribe: null })
  vi.clearAllMocks()
})

describe('HayatAlanlariPage', () => {
  it('alan yokken boş durumu gösterir', () => {
    renderPage()
    expect(screen.getByText(/Henüz hayat alanı yok/)).toBeInTheDocument()
  })

  it('yeni alan eklenince createLifeArea çağrılır', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByPlaceholderText('Yeni hayat alanı (ör. Sağlık)'), 'Sağlık')
    await user.click(screen.getByRole('button', { name: 'Ekle' }))
    expect(createLifeArea).toHaveBeenCalledWith('test-uid', 'Sağlık', 0)
  })

  it('mevcut alanları listeler', () => {
    useLifeAreasStore.setState({
      areas: [{ id: 'a1', name: 'Mühendislik', order: 0, createdAt: '', updatedAt: '' }],
      loading: false,
      uid: 'test-uid',
      unsubscribe: null,
    })
    renderPage()
    expect(screen.getByText('Mühendislik')).toBeInTheDocument()
  })
})
