import { useState, type FormEvent } from 'react'
import { Plus, TrendingDown, TrendingUp } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useFinanceCategoriesStore } from '../../stores/financeCategoriesStore'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { useRequirements } from '../../hooks/useRequirements'
import { useFxSnapshot } from '../../hooks/useFxSnapshot'
import { createTransaction } from '../../services/repositories/financeTransactionsRepository'
import { Button } from '../../components/Button'
import type { NeedWant, TransactionType } from '../../types/domain'

const inputClass = 'rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text'
const ISO_DATE_LENGTH = 10

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, ISO_DATE_LENGTH)
}

function toNumberOrNull(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function TransactionForm({ onCreated }: { onCreated: () => void }) {
  const uid = useUid()
  const categories = useFinanceCategoriesStore((s) => s.categories)
  const areas = useLifeAreasStore((s) => s.areas)
  const { snapshot: fx, loading: fxLoading } = useFxSnapshot()

  const [type, setType] = useState<TransactionType>('expense')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(todayIsoDate())
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [lifeAreaId, setLifeAreaId] = useState('')
  const [requirementId, setRequirementId] = useState('')
  const [needWant, setNeedWant] = useState<NeedWant | ''>('')
  // null = kullanıcı henüz elle değiştirmedi -> otomatik çekilen değer gösterilir (varsa).
  const [usdRateOverride, setUsdRateOverride] = useState<string | null>(null)
  const [goldOverride, setGoldOverride] = useState<string | null>(null)
  const [btcOverride, setBtcOverride] = useState<string | null>(null)
  const [fxSource, setFxSource] = useState<'api' | 'manual'>('api')

  const { requirements } = useRequirements(uid, lifeAreaId)
  const visibleCategories = categories.filter((c) => c.kind === type)

  const usdRateInput = usdRateOverride ?? (fx.usdRate !== null ? String(fx.usdRate) : '')
  const goldInput =
    goldOverride ?? (fx.goldGramPriceTRY !== null ? fx.goldGramPriceTRY.toFixed(2) : '')
  const btcInput = btcOverride ?? (fx.btcPriceTRY !== null ? fx.btcPriceTRY.toFixed(2) : '')

  function markManual(setter: (value: string) => void) {
    return (value: string) => {
      setter(value)
      setFxSource('manual')
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const amountValue = Number(amount)
    if (!categoryId || !Number.isFinite(amountValue) || amountValue <= 0) return

    await createTransaction(uid, {
      type,
      amountTRY: amountValue,
      categoryId,
      date,
      description: description.trim(),
      lifeAreaId: lifeAreaId || undefined,
      requirementId: requirementId || undefined,
      needWant: needWant || undefined,
      fxSnapshot: {
        usdRate: toNumberOrNull(usdRateInput),
        goldGramPriceTRY: toNumberOrNull(goldInput),
        btcPriceTRY: toNumberOrNull(btcInput),
        source: fxSource,
        fetchedAt: fx.fetchedAt || new Date().toISOString(),
      },
    })

    setCategoryId('')
    setAmount('')
    setDescription('')
    setLifeAreaId('')
    setRequirementId('')
    setNeedWant('')
    onCreated()
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm"
    >
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setType('expense')
            setCategoryId('')
          }}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            type === 'expense' ? 'bg-danger text-primary-text' : 'bg-bg text-text-secondary'
          }`}
        >
          <TrendingDown size={16} />
          Gider
        </button>
        <button
          type="button"
          onClick={() => {
            setType('income')
            setCategoryId('')
          }}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            type === 'income' ? 'bg-success text-primary-text' : 'bg-bg text-text-secondary'
          }`}
        >
          <TrendingUp size={16} />
          Gelir
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Kategori
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Seç…
            </option>
            {visibleCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Tarih
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Tutar (TRY)
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Açıklama
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Hayat alanı (opsiyonel)
          <select
            value={lifeAreaId}
            onChange={(e) => {
              setLifeAreaId(e.target.value)
              setRequirementId('')
            }}
            className={inputClass}
          >
            <option value="">—</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Gereklilik (opsiyonel)
          <select
            value={requirementId}
            onChange={(e) => setRequirementId(e.target.value)}
            disabled={!lifeAreaId}
            className={inputClass}
          >
            <option value="">—</option>
            {requirements.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          İhtiyaç / İstek (opsiyonel)
          <select
            value={needWant}
            onChange={(e) => setNeedWant(e.target.value as NeedWant | '')}
            className={inputClass}
          >
            <option value="">—</option>
            <option value="need">İhtiyaç</option>
            <option value="want">İstek</option>
          </select>
        </label>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="mb-2 text-xs text-text-secondary">
          Referans kurlar {fxLoading ? '(alınıyor…)' : '(otomatik denendi, elle düzenlenebilir)'}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            USD/TRY
            <input
              type="number"
              step="0.0001"
              value={usdRateInput}
              onChange={(e) => markManual(setUsdRateOverride)(e.target.value)}
              className={inputClass}
              placeholder="elle gir"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            Gram altın (TRY)
            <input
              type="number"
              step="0.01"
              value={goldInput}
              onChange={(e) => markManual(setGoldOverride)(e.target.value)}
              className={inputClass}
              placeholder="elle gir"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            BTC (TRY)
            <input
              type="number"
              step="0.01"
              value={btcInput}
              onChange={(e) => markManual(setBtcOverride)(e.target.value)}
              className={inputClass}
              placeholder="elle gir"
            />
          </label>
        </div>
      </div>

      <Button type="submit" variant="primary" className="self-start">
        <Plus size={16} />
        İşlemi ekle
      </Button>
    </form>
  )
}
