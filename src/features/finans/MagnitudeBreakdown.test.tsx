import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MagnitudeBreakdown } from './MagnitudeBreakdown'

describe('MagnitudeBreakdown', () => {
  it('boş liste için emptyText gösterir', () => {
    render(<MagnitudeBreakdown title="Test" items={[]} emptyText="Kayıt yok" />)
    expect(screen.getByText('Kayıt yok')).toBeInTheDocument()
  })

  it('öğeleri büyükten küçüğe sıralar ve yüzdeyi hesaplar', () => {
    render(
      <MagnitudeBreakdown
        title="Test"
        items={[
          { id: 'a', label: 'A', amount: 25 },
          { id: 'b', label: 'B', amount: 75 },
        ]}
        emptyText="Kayıt yok"
      />,
    )
    const labels = screen.getAllByText(/^[AB]$/).map((el) => el.textContent)
    expect(labels).toEqual(['B', 'A'])
    expect(screen.getByText(/%75/)).toBeInTheDocument()
    expect(screen.getByText(/%25/)).toBeInTheDocument()
  })
})
