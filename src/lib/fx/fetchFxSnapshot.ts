/**
 * ADR 0006'da kararlaştırılan, anahtarsız üç kaynaktan referans kur/fiyat çekimi.
 * Her çağrı bağımsız başarısız olabilir (Promise.allSettled) — başarısız alan
 * `null` döner, form bunu isteğe bağlı elle giriş alanına çevirir.
 */
const OUNCE_TO_GRAM = 31.1035

export interface FxFetchResult {
  usdRate: number | null
  goldGramPriceTRY: number | null
  btcPriceTRY: number | null
  fetchedAt: string
}

async function fetchUsdTryRate(): Promise<number> {
  const res = await fetch('https://api.frankfurter.dev/v1/latest?from=USD&to=TRY')
  if (!res.ok) throw new Error('frankfurter isteği başarısız')
  const data = (await res.json()) as { rates: { TRY: number } }
  return data.rates.TRY
}

async function fetchGoldUsdPerOunce(): Promise<number> {
  const res = await fetch('https://api.gold-api.com/price/XAU')
  if (!res.ok) throw new Error('gold-api isteği başarısız')
  const data = (await res.json()) as { price: number }
  return data.price
}

async function fetchBtcUsd(): Promise<number> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
  )
  if (!res.ok) throw new Error('coingecko isteği başarısız')
  const data = (await res.json()) as { bitcoin: { usd: number } }
  return data.bitcoin.usd
}

export async function fetchFxSnapshot(): Promise<FxFetchResult> {
  const [usdResult, goldResult, btcResult] = await Promise.allSettled([
    fetchUsdTryRate(),
    fetchGoldUsdPerOunce(),
    fetchBtcUsd(),
  ])

  const usdRate = usdResult.status === 'fulfilled' ? usdResult.value : null

  const goldGramPriceTRY =
    goldResult.status === 'fulfilled' && usdRate !== null
      ? (goldResult.value / OUNCE_TO_GRAM) * usdRate
      : null

  const btcPriceTRY =
    btcResult.status === 'fulfilled' && usdRate !== null ? btcResult.value * usdRate : null

  return { usdRate, goldGramPriceTRY, btcPriceTRY, fetchedAt: new Date().toISOString() }
}
