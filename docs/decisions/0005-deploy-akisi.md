# 0005. Deploy akışı

## Durum
Kabul edildi

## Bağlam
Yayın hedefi GitHub Pages (statik hosting), build/deploy GitHub Actions ile otomatikleşecek. Repo: `Gorkembukel/time_schluder`, proje sitesi olacağı için URL `https://gorkembukel.github.io/time_schluder/` şeklinde olur (custom domain yoksa).

## Karar
- **SPA routing:** `HashRouter` (bkz. ADR 0001). URL'ler `.../time_schluder/#/takvim/hafta` biçiminde olur; GitHub Pages'in sunucu tarafı rewrite desteklememesinden kaynaklanan "derin linkte 404" sorunu kökten ortadan kalkar, ayrı bir `404.html` hack'i gerekmez.
- **`base` path:** Vite config'te `base: '/time_schluder/'` — repo adıyla birebir.
- **Workflow:** `.github/workflows/deploy.yml`
  - Tetikleyici: `push` → `main`
  - Adımlar: checkout → `npm ci` → `npm run lint` → `npm run test` → `npm run build` → `actions/deploy-pages` (resmi GitHub Pages deploy action; `peaceiris/actions-gh-pages` yerine tercih edildi çünkü üçüncü parti bir action'a bağımlılığı azaltır ve GitHub'ın kendi Pages ortam/izin modeliyle native çalışır)
  - Pages kaynağı: repo ayarlarından "GitHub Actions" olarak seçilmeli (kullanıcı elle bir kerelik yapacak, `release-deploy` skill'i bunu deploy öncesi hatırlatır)
- **Firebase config:** Web config anahtarları (`apiKey`, `projectId` vb.) gizli değildir, güvenlik Firestore Security Rules'a dayanır (ADR 0003) — bu yüzden `.env` yerine doğrudan `src/services/firebase.ts` içinde veya build-time env değişkeni olarak tutulabilir; hangisi seçilirse seçilsin repo'ya commit edilen değer gerçek proje config'i olmalı (gizli değil, ama yanlış projeye bağlanmayı önlemek için tek kaynaktan yönetilir).

## Gerekçe
| Seçenek | Neden seçildi/elendi |
|---|---|
| `HashRouter` | Seçildi — sıfır ekstra deploy yapılandırması, GitHub Pages'in statik doğasıyla doğrudan uyumlu |
| `BrowserRouter` + `404.html` fallback | Elendi — `base` path ile birlikte kırılgan, custom domain/proje sitesi geçişlerinde tekrar test gerektirir |
| `actions/deploy-pages` (resmi) | Seçildi — bakım yükü düşük, GitHub'ın kendi izin modeliyle entegre |
| `peaceiris/actions-gh-pages` | Elendi — üçüncü parti action'a gereksiz bağımlılık |

## Sonuçlar
- Deploy tamamen otomatik; manuel adım sadece ilk kurulumda repo ayarlarından Pages kaynağının "GitHub Actions" seçilmesi.
- `release-deploy` skill'i bu ADR'daki adımları (build/lint/test/base path/routing/workflow durumu) referans alarak doğrular.
