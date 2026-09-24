import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HashRouter } from 'react-router-dom'
import { App } from './App'

describe('App', () => {
  it('varsayılan rotada Bugün sayfasını gösterir', () => {
    render(
      <HashRouter>
        <App />
      </HashRouter>,
    )
    expect(screen.getAllByText('Bugün').length).toBeGreaterThan(0)
  })

  it('ana navigasyon linklerini gösterir', () => {
    render(
      <HashRouter>
        <App />
      </HashRouter>,
    )
    expect(screen.getByRole('link', { name: 'Takvim' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Finans' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ayarlar' })).toBeInTheDocument()
  })
})
