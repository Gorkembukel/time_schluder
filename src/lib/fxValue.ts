import type { FinanceTransaction } from '../types/domain'

export const FX_UNITS = ['usd', 'gold', 'btc'] as const
export type FxUnit = (typeof FX_UNITS)[number]

export const FX_UNIT_LABELS: Record<FxUnit, string> = {
  usd: 'Dolar',
  gold: 'Gram altın',
  btc: 'BTC',
}

const FX_UNIT_FORMATTERS: Record<FxUnit, Intl.NumberFormat> = {
  usd: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'USD' }),
  gold: new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }),
  btc: new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 6, minimumFractionDigits: 2 }),
}

const FX_UNIT_SUFFIXES: Record<FxUnit, string> = {
  usd: '',
  gold: ' gr',
  btc: ' BTC',
}

function rateFor(tx: FinanceTransaction, unit: FxUnit): number | null {
  const rate =
    unit === 'usd'
      ? tx.fxSnapshot.usdRate
      : unit === 'gold'
        ? tx.fxSnapshot.goldGramPriceTRY
        : tx.fxSnapshot.btcPriceTRY
  return rate && rate > 0 ? rate : null
}

/** İşlemin TRY tutarının seçilen birimdeki karşılığı — kur snapshot'ı yoksa `null` (bkz. docs/decisions/0006). */
export function valueInUnit(tx: FinanceTransaction, unit: FxUnit): number | null {
  const rate = rateFor(tx, unit)
  return rate === null ? null : tx.amountTRY / rate
}

export function formatFxValue(value: number, unit: FxUnit): string {
  return `${FX_UNIT_FORMATTERS[unit].format(value)}${FX_UNIT_SUFFIXES[unit]}`
}
