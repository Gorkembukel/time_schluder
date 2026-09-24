# time_schluder

## Amaç
Asıl kaynağın **zaman** olduğu kişisel kaynak yönetimi web uygulaması. 3 yıllık → yıllık → aylık → haftalık → günlük → saatlik ölçeklerde planlama (top-down/backcasting) ve ilerleme takibi (bottom-up/forecasting). Hayat alanları, gereklilikler, görev bağımlılıkları (FS/SS/FF/SF), kademeli detaylandırma (rolling wave) ve ayrı bir finans modülü içerir.

Detaylı ürün tanımı: [`docs/requirements.md`](docs/requirements.md). Kavramlar: [`docs/domain-glossary.md`](docs/domain-glossary.md). Mimari kararlar: [`docs/decisions/`](docs/decisions/).

## Durum
Proje **Faz 2** (mimari) aşamasında; Faz 0 (altyapı) ve Faz 1 (keşif) tamamlandı. Mimari kararlar `docs/decisions/0001`–`0006` içinde ADR olarak önerildi (durum: onay bekliyor). Kod iskeleti henüz kurulmadı — bu Faz 3'te yapılacak.

**Seçilen/önerilen yığın** (bkz. ADR 0001): Vite + React + TypeScript, Zustand, React Router (`HashRouter`), Tailwind CSS + CSS custom property tema token'ları, date-fns, Vitest + React Testing Library + Playwright. Yayın: GitHub Pages + GitHub Actions (`actions/deploy-pages`). Backend: Firebase Spark (ücretsiz) — Firestore + Auth, Cloud Functions **yok** (tüm hesaplama istemci tarafında).

## Komutlar
> Faz 3'te proje iskeleti kurulunca gerçek script'lerle güncellenecek. Planlanan (ADR 0001, 0005):
> - `npm run dev` — yerel geliştirme sunucusu
> - `npm run build` — üretim derlemesi (GitHub Pages `base: /time_schluder/`)
> - `npm run lint` — ESLint
> - `npm run test` — Vitest (unit/component)
> - `npm run test:e2e` — Playwright

## Git akışı
- Her değişiklikten önce `git-checkpoint` skill'i ile mevcut durum korunur (commit + push), sonra yeni branch açılır.
- Branch isimlendirme: `feat/<konu>`, `fix/<konu>`, `refactor/<konu>`, `docs/<konu>`, `chore/<konu>`.
- Commit mesajları Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`).
- PR açma ayrı bir yetenektir: `pull-request` skill'i, sadece kullanıcı istediğinde çalışır.
- Ana branch: `main`. Remote: `origin` → `https://github.com/Gorkembukel/time_schluder.git`.

## Persona protokolü
Her görevden önce uygun persona belirlenir ve kısaca bildirilir. Varsayılan: **Web Developer**. Diğer personalar ve kapsamları: [`.claude/personas/`](.claude/personas/). Web geliştirme dışı yeni bir alan gerekirse persona tek başına uydurulmaz — kullanıcıyla birlikte `persona-builder` skill'i kullanılarak oluşturulur.

## Kodlama kuralları
- TypeScript, bileşen tabanlı mimari, WCAG 2.2 AA erişilebilirlik, mobil öncelikli responsive tasarım, Core Web Vitals performansı.
- **Hardcode yasak:** kullanıcının değiştirebilmesi gereken hiçbir değer (planlama ufukları, gün başlangıç/bitiş saatleri, detaylandırma penceresi, tampon oranları, hayat alanları, gereklilik türleri, finans kategorileri, para birimi, renk/tema, bildirim tercihleri, dil/tarih formatı) kod içine sabitlenmez; merkezi config/ayarlar katmanına veya Ayarlar sayfasına taşınır.
- Her değişiklikten sonra, commit'ten önce `config-audit` skill'i çalıştırılır ve raporu PR açıklamasına eklenir.

## Firebase ücretsiz (Spark) plan sınırları
Firebase resmi fiyatlandırma sayfasından doğrulandı (2026-09-24, bkz. ADR 0003): Firestore — 1 GiB depolama, 10 GiB/ay ağ çıkışı, 20.000 yazma/gün, 50.000 okuma/gün, 20.000 silme/gün. Authentication — 50.000 MAU'ya kadar ücretsiz. Tek kullanıcılı kullanım için rahat yeterli; risk yalnızca hatalı/döngüsel `onSnapshot` dinleyicileridir. İlke: gereksiz okuma yapma, offline persistence ve cache kullan, toplu yazma (batch) tercih et, Cloud Functions kullanma (Spark planda yok), sorguları `limit()` ile sınırla.

## Referanslar
- Skill'ler: `.claude/skills/` (`git-checkpoint`, `pull-request`, `persona-builder`, `config-audit`)
- Personalar: `.claude/personas/`
- Dokümantasyon: `docs/`
