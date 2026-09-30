# 0014. Görsel Planlama Kanvası konuya taşındı

## Durum
Kabul edildi

## Bağlam
Görsel Planlama Kanvası (`src/features/kanvas/PlanningCanvas.tsx`) başlangıçta bir hayat alanına bağlıydı (`/kanvas/:areaId`, Hayat Alanları ekranındaki "Kanvasta Planla" butonuyla açılıyordu; taslak veri `CanvasDraft` alanın id'sine kayıtlıydı). Kullanıcı, Bilgi ve Kaynak Katmanı'nın (bkz. ADR 0009-0013) Faz 1 uygulaması sırasında, kanvası **Konu Çalışma Ortamı**'nın bir sekmesine taşımak istedi: soldaki havuz paneli dikey, kayan ve filtrelenebilir bir görev listesine dönüşsün, ayrı "Kanvasta Planla" sayfası yerine Konu sayfasında bir "Kanvas" sekmesinden erişilsin.

## Karar
- `PlanningCanvas` artık `{ areaId, topicId, topicName }` alır; kök seviyedeki gerçek işler artık `t.lifeAreaId === areaId` yerine `t.topicIds?.includes(topicId)` ile filtrelenir — kanvas **konuya bağlı**, hayat alanına değil.
- Taslak veri (`CanvasDraft`) hâlâ `contextId` ile anahtarlanıyor (bkz. ADR/kod: `canvasDraftsRepository.ts` zaten jenerik), sadece kök seviyede `contextId = topicId` (önceden `areaId`). Alt-kanvas (bir işin çocukları) davranışı değişmedi.
- Havuzdan kilitlenen yeni kök işler hem `lifeAreaId` (hiyerarşi/roll-up için) hem `topicIds: [topicId]` (kanvasta görünmeye devam etmesi için) alır.
- `/kanvas/:areaId` route'u, `PlanningCanvasPage.tsx` ve Hayat Alanları'ndaki "Kanvasta Planla" butonu **kaldırıldı**. Erişim yalnızca Konu Çalışma Ortamı sayfasındaki "Bilgi birimleri | Kanvas" sekmeleri üzerinden.
- Sol panel (`PoolPanel` → `TaskPoolPanel`) artık yalnızca havuzdaki taslakları değil, bu seviyedeki **gerçek (planlanmış) işleri de** gösteren birleşik, dikey, kayan bir liste: arama + Tür (Görev/Kilometre taşı) + Durum (Planlanmış/Planlanmamış) + Bağımlılık (var/yok) filtreleri. Planlanmış bir işe tıklamak zaman şeridini o işe odaklar (`focusRealTask`); taslaklar eskisi gibi sürüklenerek yerleştirilir.

## Gerekçe / alternatifler
| Seçenek | Neden seçildi/elendi |
|---|---|
| **Konuya bağlı kanvas (kullanıcı tercihi)** | **Seçildi** — her konunun kendi bağımsız planlama alanı olması, Konu'nun "çalışma ortamı" olma amacıyla tutarlı. Mevcut alan-bazlı kanvas verisi kullanıcı onayıyla göçürülmeden bırakıldı (yeni konular sıfırdan başlar). |
| Hayat alanına bağlı kalıp Konu sayfasından kısayol | Elendi (kullanıcı tercihi) — konuya özel filtrelenmiş görev listesi isteniyordu, alan-bazlı kalınca bu ayrım kaybolurdu. |
| Havuz listesini yalnızca taslaklarla sınırlı tutmak | Elendi — kullanıcı açıkça "planlanmış/planlanmamış" filtresi istedi, bu ancak gerçek işler de listede olursa anlamlı. |

## Sonuçlar
- Hayat alanının konuya etiketlenmemiş kök işleri artık hiçbir kanvasta görünmez (bir konuya etiketlenene kadar). Bu, ADR 0009'un "konu opsiyoneldir" ilkesiyle bilinçli bir gerilim — kullanıcı bunu kabul etti.
- Var olan alan-bazlı `canvasDrafts` belgeleri (varsa) artık hiçbir UI'dan erişilmiyor; kullanıcı onayıyla göçürülmedi, sıfırdan başlanıyor.
- `docs/bilgi-kaynak-katmani-tasarim.md`'deki Faz 1 kapsamı bu ADR ile genişlemiş sayılır (Konu + Bilgi Birimi + Kanvas).
