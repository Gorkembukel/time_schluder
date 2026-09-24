import { useState, type FormEvent } from 'react'
import { Plus, Target } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { createLifeArea } from '../../services/repositories/lifeAreasRepository'
import { AreaCard } from './AreaCard'
import { Skeleton } from '../../components/Skeleton'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'

const LOADING_CARD_COUNT = 2

export function HayatAlanlariPage() {
  const uid = useUid()
  const areas = useLifeAreasStore((s) => s.areas)
  const loading = useLifeAreasStore((s) => s.loading)
  const [newAreaName, setNewAreaName] = useState('')

  async function handleAddArea(event: FormEvent) {
    event.preventDefault()
    const trimmed = newAreaName.trim()
    if (!trimmed) return
    await createLifeArea(uid, trimmed, areas.length)
    setNewAreaName('')
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Target}
        title="Hayat Alanları"
        subtitle="İlerlemek istediğin alanlar ve gereklilikleri"
      />

      <form
        onSubmit={(e) => void handleAddArea(e)}
        className="flex gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm"
      >
        <input
          value={newAreaName}
          onChange={(e) => setNewAreaName(e.target.value)}
          placeholder="Yeni hayat alanı (ör. Sağlık)"
          className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
        />
        <Button type="submit" variant="primary">
          <Plus size={16} />
          Ekle
        </Button>
      </form>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: LOADING_CARD_COUNT }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : areas.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Henüz hayat alanı yok"
          description="İlerlemek istediğin bir alan ekleyerek başla."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {areas.map((area) => (
            <AreaCard key={area.id} uid={uid} area={area} />
          ))}
        </div>
      )}
    </div>
  )
}
