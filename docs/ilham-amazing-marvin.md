# Amazing Marvin'den ilham alınabilecek özellikler

Bu doküman, [Amazing Marvin](https://amazingmarvin.com/) uygulaması üzerine yapılan araştırma (2026-09-25) sonucunda time_schluder'a eklenebilecek özellik/UX fikirlerini listeler. Her madde nereden (hangi kaynaktan) geldiğini belirtir. Bu bir karar kaydı değil, bir fikir havuzudur — uygulanacak olanlar ayrı ADR'ler veya görevler olarak ele alınmalıdır.

## 1. "Stratejiler" paneli
Marvin, planlama davranışlarını (time-blocking bölümleme, anti-overwhelm, 1-3-5 kuralı, Eisenhower vb.) bağımsız olarak açılıp kapatılabilen 100+ modül ("strateji") halinde sunuyor; tek bir workflow'u dayatmıyor.

**time_schluder'a uyarlama fikri:** Ayarlar sayfasında her planlama davranışını (örn. "otomatik planla", "rutin doldur", "tampon oranı uygula") bağımsız bir toggle haline getirmek. Bu, projenin mevcut "hardcode yasak, her şey config/ayarlar katmanına" kuralıyla doğrudan örtüşüyor.

**Kaynak:** [Features | Amazing Marvin](https://amazingmarvin.com/features/), [Amazing Marvin Review 2026 | Saner.AI](https://www.saner.ai/blogs/amazing-marvin-review)

## 2. Haftalık ızgara UX iyileştirmeleri
- **Shift+sürükle = kopyala:** Aynı bloğu tekrar oluşturmak yerine shift tutup sürükleyince kopyalanıyor.
- **İsme göre akıllı eşleştirme:** Aynı isimli bloklar otomatik olarak aynı renk/kategoriyi (hayat alanı) miras alıyor.
- **"T" kısayolu → pasta grafiği:** Haftalık zamanın hayat alanlarına göre dağılımını anlık gösteren bir kısayol.

**time_schluder'a uyarlama fikri:** Mevcut haftalık program ızgarasına (günler×saatler, sürükle-bırak) bu üç UX detayını eklemek; özellikle hayat alanı bazlı zaman dağılım pasta grafiği.

**Kaynak:** [Time Blocking | Amazing Marvin Help Center](https://help.amazingmarvin.com/en/articles/1950240-time-blocking), [Time Block Sections | Amazing Marvin Help Center](https://help.amazingmarvin.com/en/articles/1950243-time-block-sections)

## 3. Anti-Overwhelm / "Dopamine Menu"
Gelecekteki görevleri gizleyip sadece bugünü gösteren bir mod, artı düşük motivasyon anlarında gösterilecek kısa/kolay görevler listesi. ADHD-dostu tasarım yaklaşımının bir parçası.

**time_schluder'a uyarlama fikri:** Mevcut Robot oyunlaştırma sistemine (XP/seviye/seri/rozet) tamamlayıcı olarak, "seri kırılmasın diye bugün sadece şunu yap" türünde bir öneri/gizleme modu.

**Kaynak:** [Features | Amazing Marvin](https://amazingmarvin.com/features/), [Amazing Marvin Review 2026 | Saner.AI](https://www.saner.ai/blogs/amazing-marvin-review)

## 4. Eisenhower Matrix & Kanban — mevcut veri modelinin alternatif görünümleri
Marvin, aynı görev verisini önem×aciliyet matrisi (Eisenhower) ve Kanban panosu olarak da gösterebiliyor.

**time_schluder'a uyarlama fikri:** Mevcut bağımlılık grafiği (FS/SS/FF/SF) ve Pano üzerinde, yeni bir veri modeli gerektirmeden, aynı görevleri önem×aciliyet matrisi olarak gösteren ikinci bir görünüm eklemek.

**Kaynak:** [Amazing Marvin App Review | TimeHackHero](https://timehackhero.com/amazing-marvin-app-review/), [Features | Amazing Marvin](https://amazingmarvin.com/features/)

## 5. "1-3-5" günlük planlama modu
Basit bir alternatif günlük yapı: 1 büyük + 3 orta + 5 küçük görev.

**time_schluder'a uyarlama fikri:** Otomatik planlayıcının yanında, hafif bir "manuel gün kurma" şablonu olarak sunulabilir.

**Kaynak:** [Amazing Marvin App Review | TimeHackHero](https://timehackhero.com/amazing-marvin-app-review/)

## 6. Ödül noktaları / "reward shop"
Marvin'de kazanılan puanlar, kullanıcının kendi tanımladığı ödüllere harcanabiliyor (gamification + points + level sistemi).

**time_schluder'a uyarlama fikri:** Mevcut Robot sistemindeki XP/rozet/seviyeyi bir adım öteye taşıyıp, kullanıcının kendi ödüllerini tanımlayıp puan biriktirip "satın alabildiği" bir ekran eklemek. Ödüller kullanıcı tanımlı olacağından hardcode-yasak kuralına tamamen uygun.

**Kaynak:** [Features | Amazing Marvin](https://amazingmarvin.com/features/), [Amazing Marvin - The Customizable Task Manager for ADHD](https://amazingmarvin.com/)

## 7. Focus Mode / Spotlight
Tek görevi tam ekran gösterip zamanlayıcı ile çalışan izole bir "odak modu".

**time_schluder'a uyarlama fikri:** Saatlik ölçekte ilerleme takibiyle (bottom-up/forecasting) iyi örtüşecek, tek görevlik tam ekran odak görünümü.

**Kaynak:** [Features | Amazing Marvin](https://amazingmarvin.com/features/)

## 8. "Funnel" (huni) metaforu
Marvin, "tüm görevlerden tek göreve" kademeli daraltmayı bir huni olarak görselleştiriyor.

**time_schluder'a uyarlama fikri:** 3 yıllık→yıllık→aylık→haftalık→günlük→saatlik top-down kırılımını kullanıcıya anlatmak için breadcrumb yerine/yanında daralan huni görseli kullanmak.

**Kaynak:** [Features | Amazing Marvin](https://amazingmarvin.com/features/)

## Diğer gözlemler (uygulanabilirlik değerlendirilmedi)
- **Time Tracking:** Her görev için zaman takibi (Pomodoro dahil) — sizin bottom-up/forecasting modülünüzle karşılaştırılabilir.
- **Smart Lists:** Kullanıcı tanımlı kriterlere göre otomatik filtrelenen kayıtlı listeler.
- **Task Batching:** Benzer görevleri (aynı hayat alanı/konum gibi) gruplayıp art arda yapma önerisi.
- **300+ ayarlanabilir seçenek:** Marvin'in customization derinliği; öğrenme eğrisi konusunda kullanıcı yorumları "ilk hafta bunaltıcı" şeklinde — bu bir uyarı: strateji panelini eklerken varsayılanları basit tutmak önemli.

**Kaynak:** [Features | Amazing Marvin](https://amazingmarvin.com/features/), [Amazing Marvin Reviews 2026 | Capterra](https://www.capterra.com/p/238806/Amazing-Marvin/)
