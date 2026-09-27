/**
 * Görsel Planlama Kanvası'nın ses geri bildirimi — Web Audio API ile sentezlenir, ek ses
 * dosyası/varlık gerekmez. Ayarlar > Görsel Planlama Kanvası'ndaki anahtarla açılıp kapanır.
 */

type AudioContextCtor = typeof AudioContext

let sharedContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (sharedContext) return sharedContext
  const ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  if (!ctor) return null
  sharedContext = new ctor()
  return sharedContext
}

const CONNECT_FREQUENCY_HZ = 880
const CONNECT_DURATION_S = 0.09
const CONNECT_GAIN = 0.15
const GAIN_FLOOR = 0.0001

/** Bağlantı kurulunca ("Lego click" hissi) kısa bir sentezlenmiş tık sesi çalar. */
export function playConnectSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'triangle'
  oscillator.frequency.value = CONNECT_FREQUENCY_HZ
  gain.gain.setValueAtTime(CONNECT_GAIN, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, ctx.currentTime + CONNECT_DURATION_S)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start()
  oscillator.stop(ctx.currentTime + CONNECT_DURATION_S)
}
