import { useState, type FormEvent } from 'react'
import { useUid } from '../../app/UidContext'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { createLifeArea } from '../../services/repositories/lifeAreasRepository'
import { AreaCard } from './AreaCard'

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
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Hayat Alanları</h1>

      <form onSubmit={(e) => void handleAddArea(e)} className="flex gap-2">
        <input
          value={newAreaName}
          onChange={(e) => setNewAreaName(e.target.value)}
          placeholder="Yeni hayat alanı (ör. Sağlık)"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-text"
        >
          Ekle
        </button>
      </form>

      {loading ? (
        <p className="text-text-secondary">Hayat alanları yükleniyor…</p>
      ) : areas.length === 0 ? (
        <p className="text-text-secondary">
          Henüz hayat alanı yok. İlerlemek istediğin bir alan ekleyerek başla.
        </p>
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
