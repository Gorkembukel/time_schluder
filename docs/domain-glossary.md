# Kavram Sözlüğü

> Faz 1 (Keşif) ile netleştirilmiştir. Kesinleşmemiş terimler (varsa) `(taslak)` işaretlidir.

## Planlama
| Terim | Tanım |
|---|---|
| Vizyon | Uzun vadeli (3 yıllık) nihai istenen durum |
| Hedef (OKR / SMART) | Vizyona giden, ölçülebilir ara sonuçlar |
| Stratejik / Taktik / Operasyonel plan | Sırasıyla yıllık/aylık, aylık/haftalık, haftalık/günlük-saatlik plan seviyeleri (taslak) |
| Rolling wave planning (kademeli detaylandırma) | Yakın gelecek detaylı, uzak gelecek kaba planlanır; ilerledikçe detay artar |
| Backcasting | Hedef ölçekten (3 yıl) bugüne doğru geriye planlama |
| Forecasting | Bugünden hedef ölçeğe (3 yıl) doğru ileriye, gerçekleşmelere dayalı yeniden hesaplama |
| WBS (İş Kırılım Yapısı) | Büyük görevlerin küçük görevlere bölünmesi |
| Zaman bloklama | Takvimde belirli zaman aralıklarının belirli görevlere ayrılması |
| Kapasite | Bir dönemde gerçekçi olarak ayrılabilecek zaman miktarı |
| Tampon (buffer) | Planlanan süreye eklenen güvenlik payı |
| Kritik yol | Bir hedefin bitiş tarihini doğrudan etkileyen bağımlı görevler zinciri |
| Kilometre taşı (milestone) | Süre içermeyen, ilerlemeyi işaretleyen referans nokta |
| Detaylandırma penceresi | Bir ölçekte kaç gün/hafta/ay ileriye kadar detaylı (alt ölçeğe kırılmış) plan yapıldığı — ayarlardan değiştirilebilir |
| Review ritmi | Günlük/haftalık/aylık/yıllık gözden geçirme döngüsü |

## İş hiyerarşisi ve iş akışı
Jira eşlemesi (bkz. `.claude/personas/jira-developer.md`). Her iş bir üst ölçekteki işe **parent link** ile bağlanır ve hayat alanını ondan devralır; aynı iş tek kaynaktır, her ölçek görünümünde (dönemle kesiştiği sürece) görünür.

| Terim | Tanım |
|---|---|
| Initiative | Hayat alanı — hiyerarşinin kökü |
| Epic | 3 Yıl / Yıl ölçeğindeki hedef |
| Story | Ay ölçeğindeki iş |
| Task | Hafta / Gün / Saat ölçeğindeki iş |
| Parent link (üst iş) | Bir işin bağlı olduğu bir üst ölçekteki iş; ebeveyni olmayan (kök) işte hayat alanı zorunludur |
| Roll-up | Üst işin ilerlemesinin alt işlerden hesaplanması (tamamlanan alt işlerin ağırlıksız ortalaması) |
| İş akışı durumu | Planlandı → Devam ediyor → Tamamlandı; Pano'nun kolonlarıdır |
| Gecikti | Durum değil, işarettir: bitiş tarihi geçmiş ve tamamlanmamış işlerde otomatik gösterilir |
| Planlanabilir oran | Günün (gün başlangıç–bitiş arası) hedeflere ayrılabilen kısmı; kapasite hesabında kullanılır, Ayarlar'dan değişir |
| Alan önceliği | Hayat alanının backcast bütçesindeki ağırlık çarpanı (Düşük/Normal/Yüksek); opsiyonel, varsayılan Normal |
| Gerçekleşen süre | Tamamlanan işte harcanan süre; opsiyonel, girilmezse saatlik görevin planlanan süresi kullanılır |
| Rehber | Dönemin kapasite/bütçe/gerçekleşme özetini ve somut önerileri gösteren panel (Takvim, Genel Bakış) |
| Pano (Kanban) | İşlerin durum kolonlarında sürükle-bırak / klavye ile taşındığı görünüm |

## Görev bağımlılıkları
| Terim | Tanım |
|---|---|
| FS (Finish-to-Start) | A bitmeden B başlamaz |
| SS (Start-to-Start) | A başlayınca B de başlayabilir |
| FF (Finish-to-Finish) | A bitmeden B bitemez |
| SF (Start-to-Finish) | A başlamadan B bitemez |
| Lag / Lead | Bağımlılığa eklenen gecikme / öne alma süresi |

## Hayat alanları ve gereklilikler
İki eksenli model: **hayat alanı** (dinamik, kullanıcı tanımlı) × **gereklilik türü** (sabit 9 tür). Bu iki kavram birbirinin alt kategorisi değil, birbirinden bağımsız iki sınıflandırma eksenidir — her gereklilik hem bir hayat alanına hem bir türe aittir.

| Terim | Tanım |
|---|---|
| Hayat alanı | Kullanıcının ilerlemek istediği dinamik olarak tanımlı kategori (ör. mühendislik, iş, sosyal, sağlık, finans); ekle/sil/düzenle serbest |
| Gereklilik | Bir hayat alanında ilerlemek için gereken, ölçülebilir ve takip edilebilir birim |
| Gereklilik türü | Sabit liste: Bilgi, Beceri, İlişki/Ağ, Finansal kaynak, Varlık/Araç, Belge/Yetkinlik, Alışkanlık, Sağlık/Enerji, Deneyim |

## Finans
| Terim | Tanım |
|---|---|
| Kategori / alt kategori | Ayarlardan yönetilebilir harcama/gelir sınıflandırması — başlangıç seti `requirements.md` §7'de |
| İhtiyaç / İstek | Kategoriye ek, çapraz filtre etiketi (ayrı kategori değil) |
| Bütçe vs. gerçekleşen | Planlanan harcama ile gerçekleşen harcamanın karşılaştırılması |
| Referans kur snapshot'ı | İşlem girildiği andaki USD, gram altın ve BTC fiyatının işlemle birlikte kaydedilmesi — harcamanın zaman içinde bu birimler cinsinden değerini görebilmek için |
