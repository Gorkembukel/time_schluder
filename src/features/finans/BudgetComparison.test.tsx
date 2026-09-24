import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BudgetComparison } from './BudgetComparison'
import type { FinanceCategory, FinanceTransaction } from '../../types/domain'

const FX_SNAPSHOT = {
  usdRate: null,
  goldGramPriceTRY: null,
  btcPriceTRY: null,
  source: 'manual' as const,
  fetchedAt: '',
}

function category(overrides: Partial<FinanceCategory>): FinanceCategory {
  return {
    id: 'cat-1',
    name: 'Market & Gıda',
    kind: 'expense',
    order: 0,
    isDefault: true,
    ...overrides,
  }
}

function transaction(overrides: Partial<FinanceTransaction>): FinanceTransaction {
  return {
    id: 'tx-1',
    type: 'expense',
    amountTRY: 100,
    categoryId: 'cat-1',
    date: '2026-01-01',
    description: '',
    fxSnapshot: FX_SNAPSHOT,
    ...overrides,
  }
}

describe('BudgetComparison', () => {
  it('bütçe belirlenmediyse yönlendirici mesaj gösterir', () => {
    render(<BudgetComparison categories={[category({})]} monthExpenses={[]} />)
    expect(screen.getByText(/Henüz bütçe belirlenmedi/)).toBeInTheDocument()
  })

  it('bütçe altındaki kategori için primary renk kullanır', () => {
    const categories = [category({ monthlyBudgetTRY: 1000 })]
    const expenses = [transaction({ amountTRY: 300 })]
    render(<BudgetComparison categories={categories} monthExpenses={expenses} />)
    expect(screen.getByText(/%30/)).toBeInTheDocument()
  })

  it('bütçeyi aşan kategori için %100 üstü oranı gösterir', () => {
    const categories = [category({ monthlyBudgetTRY: 200 })]
    const expenses = [transaction({ amountTRY: 250 })]
    render(<BudgetComparison categories={categories} monthExpenses={expenses} />)
    expect(screen.getByText(/%125/)).toBeInTheDocument()
  })

  it('bütçesi olmayan gider kategorilerini listelemez', () => {
    const categories = [category({ monthlyBudgetTRY: undefined })]
    render(<BudgetComparison categories={categories} monthExpenses={[]} />)
    expect(screen.queryByText('Market & Gıda')).not.toBeInTheDocument()
  })
})
