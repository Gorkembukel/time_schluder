# Ürün Gereksinimleri

> Faz 0 taslağıdır; kaynak metin proje başlangıç promptudur. Faz 1'de Paydaş ve Finans personalarının kullanıcıya soracağı sorularla netleştirilecek maddeler `❓` ile işaretlidir.

## 1. Amaç
Asıl kaynağın zaman olduğu kişisel kaynak yönetimi web uygulaması. 3 yıllık, yıllık, aylık, haftalık, günlük, saatlik ölçeklerde planlama ve ilerleme takibi.

❓ Çeyrek (quarter) gibi bir ara ölçek gerekiyor mu — Paydaş personası soracak.

## 2. Teknik çerçeve (Faz 2'de kesinleşecek — burada özet)
- Yayın: GitHub Pages, build/deploy GitHub Actions.
- SPA routing GitHub Pages'te sorun çıkarmamalı (hash router vs. 404.html — Web Developer seçip gerekçelendirecek).
- Veritabanı: Firebase Spark (ücretsiz) plan — Firestore + Authentication, Cloud Functions yok, tüm hesaplama istemci tarafında.
- Firestore Security Rules ile her kullanıcı yalnız kendi verisini okur/yazar.

## 3. Hayat alanları ve gereklilikler
- Hayat alanları dinamik: ekle/sil/düzenle.
- Her alan için gereklilik listesi.
- ❓ Gereklilik türü isimleri Paydaş personası tarafından sorularak kesinleştirilecek (başlangıç önerisi: Bilgi, Beceri, İlişki/Ağ, Finansal kaynak, Varlık/Araç, Belge/Yetkinlik, Alışkanlık, Sağlık/Enerji, Deneyim).
- Her gereklilik ölçülebilir ve takip edilebilir olmalı.

## 4. Planlama motoru (çekirdek)
- Top-down / backcasting: 3 yıl → yıl → ay → hafta → gün → saat.
- Bottom-up / forecasting: gerçekleşmelerden üst ölçeklere doğru yeniden hesaplama.
- Her iki yön de bugün + şu anki saat referanslı.
- Rolling wave planning: her ölçek geçişinde, yakın gelecek detaylı, uzak gelecek kaba. Detay penceresi ayarlardan değiştirilebilir.
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
- Gelir/gider girişi: kategori, alt kategori (❓ Finans Paydaşı belirleyecek), tarih, tutar, açıklama, opsiyonel hayat alanı/gereklilik bağlantısı.
- Dashboard: kategori/dönem bazlı harcama, trend, bütçe vs. gerçekleşen.
- Para birimi varsayılan TRY, ayarlardan değiştirilebilir.

## 8. Ayarlar sayfası
Kategoriler (öneri): Genel, Takvim & Zaman, Planlama Motoru, Hayat Alanları & Gereklilikler, Görünüm & Tema, Finans, Bildirimler, Veri & Hesap (dışa/içe aktarma dahil). Her ayarın varsayılanı, açıklaması, doğrulaması olmalı.

## 9. UI/UX ve renkler
- ❓ Paydaş personası UI/UX akışı ve renk paletini belirleyip gerekçeleriyle sunacak, kullanıcı onaylamadan uygulanmayacak.
- Açık/koyu tema, tasarım token'ları (hardcode değil), WCAG AA kontrast.

## Açık sorular (Faz 1'de kapatılacak)
- Ara ölçek (çeyrek) gerekli mi?
- Gereklilik türü kesin listesi
- Finans kategori/alt kategori kesin listesi
- UI/UX akışı ve renk paleti
- Detaylandırma penceresi varsayılan değerleri (her ölçek için)
