import { NavLink, Route, Routes } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import {
  Bot,
  CalendarDays,
  CalendarRange,
  Clock,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Settings,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { auth } from '../services/firebase'
import { useUserDataSync } from '../hooks/useUserDataSync'
import { useApplyTheme } from '../hooks/useApplyTheme'
import { useSettingsStore } from '../stores/settingsStore'
import { UidProvider } from './UidContext'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { BugunPage } from '../features/bugun/BugunPage'
import { TakvimPage } from '../features/takvim/TakvimPage'
import { KanbanPage } from '../features/is-takibi/KanbanPage'
import { ProgramPage } from '../features/program/ProgramPage'
import { RobotPage } from '../features/robot/RobotPage'
import { HayatAlanlariPage } from '../features/hayat-alanlari/HayatAlanlariPage'
import { FinansPage } from '../features/finans/FinansPage'
import { AyarlarPage } from '../features/ayarlar/AyarlarPage'

const NAV_ITEMS: { to: string; label: string; end?: boolean; icon: LucideIcon }[] = [
  { to: '/', label: 'Genel Bakış', end: true, icon: LayoutDashboard },
  { to: '/bugun', label: 'Bugün', icon: Clock },
  { to: '/takvim', label: 'Takvim', icon: CalendarDays },
  { to: '/program', label: 'Program', icon: CalendarRange },
  { to: '/pano', label: 'Pano', icon: KanbanSquare },
  { to: '/robot', label: 'Robot', icon: Bot },
  { to: '/hayat-alanlari', label: 'Hayat Alanları', icon: Target },
  { to: '/finans', label: 'Finans', icon: Wallet },
  { to: '/ayarlar', label: 'Ayarlar', icon: Settings },
]

const NAV_ICON_SIZE = 16

export function App({ uid }: { uid: string }) {
  useUserDataSync(uid)
  const theme = useSettingsStore((s) => s.settings.appearance.theme)
  useApplyTheme(theme)

  return (
    <UidProvider uid={uid}>
      <div className="min-h-screen bg-bg text-text">
        <nav className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-2.5">
            <div className="flex items-center gap-1.5 pr-2 text-text">
              <Clock size={18} className="text-primary" />
              <span className="text-sm font-bold tracking-tight">Zaman Schluder</span>
            </div>
            <ul className="flex flex-1 flex-wrap items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    viewTransition
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all motion-safe:duration-150 ${
                        isActive
                          ? 'bg-primary text-primary-text'
                          : 'text-text-secondary hover:bg-border/60 hover:text-text'
                      }`
                    }
                  >
                    <item.icon size={NAV_ICON_SIZE} />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text"
            >
              <LogOut size={NAV_ICON_SIZE} />
              Çıkış yap
            </button>
          </div>
        </nav>
        <main className="mx-auto max-w-5xl px-4 py-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/bugun" element={<BugunPage />} />
            <Route path="/takvim" element={<TakvimPage />} />
            <Route path="/program" element={<ProgramPage />} />
            <Route path="/pano" element={<KanbanPage />} />
            <Route path="/robot" element={<RobotPage />} />
            <Route path="/hayat-alanlari" element={<HayatAlanlariPage />} />
            <Route path="/finans" element={<FinansPage />} />
            <Route path="/ayarlar" element={<AyarlarPage />} />
          </Routes>
        </main>
      </div>
    </UidProvider>
  )
}
