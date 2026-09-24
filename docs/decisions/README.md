# Mimari Karar Kayıtları (ADR)

Bu klasör, projenin önemli mimari/teknik kararlarını gerekçesiyle kaydeder. Her karar `NNNN-kisa-baslik.md` formatında ayrı bir dosyadır (ör. `0001-teknoloji-yigini.md`).

## Şablon

```markdown
# NNNN. <Karar başlığı>

## Durum
Önerildi / Kabul edildi / Reddedildi / Değiştirildi (→ NNNN)

## Bağlam
<Bu kararı gerektiren durum, kısıt, ihtiyaç>

## Karar
<Ne karar verildi>

## Gerekçe
<Neden bu seçenek, hangi alternatifler değerlendirildi ve neden elendi>

## Sonuçlar
<Bu kararın getirdiği artılar, eksiler, gelecekteki etkiler>
```

İlk ADR'ler Faz 2'de (Mimari) eklenecek: teknoloji seçimi, klasör yapısı, Firestore veri modeli, güvenlik kuralları, planlama motoru algoritma taslağı, deploy akışı.
