import { useCallback, useEffect, useState } from 'react'
import { Target } from 'lucide-react'
import { useRequirements } from '../../hooks/useRequirements'
import { useTopics } from '../../hooks/useTopics'
import { useSettingsStore } from '../../stores/settingsStore'
import { formatTRY } from '../../lib/format'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { REQUIREMENT_STATUS_LABELS, type LifeArea, type Requirement } from '../../types/domain'

const PROGRESS_MAX_PERCENT = 100

interface GapEntry {
  requirement: Requirement
  topicName: string
}

function isGap(requirement: Requirement, thresholdPercent: number): boolean {
  if (requirement.status === 'yok' || requirement.status === 'alinacak') return true
  if (requirement.targetMetric > 0) {
    return (requirement.currentValue / requirement.targetMetric) * PROGRESS_MAX_PERCENT < thresholdPercent
  }
  return false
}

function whyGap(requirement: Requirement, thresholdPercent: number): string {
  if (requirement.status === 'yok') return 'Hiç edinilmedi'
  if (requirement.status === 'alinacak') return 'Edinilmesi planlanıyor'
  const pct =
    requirement.targetMetric > 0
      ? Math.round((requirement.currentValue / requirement.targetMetric) * PROGRESS_MAX_PERCENT)
      : 0
  return `İlerleme %${pct}, %${thresholdPercent} eşiğinin altında`
}

/**
 * Bir hayat alanının gerekliliklerini izler ve boşlukları (envanter durumu eksik ya da ilerlemesi
 * düşük yaprak gereklilikler) hesaplayıp üst bileşene raporlar — bkz. docs/decisions/0011.
 * Requirement'lar hayat alanına göre nested olduğu için (bkz. ADR 0003) tek bir global sorgu yok;
 * bu, `LifeAreaProgressCard`'ın zaten kullandığı "alan başına abonelik" desenini izler.
 */
function AreaGapCollector({
  uid,
  area,
  thresholdPercent,
  onReport,
}: {
  uid: string
  area: LifeArea
  thresholdPercent: number
  onReport: (areaId: string, entries: GapEntry[]) => void
}) {
  const { requirements } = useRequirements(uid, area.id)
  const { topics } = useTopics(uid, area.id)

  useEffect(() => {
    const parentIds = new Set(requirements.map((r) => r.parentRequirementId).filter(Boolean))
    const entries = requirements
      .filter((r) => !parentIds.has(r.id))
      .filter((r) => isGap(r, thresholdPercent))
      .map((r) => ({
        requirement: r,
        topicName: topics.find((t) => t.id === r.topicId)?.name ?? 'Genel',
      }))
    onReport(area.id, entries)
  }, [requirements, topics, area.id, thresholdPercent, onReport])

  return null
}

export function GapAnalysisCard({ uid, areas }: { uid: string; areas: LifeArea[] }) {
  const thresholdPercent = useSettingsStore(
    (s) => s.settings.requirements.gapProgressThresholdPercent,
  )
  const [gapsByArea, setGapsByArea] = useState<Record<string, GapEntry[]>>({})

  const report = useCallback((areaId: string, entries: GapEntry[]) => {
    setGapsByArea((prev) => ({ ...prev, [areaId]: entries }))
  }, [])

  const totalCount = Object.values(gapsByArea).reduce((sum, entries) => sum + entries.length, 0)
  const totalCost = Object.values(gapsByArea)
    .flat()
    .reduce((sum, e) => sum + (e.requirement.estimatedCost ?? 0), 0)

  return (
    <Card className="p-5">
      {areas.map((area) => (
        <AreaGapCollector
          key={area.id}
          uid={uid}
          area={area}
          thresholdPercent={thresholdPercent}
          onReport={report}
        />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text">Boşluk analizi</h2>
        <span className="text-xs text-text-secondary">
          {totalCount} eksik gereklilik{totalCost > 0 ? ` · ~${formatTRY(totalCost)} tahmini` : ''}
        </span>
      </div>

      {totalCount === 0 ? (
        <EmptyState
          icon={Target}
          title="Boşluk yok"
          description="Gerekliliklerin durumda ya da ilerlemede iyi görünüyor."
        />
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {areas.map((area) => {
            const entries = gapsByArea[area.id] ?? []
            if (entries.length === 0) return null
            return (
              <div key={area.id}>
                <p className="text-xs font-semibold text-text-secondary">
                  {area.name} · {entries.length}
                </p>
                <div className="mt-1 flex flex-col gap-1.5">
                  {entries.map(({ requirement: r, topicName }) => (
                    <div
                      key={r.id}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-bg/50 px-3 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-text">{r.name}</p>
                        <p className="truncate text-xs text-text-secondary">
                          {topicName} · {whyGap(r, thresholdPercent)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {r.status && (
                          <Badge variant={r.status === 'yok' ? 'danger' : 'warning'}>
                            {REQUIREMENT_STATUS_LABELS[r.status]}
                          </Badge>
                        )}
                        {r.estimatedCost != null && (
                          <span className="text-xs text-text-secondary">
                            {formatTRY(r.estimatedCost)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

