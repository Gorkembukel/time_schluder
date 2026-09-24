---
name: git-checkpoint
description: Kod üzerinde herhangi bir değişikliğe başlamadan önce mevcut ilerlemeyi commit+push ile koruma altına alır ve yeni bir branch açar. Bu projede her geliştirme adımından ÖNCE kullanılır.
---

# git-checkpoint

Herhangi bir kod değişikliğine başlamadan önce çalışan bu skill, mevcut durumu güvenceye alır ve işe temiz bir branch üzerinde başlanmasını sağlar.

## Adımlar

1. **Durumu gör:**
   ```bash
   git status
   ```
2. **Değişiklik var mı kontrol et.** Yoksa (working tree temiz) commit adımını atla, kullanıcıya "commit edilecek değişiklik yok" diye bildir ve doğrudan adım 5'e geç.
3. **`.gitignore` kontrolü:** `git status` çıktısında `node_modules`, `dist`, `.env`, servis hesabı anahtarı (`*serviceAccount*.json` vb.) gibi dosyalar staged/untracked olarak görünüyorsa DURDUR, `.gitignore`'u düzelt, kullanıcıya bildir.
4. **Commit + push:**
   ```bash
   git add .
   git commit -m "<Conventional Commits formatında mesaj>"
   git push origin <mevcut_branch>
   ```
   - Commit mesajı türleri: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`.
   - Mesaj kısa, özlü ve neyin/neden değiştiğini anlatmalı.
5. **Yeni branch aç ve geç:**
   ```bash
   git switch -c <yeni_branch>
   git push -u origin <yeni_branch>
   ```
   - `git branch <ad>` KULLANMA — sadece oluşturur, geçiş yapmaz.
   - Branch adı deseni: `feat/<konu>`, `fix/<konu>`, `refactor/<konu>`, `docs/<konu>`, `chore/<konu>`.

## Notlar
- Bu skill PR açmaz. PR için ayrı `pull-request` skill'ini kullan.
- Remote push başarısız olursa (auth, yok remote vb.) kullanıcıya durumu bildir, kendi başına remote/auth ayarı uydurma.
- Push'tan önce uzak branch'te kimsenin conflict yaratacak commit'i olup olmadığından emin değilsen `git fetch` ile kontrol et.
