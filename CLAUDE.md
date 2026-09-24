# time_schluder

## Amaç
Asıl kaynağın **zaman** olduğu kişisel kaynak yönetimi web uygulaması. 3 yıllık → yıllık → aylık → haftalık → günlük → saatlik ölçeklerde planlama (top-down/backcasting) ve ilerleme takibi (bottom-up/forecasting). Hayat alanları, gereklilikler, görev bağımlılıkları (FS/SS/FF/SF), kademeli detaylandırma (rolling wave) ve ayrı bir finans modülü içerir.

Detaylı ürün tanımı: [`docs/requirements.md`](docs/requirements.md). Kavramlar: [`docs/domain-glossary.md`](docs/domain-glossary.md). Mimari kararlar: [`docs/decisions/`](docs/decisions/).

## Durum
Proje **Faz 0** (altyapı) aşamasında. Teknoloji yığını, klasör yapısı ve Firestore veri modeli henüz seçilmedi — bunlar Faz 2'de **Web Developer** personası tarafından gerekçeli olarak önerilecek ve ADR olarak `docs/decisions/` altına kaydedilecek.

Öneri (henüz onaylanmadı): Vite + React + TypeScript, statik hosting GitHub Pages, backend Firebase Spark (ücretsiz) plan — Firestore + Auth, Cloud Functions **yok** (tüm hesaplama istemci tarafında).

## Komutlar
> Faz 2'de proje iskeleti kurulunca bu bölüm dev/build/test/lint/deploy komutlarıyla doldurulacak.

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
> Güncel kota değerleri Faz 2'de doğrulanıp buraya ve `docs/decisions/`'a yazılacak. Genel ilke: gereksiz okuma yapma, offline persistence ve cache kullan, toplu yazma (batch) tercih et, Cloud Functions kullanma (Spark planda yok).

## Referanslar
- Skill'ler: `.claude/skills/` (`git-checkpoint`, `pull-request`, `persona-builder`, `config-audit`)
- Personalar: `.claude/personas/`
- Dokümantasyon: `docs/`
