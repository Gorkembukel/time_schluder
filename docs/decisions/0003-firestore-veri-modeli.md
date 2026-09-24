# 0003. Firestore veri modeli ve güvenlik kuralları

## Durum
Kabul edildi

## Bağlam
Firebase Spark (ücretsiz) plan, Cloud Functions olmadan Firestore + Authentication sunuyor. Firebase resmi fiyatlandırma sayfasından (2026-09-24 itibarıyla) doğrulanan Spark limitleri:

| Kaynak | Limit |
|---|---|
| Depolama | 1 GiB toplam |
| Ağ çıkışı (egress) | 10 GiB/ay |
| Doküman yazma | 20.000/gün |
| Doküman okuma | 50.000/gün |
| Doküman silme | 20.000/gün |
| Authentication (email/parola, Google vb.) MAU | 50.000'e kadar ücretsiz |

Tek kullanıcılı (kişisel) bir uygulama için bu limitler rahat yeterli, ancak **gereksiz `onSnapshot` dinleyicisi / gereksiz tekrar okuma** günlük 50K okumayı tüketebilir (ör. yanlış yapılandırılmış bir dinleyici döngüsü). Bu yüzden veri modeli ve erişim katmanı bu riski azaltacak şekilde tasarlanmalı.

## Karar — Koleksiyon yapısı
Tüm kullanıcı verisi `users/{uid}` altında, tek kullanıcı kapsamına alınmış:

```
users/{uid}
  ├─ profile                         (doc)      displayName, defaultCurrency, createdAt
  ├─ settings                        (doc)      bkz. aşağıda "Ayarlar şeması"
  ├─ lifeAreas/{areaId}              (coll)     name, order, createdAt, updatedAt
  │    └─ requirements/{reqId}       (coll)     name, type (enum), targetMetric, currentValue, unit, createdAt, updatedAt
  ├─ tasks/{taskId}                  (coll)     title, scale, startAt, endAt, parentTaskId?, lifeAreaId?, requirementId?,
  │                                             status, dependencies: [{taskId, type, lagMinutes}], bufferMinutes,
  │                                             detailLevel ("detailed"|"rough"), createdAt, updatedAt
  ├─ reviews/{reviewId}              (coll)     scale (daily|weekly|monthly|yearly), periodStart, notes,
  │                                             completedTaskIds, createdAt
  ├─ financeCategories/{catId}       (coll)     name, kind (income|expense), parentCategoryId?, order, isDefault
  └─ financeTransactions/{txId}      (coll)     type (income|expense), amountTRY, categoryId, date, description,
                                                 lifeAreaId?, requirementId?, needWant? ("need"|"want"),
                                                 fxSnapshot: { usdRate, goldGramPriceTRY, btcPriceTRY, source ("api"|"manual"), fetchedAt }
```

## Karar — Güvenlik kuralları
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
Tek kural, tüm alt koleksiyonları (`{document=**}`) kapsar; her yeni koleksiyon eklendiğinde kural dosyasını değiştirmeye gerek kalmaz. `firebase-rules-check` skill'i yine de her yeni koleksiyon eklendiğinde bu kapsamın hâlâ doğru olduğunu (ör. yanlışlıkla `users` üstünde bir yerde başka bir `match` bloğu açılmadığını) doğrular.

## Karar — Kota koruma stratejisi
1. **Tek `onSnapshot` per koleksiyon, per oturum** — her feature kendi ad-hoc dinleyicisini açmaz, `services/repositories` katmanındaki paylaşılan hook'lar üzerinden abone olunur (bkz. ADR 0002).
2. **Firestore offline persistence açık** (`enableIndexedDbPersistence` / modern SDK'da varsayılan çoklu-sekme desteği) — tekrar açılışlarda gereksiz ağ okuması önlenir.
3. **Batch yazma:** Planlama motorunun bir değişiklik sonrası birden çok görevi güncellemesi gerektiğinde (ör. kritik yol yeniden hesaplama) tekil `updateDoc` çağrıları yerine `writeBatch` kullanılır (günlük 20K yazma limitine karşı verimlilik).
4. **`reviews` ve `financeTransactions` gibi büyüyen koleksiyonlarda** sorgular her zaman tarih aralığı + `limit()` ile sınırlanır, tüm koleksiyon çekilmez.

## Sonuçlar
- Tek kullanıcı senaryosunda Spark limitleri sorun çıkarmaz; büyüme (çok kullanıcılı hale gelirse) ayrı bir ADR ile Blaze plana geçiş gerektirir.
- Tüm veri `users/{uid}` altında olduğu için güvenlik kuralı tek satırda kalır, gelecekte yeni koleksiyon eklemek güvenlik riski yaratmaz.
- Firestore index gereksinimleri (`financeTransactions` tarih+kategori sorguları gibi) Faz 3'te `firestore.indexes.json`'a eklenecek.
