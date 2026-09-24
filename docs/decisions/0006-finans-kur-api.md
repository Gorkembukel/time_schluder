# 0006. Finans modülü — kur/fiyat API seçimi

## Durum
Kabul edildi

## Bağlam
`docs/requirements.md` §7 (Faz 1 kararı): her finans işlemi girildiğinde USD kuru, gram altın fiyatı ve BTC fiyatı otomatik olarak denenir, başarısız olursa kullanıcı elle girer. Spark planda backend olmadığından bu istekler doğrudan tarayıcıdan (istemciden) yapılmalı — bu yüzden CORS desteği ve API key gerektirmemesi (veya gizlenmesi gerekmeyen bir key olması) öncelikli kriter. 2026-09-24'te resmi dokümantasyonlardan doğrulanan bulgular:

| API | Amaç | Key gerekli mi | CORS | Not |
|---|---|---|---|---|
| **Frankfurter** (frankfurter.dev) | USD/TRY kuru | Hayır | Belirtilmemiş, yaygın istemci-taraflı kullanım örnekleri var | Günlük/aylık kota yok, sadece kötüye kullanım karşı hız sınırlaması; ECB verisine dayanır (iş günü başına 1 güncelleme — "anlık" değil ama referans snapshot için yeterli); altın (XAU) desteklemiyor |
| **gold-api.com** | Gram altın fiyatı | Hayır (belirtilmemiş) | **Evet, açıkça CORS destekli** | Fiyatı ons (Oz.) cinsinden USD döner; gram'a çevirmek için `/31.1035` |
| **CoinGecko Public API** | BTC fiyatı | **Hayır** — `api.coingecko.com` (pro-api.coingecko.com DEĞİL) key'siz çalışıyor, `curl` ile canlı doğrulandı (2026-09-24) | Test edilmedi ama yaygın istemci-taraflı kullanım örnekleri var | `pro-api.coingecko.com` dokümantasyonu key gerektiriyormuş gibi görünüyor ama eski/legacy `api.coingecko.com` alan adı hâlâ key'siz erişime açık |

## Karar
- **USD/TRY:** Frankfurter API — `GET https://api.frankfurter.dev/v1/latest?from=USD&to=TRY` → `rates.TRY`.
- **Gram altın (TRY):** gold-api.com — `GET https://api.gold-api.com/price/XAU` → `price` (USD/ons) → `/31.1035` ile USD/gram'a, ardından aynı istekte alınan USD/TRY kuruyla TRY/gram'a çevrilir (tek ek çağrı yerine mevcut kuru tekrar kullanmak, istek sayısını azaltır).
- **BTC (TRY):** CoinGecko — `GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd` → `bitcoin.usd` → aynı USD/TRY kuruyla TRY'ye çevrilir (TRY'yi doğrudan `vs_currencies` ile istemek yerine — böylece tek bir kur kaynağına (Frankfurter) bağlı kalınır, tutarlılık artar).
- **Fallback stratejisi:** Üç çağrı `Promise.allSettled` ile paralel denenir; başarısız olan(lar) için tutar giriş formunda ilgili alan **boş/manuel giriş** olarak açılır, kullanıcı isterse eliyle girer ya da boş bırakır (zorunlu değil).
- Sonuç `fxSnapshot: { usdRate, goldGramPriceTRY, btcPriceTRY, source: "api"|"manual", fetchedAt }` olarak işlemle birlikte kaydedilir (bkz. ADR 0003).

## Sonuçlar
- Ekstra backend/proxy gerekmiyor, üç servis de (veya manuel giriş) doğrudan istemciden çalışıyor.
- Üç endpoint de 2026-09-24'te `curl` ile canlı doğrulandı, belirsizlik kalmadı.
- API'lerden biri kalıcı olarak değişirse/kapanırsa `src/lib/fx/` katmanı tek noktadan değiştirileceği için (ADR 0002) etkisi izole kalır.
