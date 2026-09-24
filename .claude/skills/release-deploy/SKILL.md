---
name: release-deploy
description: GitHub Pages'e deploy öncesi build/lint/test'in geçtiğini, base path'in doğru olduğunu, SPA routing çözümünün ve GitHub Actions workflow'unun çalıştığını doğrulayan kontrol listesi.
---

# release-deploy

`main` branch'e merge sonrası veya manuel yayın öncesi çalıştırılan son kontrol. Kod GitHub Pages'te canlıya çıkmadan önceki son kapı.

## Ön koşullar
- İlgili değişiklikler için `config-audit` ve (Firestore kuralı değiştiyse) `firebase-rules-check` tamamlanmış olmalı.

## Kontrol adımları
1. **Build:**
   ```bash
   npm run build
   ```
   Hatasız tamamlanmalı.
2. **Lint & test:**
   ```bash
   npm run lint
   npm run test
   ```
   Her ikisi de geçmeli.
3. **`base` path kontrolü:** Vite config'teki `base` değeri repo adıyla (`/time_schluder/`) eşleşiyor mu? Custom domain kullanılıyorsa `CNAME` dosyası doğru mu?
4. **SPA routing:** Doğrudan alt sayfa URL'sine (ör. `/planlama/hafta`) tarayıcıdan girildiğinde 404 vermiyor mu? Seçilen çözüm (hash router veya `404.html` fallback) `docs/decisions/`'daki ADR ile tutarlı mı?
5. **GitHub Actions workflow:** `.github/workflows/deploy.yml` son push'ta başarıyla tamamlandı mı (`gh run list` ile kontrol et)? Başarısızsa loglara bak, kullanıcıya özetle.
6. **Firebase config:** Prod'da kullanılan Firebase web config'in doğru projeye işaret ettiğini doğrula (web config anahtarları gizli değildir ama yanlış projeye bağlanmak veri karışıklığı yaratır).
7. **Manuel duman testi:** Canlı URL'de (`https://<kullanıcı>.github.io/time_schluder/` veya custom domain) temel akış (giriş yap, bir görev oluştur) çalışıyor mu?

## Rapor
Kısa bir "yayın hazır / hazır değil" özeti + başarısız olan adım varsa neden ve önerilen düzeltme.

## Kurallar
- Herhangi bir adım başarısızsa deploy'u önerme, kullanıcıya nedeniyle bildir.
- Bu skill deploy'u kendisi TETİKLEMEZ (Actions zaten push'ta tetiklenir); sadece doğrular ve raporlar.
