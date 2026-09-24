# 0002. Klasör yapısı

## Durum
Kabul edildi

## Bağlam
ADR 0001'de seçilen Vite+React+TS yığınına göre, 5 ana ekranı (Bugün, Takvim, Hayat Alanları, Finans, Ayarlar) ve ayrı bir planlama motoru katmanını düzenli tutacak bir yapı gerekiyor.

## Karar
Özellik bazlı (feature-based) klasörleme:

```
src/
  app/                  # Router, providers (theme, auth), giriş noktası
  features/
    bugun/
    takvim/             # gün/hafta/ay/timeline alt görünümleri
    hayat-alanlari/
    finans/
    ayarlar/
    auth/
  components/           # Paylaşılan, alan-bağımsız UI bileşenleri (Button, Card, Modal...)
  lib/
    planning-engine/    # backcasting, forecasting, rolling-wave, dependency-graph, critical-path
    fx/                 # kur/fiyat API istemcileri (USD, altın, BTC) + manuel fallback
  hooks/                # paylaşılan custom hook'lar (ör. useFirestoreCollection)
  stores/               # Zustand store'ları
  services/
    firebase.ts         # Firebase init
    repositories/        # Firestore koleksiyon erişim katmanı (tek yerden okuma/yazma)
  types/                 # paylaşılan TS tipleri
  config/                 # varsayılan ayarlar, sabitler (config-audit'in referans aldığı katman)
  styles/                 # tokens.css (renk/tema token'ları), globals.css
public/
docs/                     # (mevcut)
.claude/                  # (mevcut)
.github/workflows/        # CI/CD
firestore.rules
firestore.indexes.json
```

## Gerekçe
- **Feature-based**, layer-based (`controllers/`, `views/` gibi) yapıya tercih edildi çünkü her ekran (`takvim`, `finans` vb.) kendi state/bileşen/hook'larıyla bağımsız gelişebiliyor; büyüdükçe layer-based yapıda dosyalar arası zıplama artar.
- `lib/planning-engine` ve `lib/fx`, UI'dan tamamen bağımsız, saf TypeScript fonksiyonlar olarak tutulur — bu, Vitest ile UI'sız birim testini kolaylaştırır ve motorun ileride (ör. bir mobil istemciye) taşınmasını mümkün kılar.
- `services/repositories`, tüm Firestore okuma/yazmalarını tek noktadan geçirir — gereksiz okuma/batch yazma disiplinini (Spark kota kısıtı) buradan zorlamak, her feature'ın kendi ad-hoc Firestore çağrısı yapmasından daha güvenli.
- `config/`, hardcode-yasak kuralının teknik karşılığıdır; `config-audit` skill'i öncelikle burayı ve Ayarlar sayfası eşleşmesini denetler.

## Sonuçlar
- Yeni bir ekran eklemek yeni bir `features/<isim>/` klasörü açmak demektir, mevcut yapıyı bozmaz.
- Planlama motoru testleri UI kurulumu gerektirmeden çalışır, CI'da hızlı geri bildirim sağlar.
