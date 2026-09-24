# 0007. UI geçiş animasyonları ve mikro-etkileşimler

## Durum
Kabul edildi

## Bağlam
**Müşteri** personası ([`.claude/personas/musteri.md`](../../.claude/personas/musteri.md)), Jira/Notion gibi modern SaaS araçlarına kıyasla uygulamanın "akıcı" hissetmesini istiyor: sayfa geçişleri, mikro-etkileşimler (hover, loading), bileşen görsel stili. Persona'nın kendi öncelik kuralı: performans/erişilebilirlik çelişirse onlar kazanır.

## Karar
- **Sayfa geçişleri:** Yeni bir kütüphane (ör. framer-motion) eklemek yerine, React Router v7'nin **native `viewTransition` desteği** (`document.startViewTransition`) kullanılıyor — `<NavLink viewTransition>`. Sıfır ek bağımlılık, sıfır bundle maliyeti, tarayıcı native donanım hızlandırmalı.
  - Chromium tabanlı tarayıcılarda (Chrome/Edge) tam destekli; desteklemeyen tarayıcılarda (ör. eski Firefox) otomatik olarak anında geçişe düşer (progressive enhancement, hata vermez).
  - Geçiş stili `src/styles/globals.css`'te `::view-transition-old/new(root)` ile özelleştirildi; `prefers-reduced-motion: reduce` durumunda devre dışı bırakılıyor.
- **Mikro-etkileşimler:** Var olan Tailwind `transition-colors` kullanımı genişletildi — kartlarda (Hayat Alanı, Takvim gün hücresi) `motion-safe:hover:` ile hafif transform/gölge; `motion-safe:`/`motion-reduce:` Tailwind varyantları kullanılarak azaltılmış hareket tercihi her yerde saygı görüyor.
- **Yükleme durumları:** "Yükleniyor…" düz metinleri, `src/components/Skeleton.tsx` ile pulse animasyonlu iskelet bloklarına çevrildi (Ayarlar, Hayat Alanları, Finans).

## Gerekçe / alternatifler
| Seçenek | Neden seçildi/elendi |
|---|---|
| Native View Transitions API (React Router entegrasyonu) | Seçildi — sıfır bağımlılık, sıfır bundle maliyeti, Web Developer'ın performans önceliğiyle doğrudan uyumlu |
| framer-motion | Elendi — ~50KB+ gzip ek bundle, mevcut 285KB'lık bundle'ı büyütür; native API aynı hissi ücretsiz veriyor |
| CSS-only (kütüphanesiz, view transition da yok) | Elendi — sayfa geçişlerinde "sert" (anında) değişim, Müşteri personasının "akıcı" beklentisini karşılamaz |

## Sonuçlar
- Bundle boyutu değişmedi (yeni bağımlılık yok).
- Tarayıcı desteği olmayan ortamlarda uygulama bozulmaz, sadece geçiş efekti görünmez.
- `prefers-reduced-motion` her katmanda (CSS view-transition + Tailwind `motion-safe`) saygı görüyor — WCAG 2.2 ile çelişmiyor.
