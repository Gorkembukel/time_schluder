import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Waypoints } from 'lucide-react'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/Button'
import { PlanningCanvas } from './PlanningCanvas'

const ICON_SIZE = 16

/** Bir hayat alanının tüm işlerini tek, sürekli bir zaman ekseninde gösteren Görsel Planlama Kanvası. */
export function PlanningCanvasPage() {
  const { areaId } = useParams<{ areaId: string }>()
  const area = useLifeAreasStore((s) => s.areas.find((a) => a.id === areaId))
  const navigate = useNavigate()

  if (!areaId) return null

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Waypoints}
        title={area ? `${area.name} — Kanvas` : 'Kanvas'}
        subtitle="Havuzdan görev sürükleyip zaman şeridine bırakın, birbirine bağlayın, kilitleyip gerçek işe dönüştürün — fare tekerleğiyle yakınlaş/uzaklaş, boş alanı sürükleyerek kaydır."
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/hayat-alanlari')}>
            <ArrowLeft size={ICON_SIZE} />
            Hayat Alanları'na dön
          </Button>
        }
      />
      <PlanningCanvas key={areaId} areaId={areaId} />
    </div>
  )
}
