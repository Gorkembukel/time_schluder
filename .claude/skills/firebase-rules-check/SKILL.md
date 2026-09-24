---
name: firebase-rules-check
description: Firestore Security Rules değiştiğinde veya yeni bir koleksiyon/alan eklendiğinde, her kullanıcının yalnızca kendi verisini okuyup yazabildiğini doğrulayan denetim. Deploy öncesi çalıştırılır.
---

# firebase-rules-check

Spark (ücretsiz) planda Cloud Functions olmadığı için tüm veri erişim güvenliği Firestore Security Rules'a dayanır. Bu skill, kuralların "her kullanıcı yalnız kendi verisi" ilkesini koruduğunu doğrular.

## Ne zaman çalışır
- `firestore.rules` dosyası değiştiğinde
- Yeni bir Firestore koleksiyonu/alt koleksiyonu eklendiğinde
- Deploy öncesi (`release-deploy` skill'inin bir ön koşulu olarak)

## Kontrol adımları
1. **Kapsam taraması:** `firestore.rules` içindeki her `match` bloğunu listele. Her koleksiyon/alt koleksiyon için:
   - [ ] `request.auth != null` kontrolü var mı (kimliksiz erişim engelleniyor mu)?
   - [ ] Okuma/yazma, veri sahibinin `uid`'i ile eşleşen bir alana (`resource.data.uid == request.auth.uid` veya path'teki `{userId}` segmenti) bağlı mı?
   - [ ] Varsayılan kural `allow read, write: if false;` mı (yani açıkça izin verilmeyen her şey reddediliyor mu)?
2. **Yeni koleksiyon kontrolü:** Kod tarafında yeni bir Firestore koleksiyonuna yazan/okuyan kod eklendiyse, `firestore.rules`'da buna karşılık gelen bir `match` bloğu var mı? Yoksa DURDUR, önce kural eklenmeli.
3. **Simülasyon (mümkünse):** Firebase Emulator Suite kuruluysa (`firebase emulators:start --only firestore`) test senaryolarıyla (kendi verisine erişim izinli, başkasının verisine erişim reddedilmeli) doğrula. Kurulu değilse kullanıcıya emulator kurulumunu öner, kendin kurmaya çalışma.
4. **Rapor:** Bulunan her açık/eksik kuralı dosya:satır ile birlikte listele, önerilen düzeltmeyi yaz.

## Kurallar
- Kural eksikse veya `allow read, write: if true;` gibi aşırı izinli bir kural varsa deploy'a **izin verme**, kullanıcıyı uyar.
- `firestore.rules` versiyon kontrolünde tutulur, `.gitignore`'a asla eklenmez.
