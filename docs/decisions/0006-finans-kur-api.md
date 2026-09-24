# 0006. Finans modülü — kur/fiyat API seçimi

## Durum
Kabul edildi

## Bağlam
`docs/requirements.md` §7 (Faz 1 kararı): her finans işlemi girildiğinde USD kuru, gram altın fiyatı ve BTC fiyatı otomatik olarak denenir, başarısız olursa kullanıcı elle girer. Spark planda backend olmadığından bu istekler doğrudan tarayıcıdan (istemciden) yapılmalı — bu yüzden CORS desteği ve API key gerektirmemesi (veya gizlenmesi gerekmeyen bir key olması) öncelikli kriter. 2026-09-24'te resmi dokümantasyonlardan doğrulanan bulgular:

| API | Amaç | Key gerekli mi | CORS | Not |
|---|---|---|---|---|
| **Frankfurter** (frankfurter.dev) | USD/TRY kuru | Hayır | Belirtilmemiş, yaygın istemci-taraflı kullanım örnekleri var | Günlük/aylık kota yok, sadece kötüye kullanım karşı hız sınırlaması; ECB verisine dayanır (iş günü başına 1 güncelleme — "anlık" değil ama referans snapshot için yeterli); altın (XAU) desteklemiyor |
| **gold-api.com** | Gram altın fiyatı | Hayır (belirtilmemiş) | **Evet, açıkça CORS destekli** | Fiyatı ons (Oz.) cinsinden USD döner; gram'a çevirmek için `/31.1035` |
| **CoinGecko Public API** | BTC fiyatı | Belirsiz — dokümantasyon "Demo API" ayrı bir anahtar kurulumundan bahsediyor, net değil | Belirtilmemiş | Faz 3'te implementasyon sırasında güncel Demo API politikası tekrar kontrol edilecek; gerekirse key'siz alternatif (ör. Binance public ticker endpoint) değerlendirilecek |

## Karar
- **USD/TRY:** Frankfurter API (`api.frankfurter.dev/v1/latest?from=USD&to=TRY`).
- **Gram altın (TRY):** gold-api.com'dan USD/ons alınır → `/31.1035` ile USD/gram'a, ardından Frankfurter'daki USD/TRY kuruyla TRY/gram'a çevrilir (tek ek çağrı yerine mevcut USD/TRY kurunu tekrar kullanmak, gereksiz istek sayısını azaltır).
- **BTC (TRY):** CoinGecko public `simple/price` endpoint denenir; Faz 3'te implementasyon başında API key/rate-limit durumu güncel dokümantasyondan tekrar doğrulanacak (bu ADR'da "belirsiz" işaretli tek madde).
- **Fallback stratejisi:** Üç çağrı da `Promise.allSettled` ile paralel denenir; başarısız olan(lar) için tutar giriş formunda ilgili alan **boş/manuel giriş** olarak açılır, kullanıcı isterse eliyle girer ya da boş bırakır (zorunlu değil).
- Sonuç `fxSnapshot: { usdRate, goldGramPriceTRY, btcPriceTRY, source: "api"|"manual", fetchedAt }` olarak işlemle birlikte kaydedilir (bkz. ADR 0003).

## Sonuçlar
- Ekstra backend/proxy gerekmiyor, üç servis de (veya manuel giriş) doğrudan istemciden çalışıyor.
- CoinGecko'nun key gereksinimi Faz 3'ün ilk görevlerinden biri olarak doğrulanmalı; gerekirse bu ADR güncellenir (durum → "Değiştirildi").
- API'lerden biri kalıcı olarak değişirse/kapanırsa `src/lib/fx/` katmanı tek noktadan değiştirileceği için (ADR 0002) etkisi izole kalır.
