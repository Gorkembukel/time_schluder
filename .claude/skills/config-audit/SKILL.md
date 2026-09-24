---
name: config-audit
description: Her kod değişikliğinden sonra, commit'ten önce çalışan hardcode/magic-number/magic-string denetimi. Kullanıcının değiştirebilmesi gereken değerlerin config/ayarlar katmanına taşınıp taşınmadığını kontrol eder, rapor üretir.
---

# config-audit

Her geliştirme diliminde `git-checkpoint`'ten önce, commit'e girmeden hemen önce çalıştırılır. Amaç: kullanıcının Ayarlar sayfasından değiştirebilmesi gereken hiçbir değerin kod içine sabitlenmemiş olmasını garantilemek.

## Denetlenecek değer kategorileri
- Planlama ufukları ve süreleri (3 yıl/yıl/ay/hafta/gün/saat pencere uzunlukları)
- Gün başlangıç/bitiş saatleri, haftanın ilk günü
- Detaylandırma penceresi (kademeli detaylandırma / rolling wave — kaç gün/hafta ileri detaylı planlanacağı), ölçek başına ayrı ayrı
- Tampon (buffer) oranları
- Hayat alanları listesi, gereklilik türleri
- Finans kategorileri/alt kategorileri, para birimi
- Renkler / tema token'ları
- Bildirim tercihleri
- Dil / tarih formatı

## Kontrol adımları
1. **Otomatik tarama (varsa proje kurulduktan sonra):**
   - ESLint `no-magic-numbers` ve benzeri kurallar aktifse çalıştır: `npm run lint`.
   - Basit bir grep taraması ile şüpheli literal'leri bul (sayısal literaller, tekrar eden string literaller, renk hex kodları):
     ```bash
     grep -rnE "#[0-9a-fA-F]{3,6}\b" src/ --include="*.tsx" --include="*.ts" --include="*.css"
     grep -rnE "\b[0-9]{2,}\b" src/ --include="*.tsx" --include="*.ts"
     ```
   - Bu bir başlangıç filtresidir, tüm sonuçlar hardcode anlamına gelmez — sonraki adımda manuel değerlendir.
2. **Manuel değerlendirme (kontrol listesi):**
   - [ ] Bulunan her değer, yukarıdaki kategorilerden birine giriyor mu?
   - [ ] Giriyorsa: config sabitleri katmanına mı taşınmalı, yoksa kullanıcı ayarına mı (Ayarlar sayfası + Firestore) mı taşınmalı?
   - [ ] Yeni eklenen ayar varsa: Ayarlar sayfasında doğru kategoride mi, varsayılan değeri var mı, doğrulaması (validation) var mı, Firestore şemasına yansıdı mı?
   - [ ] Gerçekten sabit kalması gereken değerler (matematiksel sabitler, API sürüm adları, protokol sabitleri) ayırt edildi mi ve gerekçesi yazıldı mı?
3. **Rapor üret** (aşağıdaki formatta), PR açıklamasına "Hardcode denetimi sonucu" bölümüne eklenmek üzere hazırla.

## Rapor formatı
```markdown
### config-audit raporu
| Dosya:Satır | Değer | Değerlendirme | Öneri |
|---|---|---|---|
| src/lib/planning.ts:42 | `7` (gün) | Detaylandırma penceresi, kullanıcıya göre değişmeli | Ayara taşı: `settings.planningEngine.detailWindowDays.week` |
| src/lib/constants.ts:3 | `"UTC"` benzeri sabit protokol değeri | Gerçekten sabit | Sabit kalabilir çünkü ISO 8601 standart formatı, kullanıcı ayarı değil |

**Özet:** N bulgu, M'si ayara taşındı, K'si config sabiti yapıldı, L'si gerekçeyle sabit bırakıldı.
```

## Kurallar
- Bu skill commit'ten önce çalışır; bulgular varsa önce düzeltilir, sonra `git-checkpoint` ile commit atılır.
- Rapor boş bile olsa ("bulgu yok") PR açıklamasına eklenir — denetimin yapıldığının kanıtı olarak.
- Proje henüz iskeletlenmediyse (Faz 0/1) bu skill'in otomatik tarama kısmı atlanır, sadece manuel kontrol listesi Ayarlar sayfası tasarımı gözden geçirilirken kullanılır.
