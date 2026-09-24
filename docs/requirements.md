# Ürün Gereksinimleri

> Faz 0'da taslak olarak açılmış, Faz 1 (Keşif) ile netleştirilmiştir. Kaynak metin proje başlangıç promptudur. Faz 1'de verilen kararlar `✅` ile işaretlidir; teknik uygulanabilirliği Faz 2'de doğrulanacak maddeler `⚙️` ile işaretlidir.

## 1. Amaç
Asıl kaynağın zaman olduğu kişisel kaynak yönetimi web uygulaması. 3 yıllık, yıllık, aylık, haftalık, günlük, saatlik ölçeklerde planlama ve ilerleme takibi.

✅ Ara ölçek (çeyrek) **eklenmiyor** — 6 ölçekli hiyerarşi (3 yıl → yıl → ay → hafta → gün → saat) yeterli.

## 2. Teknik çerçeve (Faz 2'de kesinleşecek — burada özet)
- Yayın: GitHub Pages, build/deploy GitHub Actions.
- SPA routing GitHub Pages'te sorun çıkarmamalı (hash router vs. 404.html — Web Developer seçip gerekçelendirecek).
- Veritabanı: Firebase Spark (ücretsiz) plan — Firestore + Authentication, Cloud Functions yok, tüm hesaplama istemci tarafında.
- Firestore Security Rules ile her kullanıcı yalnız kendi verisini okur/yazar.

## 3. Hayat alanları ve gereklilikler
- Hayat alanları dinamik: ekle/sil/düzenle.
- Her alan için gereklilik listesi.
- ✅ Gereklilik türü listesi **aynen** korunuyor (iki eksen: hayat alanları × gereklilik türleri): Bilgi, Beceri, İlişki/Ağ, Finansal kaynak, Varlık/Araç, Belge/Yetkinlik, Alışkanlık, Sağlık/Enerji, Deneyim.
- Her gereklilik ölçülebilir ve takip edilebilir olmalı.

## 4. Planlama motoru (çekirdek)
- Top-down / backcasting: 3 yıl → yıl → ay → hafta → gün → saat.
- Bottom-up / forecasting: gerçekleşmelerden üst ölçeklere doğru yeniden hesaplama.
- Her iki yön de bugün + şu anki saat referanslı.
- Rolling wave planning: her ölçek geçişinde, yakın gelecek detaylı, uzak gelecek kaba.
- ✅ Detaylandırma penceresi **sabit varsayılan değildir** — kullanıcı ilk kurulum (onboarding) sırasında her ölçek için kendi penceresini seçer; Ayarlar'dan sonradan değiştirilebilir.
- ✅ Review ritimleri: **günlük, haftalık, aylık, yıllık** — dördü de uygulanır.
- Dinamik yeniden hesaplama: ilerleme/gecikme/değişiklik sonrası üst-alt ölçekler yeniden dengelenir; büyük değişikliklerde öncesi/sonrası fark gösterilip onay istenir.

## 5. Görevler ve bağımlılıklar
- WBS: büyük görevler yıllardan günlere kadar bölünebilir.
- Bağımlılık türleri: FS, SS, FF, SF + lag/lead.
- Her değişiklikte (taşıma/erteleme/süre değişimi/silme): döngüsel bağımlılık tespiti, topolojik sıralama, kritik yol hesaplaması, paralel görev tespiti.

## 6. Gün içi esneklik
- Görev swap (aynı hafta içinde yer değiştirme); bağımlılık bozulursa uyarı + çözüm önerisi.
- Spontane olay/karar hızlı ekleme; takvimde görünür, etkilenen planlar yeniden hesaplanır.
- Takvim görünümleri: gün/hafta/ay + üst ölçekler için timeline.

## 7. Finans modülü
- Gelir/gider girişi: kategori, alt kategori, tarih, tutar, açıklama, opsiyonel hayat alanı/gereklilik bağlantısı.
- ✅ **Kategori seti (başlangıç, Ayarlar'dan düzenlenebilir):**
  - Gider: Barınma (Kira/Kredi, Faturalar, Aidat), Market & Gıda, Ulaşım (Yakıt, Toplu Taşıma, Bakım), Sağlık (Doktor/İlaç, Spor), Eğitim (Kurs/Kitap, Sertifika), Giyim & Kişisel Bakım, Eğlence & Sosyal, Yatırım & Birikim (Altın, Döviz, Kripto, Hisse/Fon), Borç & Taksit, Diğer.
  - Gelir: Maaş, Yan Gelir/Freelance, Yatırım Getirisi, Hediye/Diğer.
  - Çapraz etiket (kategori değil, filtre): İhtiyaç / İstek.
- ✅ **Çoklu birim referans takibi:** Ana giriş birimi TRY. Her işlem girildiği anda USD kuru, gram altın fiyatı ve BTC fiyatı **anlık olarak snapshot alınıp işlemle birlikte kaydedilir** — böylece harcamanın zaman içindeki USD/altın/BTC cinsinden değeri de görülebilir.
  - ⚙️ Kur kaynağı: önce ücretsiz bir döviz/emtia/kripto kuru API'sinden **otomatik** çekilir (Spark planda sunucu yok, istemciden çağrılır); başarısız olursa (offline, API limiti vb.) kullanıcı **elle girebilir**. Faz 2'de Web Developer uygun ücretsiz API'yi seçip ADR olarak kaydedecek.
- Dashboard: **kategori bazlı dağılım, bütçe vs. gerçekleşen, hayat alanına bağlı harcamalar** gösterilir.
- Para birimi varsayılan TRY, ayarlardan değiştirilebilir.

## 8. Ayarlar sayfası
Kategoriler (öneri): Genel, Takvim & Zaman, Planlama Motoru, Hayat Alanları & Gereklilikler, Görünüm & Tema, Finans, Bildirimler, Veri & Hesap (dışa/içe aktarma dahil). Her ayarın varsayılanı, açıklaması, doğrulaması olmalı.

## 9. UI/UX ve renkler
✅ Zaman & Kaynak Yönetimi Paydaşı'nın önerisi onaylandı: [Renk paleti ve UI akış taslağı](https://claude.ai/artifact/LJxp2XeJMKCL6LXw9Qmg8d).
- Palet: Odak (Primary, #3B5BDB/#748FFC), İlerleme (Success, #2F9E44/#69DB7C), Uyarı (Warning, #E8590C/#FFA94D), Kritik (Danger, #E03131/#FF8787), nötr zemin/yüzey tonları — açık ve koyu tema için ayrı değerlerle.
- Ana ekran akışı: Bugün → Takvim (gün/hafta/ay/timeline) → Hayat Alanları → Finans → Ayarlar.
- Açık/koyu tema, tasarım token'ları (hardcode değil), WCAG AA kontrast. Faz 2'de Web Developer bu paleti ADR olarak `docs/decisions/`'a işleyip otomatik kontrast denetimiyle doğrulayacak.

## Faz 1 durumu
Tüm açık sorular kapandı. Faz 2 (Mimari) için Web Developer'ı bekleyen konular:
- Kur/fiyat API seçimi (USD/altın/BTC) ve istemci tarafı entegrasyon yaklaşımı
- Renk paleti + UI akışının ADR olarak kayıt altına alınması
- Firestore veri modeli (hayat alanları, gereklilikler, finans kategorileri, işlem snapshot alanları dahil)
