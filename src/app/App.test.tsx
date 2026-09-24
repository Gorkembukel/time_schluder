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
      dashboard: { upcomingWindowDays: 7 },
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

vi.mock('../services/repositories/lifeAreasRepository', () => ({
  subscribeLifeAreas: (_uid: string, onChange: (areas: unknown[]) => void) => {
    onChange([])
    return () => {}
  },
  createLifeArea: vi.fn(),
  renameLifeArea: vi.fn(),
  deleteLifeArea: vi.fn(),
}))

vi.mock('../services/repositories/tasksRepository', () => ({
  subscribeTasksInRange: (
    _uid: string,
    _start: string,
    _end: string,
    onChange: (tasks: unknown[]) => void,
  ) => {
    onChange([])
    return () => {}
  },
  subscribeAllTasks: (_uid: string, onChange: (tasks: unknown[]) => void) => {
    onChange([])
    return () => {}
  },
  fetchAllTasks: vi.fn().mockResolvedValue([]),
  createTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  updateTaskDependencies: vi.fn(),
  applyTaskChanges: vi.fn(),
  deleteTask: vi.fn(),
  stripDependencyReferences: vi.fn(),
}))

vi.mock('../services/repositories/financeTransactionsRepository', () => ({
  subscribeTransactions: (_uid: string, onChange: (transactions: unknown[]) => void) => {
    onChange([])
    return () => {}
  },
  createTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}))

vi.mock('../services/repositories/requirementsRepository', () => ({
  subscribeRequirements: (_uid: string, _areaId: string, onChange: (reqs: unknown[]) => void) => {
    onChange([])
    return () => {}
  },
  createRequirement: vi.fn(),
  updateRequirementProgress: vi.fn(),
  deleteRequirement: vi.fn(),
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
    expect(screen.getByRole('link', { name: 'Pano' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Finans' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ayarlar' })).toBeInTheDocument()
  })
})
