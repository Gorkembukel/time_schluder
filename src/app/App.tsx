import { NavLink, Route, Routes } from 'react-router-dom'
import { BugunPage } from '../features/bugun/BugunPage'
import { TakvimPage } from '../features/takvim/TakvimPage'
import { HayatAlanlariPage } from '../features/hayat-alanlari/HayatAlanlariPage'
import { FinansPage } from '../features/finans/FinansPage'
import { AyarlarPage } from '../features/ayarlar/AyarlarPage'

const NAV_ITEMS = [
  { to: '/', label: 'Bugün', end: true },
  { to: '/takvim', label: 'Takvim' },
  { to: '/hayat-alanlari', label: 'Hayat Alanları' },
  { to: '/finans', label: 'Finans' },
  { to: '/ayarlar', label: 'Ayarlar' },
]

export function App() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border bg-surface">
        <ul className="mx-auto flex max-w-3xl gap-1 px-4 py-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-text'
                      : 'text-text-secondary hover:text-text'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Routes>
          <Route path="/" element={<BugunPage />} />
          <Route path="/takvim" element={<TakvimPage />} />
          <Route path="/hayat-alanlari" element={<HayatAlanlariPage />} />
          <Route path="/finans" element={<FinansPage />} />
          <Route path="/ayarlar" element={<AyarlarPage />} />
        </Routes>
      </main>
    </div>
  )
}
