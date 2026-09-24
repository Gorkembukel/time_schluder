# 0001. Teknoloji yığını

## Durum
Kabul edildi

## Bağlam
Uygulama GitHub Pages'te statik olarak yayınlanacak, backend Firebase Spark (ücretsiz) plan — Cloud Functions yok, tüm hesaplama istemcide. Ürün, çok sayıda birbirine bağlı görünüm (Bugün, Takvim gün/hafta/ay/timeline, Hayat Alanları, Finans, Ayarlar) ve karmaşık bir istemci-taraflı planlama motoru (bağımlılık grafiği, kritik yol, rolling wave, dinamik yeniden hesaplama) gerektiriyor. Erişilebilirlik (WCAG 2.2 AA) ve performans (Core Web Vitals) zorunlu.

## Karar
- **Framework:** Vite + React + TypeScript
- **State yönetimi:** Zustand (global UI/uygulama state) + Firestore `onSnapshot` sarmalayan custom hook'lar (sunucu verisi için ayrı bir data-fetching kütüphanesi yok — Firestore SDK zaten cache/offline persistence sağlıyor)
- **Routing:** React Router, `HashRouter`
- **Stil:** Tailwind CSS, tema token'ları CSS custom properties (`:root` + `[data-theme]`) üzerinden; Tailwind config bu token'lara referans verir (hardcode renk yok)
- **Tarih/saat hesaplamaları:** date-fns (tree-shakeable, immutable, Moment.js'e göre çok daha küçük bundle)
- **Test:** Vitest + React Testing Library (unit/component), Playwright (e2e)
- **Lint/format:** ESLint (`typescript-eslint`, `eslint-plugin-jsx-a11y`, `no-magic-numbers` kuralı `config-audit` skill'ini destekler) + Prettier
- **Takvim/timeline UI:** Hazır bir kütüphane (FullCalendar vb.) yerine **özel bileşenler**. Gerekçe: rolling wave sınır görselleştirmesi, swap etkileşimi, bağımlılık okları ve çoklu ölçek (saat→3 yıl) geçişi genel amaçlı kütüphanelerin veri modeline uymuyor; kütüphaneye uydurmak, sıfırdan yazmaktan daha maliyetli olurdu.

## Gerekçe / alternatifler
| Seçenek | Artı | Eksi | Neden elendi/seçildi |
|---|---|---|---|
| **Vite+React+TS** (seçilen) | Devasa ekosistem, olgun Firebase SDK desteği, statik export GitHub Pages ile sorunsuz, TypeScript birinci sınıf | React'ın kendi boilerplate'i (hook kuralları vb.) | Seçildi — ekosistem genişliği ve TypeScript deneyimi bu projenin karmaşıklığı için en düşük risk |
| SvelteKit | Daha az kod, küçük bundle | Statik adapter ek yapılandırma ister, a11y/test ekosistemi daha küçük | Elendi — ekosistem riski |
| Vue 3 + Vite | İyi DX, orta ekosistem | React kadar geniş kütüphane/örnek havuzu yok | Elendi — bu ölçekte kütüphane bulma kolaylığı React'ta daha yüksek |
| Next.js | Güçlü framework | SSR/API routes bu projede gereksiz (Spark'ta backend yok, statik export gerekiyor); ekstra karmaşıklık getirir | Elendi — gereksiz karmaşıklık |
| Redux Toolkit (state) | Olgun, DevTools güçlü | Bu ölçekte gereğinden fazla boilerplate | Elendi — Zustand yeterli ve daha az kod |
| React Query (server state) | Cache/invalidation güçlü | Firestore zaten kendi cache/offline persistence'ını sağlıyor, ikinci bir cache katmanı gereksiz karmaşıklık | Elendi |
| `404.html` fallback routing | Temiz URL'ler (`#` yok) | GitHub Pages'te `base` path + refresh senaryolarında kırılgan, ekstra yapılandırma | Elendi, bkz. ADR 0005 |

## Sonuçlar
- Yeni katılan biri (ileride) React/TS bilgisiyle hızla adapte olabilir.
- Takvim/timeline bileşenlerinin özel yazılması Faz 3'te daha fazla geliştirme süresi gerektirir ama tam kontrol sağlar (rolling wave, swap, bağımlılık görselleştirmesi).
- `HashRouter` seçimi URL'lerde `#` getirir; bu özel/tek-kullanıcılı bir uygulama olduğundan SEO/paylaşım kaygısı yok, kabul edilebilir.
