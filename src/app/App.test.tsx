import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HashRouter } from 'react-router-dom'
import { App } from './App'

vi.mock('../services/repositories/settingsRepository', () => ({
  subscribeSettings: (_uid: string, onChange: (settings: unknown) => void) => {
    onChange({
      general: { language: 'tr', currency: 'TRY' },
      calendarTime: { weekStartsOn: 1, dayStartHour: 6, dayEndHour: 23 },
      planningEngine: {
        detailWindowDays: { year3: 365, year: 90, month: 7, week: 2, day: 1, hour: 0 },
        bufferRatio: 0.15,
        majorChangeThreshold: { affectedTaskCount: 3, criticalPathChanged: true },
      },
      appearance: { theme: 'system' },
      reviewRhythms: { daily: true, weekly: true, monthly: true, yearly: true },
    })
    return () => {}
  },
  updateSettings: vi.fn(),
}))

vi.mock('../services/repositories/financeCategoriesRepository', () => ({
  seedDefaultFinanceCategoriesIfMissing: vi.fn().mockResolvedValue(undefined),
  subscribeFinanceCategories: (_uid: string, onChange: (categories: unknown[]) => void) => {
    onChange([])
    return () => {}
  },
}))

function renderApp() {
  return render(
    <HashRouter>
      <App uid="test-uid" />
    </HashRouter>,
  )
}

describe('App', () => {
  it('varsayılan rotada Bugün sayfasını gösterir', () => {
    renderApp()
    expect(screen.getAllByText('Bugün').length).toBeGreaterThan(0)
  })

  it('ana navigasyon linklerini gösterir', () => {
    renderApp()
    expect(screen.getByRole('link', { name: 'Takvim' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Finans' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ayarlar' })).toBeInTheDocument()
  })
})
