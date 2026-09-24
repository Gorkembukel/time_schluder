import type { ChangeEvent, ReactNode } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useFinanceCategoriesStore } from '../../stores/financeCategoriesStore'
import { updateCategoryBudget } from '../../services/repositories/financeCategoriesRepository'
import { useUid } from '../../app/UidContext'
import { Skeleton } from '../../components/Skeleton'
import { PageHeader } from '../../components/PageHeader'
import { PLANNING_SCALES, type PlanningScale, type Theme } from '../../types/domain'

const LOADING_SECTION_COUNT = 3

const SCALE_LABELS: Record<PlanningScale, string> = {
  year3: '3 Yıl',
  year: 'Yıl',
  month: 'Ay',
  week: 'Hafta',
  day: 'Gün',
  hour: 'Saat',
}

const WEEKDAY_LABELS = [
  { value: 1, label: 'Pazartesi' },
  { value: 2, label: 'Salı' },
  { value: 3, label: 'Çarşamba' },
  { value: 4, label: 'Perşembe' },
  { value: 5, label: 'Cuma' },
  { value: 6, label: 'Cumartesi' },
  { value: 7, label: 'Pazar' },
]

const HOUR_MIN = 0
const HOUR_MAX = 23
const DETAIL_WINDOW_MIN = 0
const BUFFER_RATIO_MIN = 0
const BUFFER_RATIO_MAX = 1
const BUFFER_RATIO_STEP = 0.05
const UPCOMING_WINDOW_MIN = 1

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm text-text-secondary">
      <span>{label}</span>
      {children}
    </label>
  )
}

const inputClass = 'rounded-lg border border-border bg-bg px-2 py-1 text-sm text-text'

export function AyarlarPage() {
  const uid = useUid()
  const settings = useSettingsStore((s) => s.settings)
  const loading = useSettingsStore((s) => s.loading)
  const update = useSettingsStore((s) => s.update)
  const categories = useFinanceCategoriesStore((s) => s.categories)

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-32" />
        {Array.from({ length: LOADING_SECTION_COUNT }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  }

  function handleNumberChange(
    section: 'calendarTime',
    field: 'dayStartHour' | 'dayEndHour' | 'weekStartsOn',
  ) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      void update({ [section]: { ...settings[section], [field]: Number(event.target.value) } })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader icon={SettingsIcon} title="Ayarlar" />

      <Section title="Genel">
        <Field label="Dil">
          <span className={inputClass}>Türkçe</span>
        </Field>
        <Field label="Para birimi">
          <select
            className={inputClass}
            value={settings.general.currency}
            onChange={(e) =>
              void update({ general: { ...settings.general, currency: e.target.value } })
            }
          >
            <option value="TRY">TRY (₺)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </Field>
      </Section>

      <Section title="Genel Bakış">
        <Field label="Yaklaşan görevler penceresi (gün)">
          <input
            type="number"
            min={UPCOMING_WINDOW_MIN}
            className={inputClass}
            value={settings.dashboard.upcomingWindowDays}
            onChange={(e) =>
              void update({
                dashboard: { upcomingWindowDays: Number(e.target.value) },
              })
            }
          />
        </Field>
      </Section>

      <Section title="Takvim & Zaman">
        <Field label="Haftanın ilk günü">
          <select
            className={inputClass}
            value={settings.calendarTime.weekStartsOn}
            onChange={handleNumberChange('calendarTime', 'weekStartsOn')}
          >
            {WEEKDAY_LABELS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Gün başlangıç saati">
          <input
            type="number"
            min={HOUR_MIN}
            max={HOUR_MAX}
            className={inputClass}
            value={settings.calendarTime.dayStartHour}
            onChange={handleNumberChange('calendarTime', 'dayStartHour')}
          />
        </Field>
        <Field label="Gün bitiş saati">
          <input
            type="number"
            min={HOUR_MIN}
            max={HOUR_MAX}
            className={inputClass}
            value={settings.calendarTime.dayEndHour}
            onChange={handleNumberChange('calendarTime', 'dayEndHour')}
          />
        </Field>
      </Section>

      <Section title="Planlama Motoru">
        {PLANNING_SCALES.map((scale) => (
          <Field key={scale} label={`Detaylandırma penceresi — ${SCALE_LABELS[scale]} (gün)`}>
            <input
              type="number"
              min={DETAIL_WINDOW_MIN}
              className={inputClass}
              value={settings.planningEngine.detailWindowDays[scale]}
              onChange={(e) =>
                void update({
                  planningEngine: {
                    ...settings.planningEngine,
                    detailWindowDays: {
                      ...settings.planningEngine.detailWindowDays,
                      [scale]: Number(e.target.value),
                    },
                  },
                })
              }
            />
          </Field>
        ))}
        <Field label="Tampon oranı">
          <input
            type="number"
            min={BUFFER_RATIO_MIN}
            max={BUFFER_RATIO_MAX}
            step={BUFFER_RATIO_STEP}
            className={inputClass}
            value={settings.planningEngine.bufferRatio}
            onChange={(e) =>
              void update({
                planningEngine: {
                  ...settings.planningEngine,
                  bufferRatio: Number(e.target.value),
                },
              })
            }
          />
        </Field>
      </Section>

      <Section title="Görünüm & Tema">
        <Field label="Tema">
          <select
            className={inputClass}
            value={settings.appearance.theme}
            onChange={(e) => void update({ appearance: { theme: e.target.value as Theme } })}
          >
            <option value="system">Sistem</option>
            <option value="light">Açık</option>
            <option value="dark">Koyu</option>
          </select>
        </Field>
      </Section>

      <Section title="Bildirimler — Review ritimleri">
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((rhythm) => (
          <Field
            key={rhythm}
            label={
              { daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık', yearly: 'Yıllık' }[rhythm]
            }
          >
            <input
              type="checkbox"
              checked={settings.reviewRhythms[rhythm]}
              onChange={(e) =>
                void update({
                  reviewRhythms: { ...settings.reviewRhythms, [rhythm]: e.target.checked },
                })
              }
            />
          </Field>
        ))}
      </Section>

      <Section title="Hayat Alanları & Gereklilikler">
        <p className="text-sm text-text-secondary">
          Alan ve gereklilik yönetimi Hayat Alanları ekranından yapılır.
        </p>
      </Section>

      <Section title="Finans — Kategoriler">
        {categories.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <li
                key={category.id}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-text-secondary"
              >
                {category.name}
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-text-secondary">
          Kategori ekleme/düzenleme Finans ekranından yapılır.
        </p>
      </Section>

      <Section title="Finans — Bütçe (aylık, TRY)">
        {categories.filter((c) => c.kind === 'expense').length === 0 ? (
          <Skeleton className="h-24" />
        ) : (
          categories
            .filter((c) => c.kind === 'expense')
            .map((category) => (
              <Field key={category.id} label={category.name}>
                <input
                  type="number"
                  min={0}
                  step="50"
                  placeholder="belirlenmedi"
                  defaultValue={category.monthlyBudgetTRY ?? ''}
                  onBlur={(e) => {
                    const value = e.target.value.trim()
                    void updateCategoryBudget(uid, category.id, value === '' ? null : Number(value))
                  }}
                  className={inputClass}
                />
              </Field>
            ))
        )}
      </Section>

      <Section title="Veri & Hesap">
        <p className="text-sm text-text-secondary">Dışa/içe aktarma yakında eklenecek.</p>
      </Section>
    </div>
  )
}
