# 0004. Planlama motoru algoritma taslağı

## Durum
Kabul edildi

## Bağlam
`docs/requirements.md` §4-6'da tanımlanan davranış (backcasting, forecasting, rolling wave, bağımlılık türleri, dinamik yeniden hesaplama, görev swap) Spark planda tamamen istemci tarafında çalışmalı. Bu ADR, `src/lib/planning-engine/` içindeki modülleri ve akışlarını taslak olarak tanımlar; ayrıntılı implementasyon Faz 3'te yapılır.

## Karar — Modüller
1. **`scales.ts`** — 6 ölçek (yıl3, yil, ay, hafta, gun, saat) arası dönüşüm/kırılım yardımcıları (date-fns üzerine ince katman).
2. **`rollingWave.ts`** — verilen bir tarih ve ölçek için, kullanıcının Ayarlar'da tanımladığı detaylandırma penceresine göre bir görevin `detailLevel`'ını (`"detailed" | "rough"`) belirler. Pencere sınırı her gün/her review'da yeniden değerlendirilir (ör. dün "rough" olan bir hafta, detay penceresine girince "detailed"e döner ve alt görevlere kırılması gerektiği kullanıcıya işaretlenir).
3. **`dependencyGraph.ts`** — görevleri ve `dependencies` alanındaki (taskId, type: FS/SS/FF/SF, lagMinutes) ilişkileri yönlü graf olarak modeller.
   - **Döngü tespiti:** DFS tabanlı (beyaz/gri/siyah renklendirme) — döngü bulunursa değişiklik reddedilir, kullanıcıya hangi görevlerin döngü oluşturduğu gösterilir.
   - **Topolojik sıralama:** Kahn algoritması — görevlerin yürütme sırasını belirler, paralel yürütülebilecek görevleri (aynı "seviye"de olanlar) gruplar.
   - **Kritik yol:** Ağırlıklı (süre bazlı) en uzun yol hesaplaması (CPM — Critical Path Method), forward pass (en erken başlangıç/bitiş) + backward pass (en geç başlangıç/bitiş) ile serbest bolluk (float) hesaplanır; float = 0 olan görevler kritik yolu oluşturur.
4. **`backcast.ts`** — 3 yıllık hedeften bugüne doğru, kapasite ve tampon oranlarını dikkate alarak üst ölçekten alt ölçeğe kaba bir zaman bütçesi dağıtır (top-down).
5. **`forecast.ts`** — günlük/saatlik gerçekleşmelerden (tamamlanan görev süreleri, review kayıtları) yukarı doğru toplayarak üst ölçek planının gerçekçiliğini yeniden hesaplar (bottom-up); sapma tespit edilirse `recalculate.ts`'i tetikler.
6. **`recalculate.ts`** — bir görev taşındığında/ertelendiğinde/silindiğinde: 1) `dependencyGraph` ile etkilenen görevleri bul, 2) bağımlılık türüne ve lag/lead'e göre yeni tarihleri hesapla, 3) `backcast`/`forecast` ile üst ölçekleri yeniden dengele, 4) **değişiklik boyutu bir eşiği aşarsa** (ör. bir görevin >1 gün kayması veya kritik yolun değişmesi) sonucu "öneri" olarak döndürür — otomatik uygulanmaz, UI kullanıcıya öncesi/sonrası diff'i gösterip onay ister; küçük değişiklikler otomatik uygulanır.
7. **`swap.ts`** — aynı hafta içindeki iki görevi yer değiştirir; işlem sonrası `dependencyGraph`'ı yeniden değerlendirir, bağımlılık ihlali varsa kullanıcıya somut çözüm önerileri (ör. "B görevini de kaydır" / "bağımlılığı gevşet") sunar, hiçbirini otomatik uygulamaz.

## Karar — "Büyük değişiklik" eşiği
Varsayılan: bir yeniden hesaplamanın etkilediği görev sayısı ≥3 **veya** kritik yol değişiyorsa "büyük" sayılır ve onay istenir; bunun altı sessizce uygulanır. Eşik değeri Ayarlar'dan (Planlama Motoru kategorisi) değiştirilebilir — hardcode edilmez.

## Sonuçlar
- Tüm modüller saf fonksiyon olarak yazılacağından Vitest ile UI'sız, deterministik test edilebilir (özellikle döngü tespiti ve kritik yol için sabit örnek graflarla).
- "Büyük değişiklik" eşiği gibi davranışsal sabitler baştan Ayarlar'a bağlanarak `config-audit`'in ilk denetim hedefi olur.

## Ek: Backcast/forecast arayüz entegrasyonu (2026-09-25)
`src/lib/capacityGuidance.ts`, `backcast.ts` ve `forecast.ts`'i kullanıcıdan yeni girdi istemeden bağlar (bkz. `.claude/personas/musteri.md`, "Minimum girdi, maksimum yönlendirme"):
- **Kapasite** = dönemdeki gün sayısı × (gün bitiş − başlangıç saati) × `planningEngine.plannableRatio`; bundan `bufferRatio` kadar tampon düşülür.
- **Backcast ağırlığı** = hayat alanının dönemle kesişen açık hedef sayısı (dönem ölçeği ve üstü) × `priorityWeights[alan.priority ?? 'normal']`.
- **Forecast**: gerçekleşen süre = tamamlanan saatlik görevlerin süresi (varsa elle girilen `actualMinutes`); projeksiyon = gerçekleşen + dönemin kalanındaki planlı süre; tempo = gerçekleşen vs. bütçe × geçen süre oranı. `forecastDeviationThreshold` aşılınca uyarı.
- **Hedef sapması**: alt işlerden toplanan ilerleme (roll-up) vs. hedefin geçen süre oranı.
- Çıktı somut önerilere çevrilir ve Takvim sekmelerinde (dönem rehberi) ve Genel Bakış'ta (haftalık rehber) gösterilir. Öneriler şimdilik otomatik uygulanmaz, kullanıcı karar verir.

## Ek: Otomatik planlayıcı ve haftalık program (2026-09-25)
`src/lib/autoPlanner.ts` + `src/lib/autoPlan.ts`:
1. **Kırılım** (`planBreakdown`): açık 3 Yıl/Yıl/Ay hedefleri, *hedefin kendi ölçeğinin* detaylandırma penceresi kadar ileriye alt dönemlere bölünür (ör. yıl hedefi → önümüzdeki 90 gündeki aylar). Mevcut alt işle kesişen dönem tekrar oluşturulmaz.
2. **Talep** (`computeWeeklyDemands`): alanın haftalık backcast bütçesinden yapılan+planlı düşülür, kalan alanın yaprak hedeflerine eşit bölünür, `autoBlockMinutes`'a yuvarlanır.
3. **Yerleşim** (`scheduleWeek`): rutinler ve mevcut bloklar dolu; talepler bağımlılık sırasına (topolojik) ve en erken bitişe göre işlenir; her turda her güne en fazla bir blok (haftaya yayılır). FS/SS başlangıç, FF/SF bitiş kısıtı; öncül hafta içinde bitmiyorsa "bloke" raporlanır.
Sonuç önizlenir, onayla `createTasksBatch` ile önceden üretilmiş id'lerle toplu yazılır. Elle yerleşim bağımlılığı ihlal ederse engellenmez, uyarılır.
