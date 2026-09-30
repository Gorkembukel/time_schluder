# 0011. Gerekliliklerde envanter durumu ve deneyim notundan gereklilik türetme

## Durum
Kabul edildi

## Bağlam
Mevcut `Requirement` yalnızca sayısal ilerleme tutuyor (`currentValue/targetMetric/unit` — fork araştırmasıyla doğrulandı, `src/types/domain.ts`). Excel kanıtı (Atölye sayfası) "elimde var mı / alınacak mı" gibi ikili bir envanter durumu içeriyordu (ör. multiplexer, tornavida seti, komponent hazneleri — "var mı" kolonu, ürün linki, tür); bu, sayısal ilerlemeden farklı bir boyut. Ayrıca Excel'de bir işi yaparken edinilen deneyimin doğrudan yeni bir ihtiyaca dönüştüğü örnekler var (robotik kol projesi, kod 004): montajda uygun el aleti yokluğu → küçük elektrikli matkap ihtiyacı; uygun jumper yokluğu → bağlantı güvenilirliği ihtiyacı; 4 servo için ESP'den güç çekince aşırı ısınma → ayrı güç kaynağı ihtiyacı. Bu akış hiç modellenmemiş.

## Karar
### Envanter durumu
- `Requirement.status?: string` — değerleri config'de tanımlı (`config/requirement-statuses.ts`): `yok`, `alınacak`, `var`, `edinildi`. Ayarlar'dan düzenlenebilir.
- `Requirement.estimatedCost?: number` (TRY), `Requirement.sourceUrl?: string` — envanter ile planlı harcama zincirinin (bkz. ADR 0012) girdisi.
- `status` alanı **mevcut `currentValue/targetMetric` alanlarının yerine geçmez, yanına eklenir**; UI, gerekliliğin türüne göre hangi alanı öne çıkaracağını bir eşlemeyle (`config/requirement-type-field-hints.ts`) belirler — ör. Varlık/Araç, Belge/Yetkinlik → durum öne çıkar; Beceri, Bilgi, Sağlık/Enerji → ilerleme çubuğu öne çıkar. Şema seviyesinde zorunluluk yok, her iki alan da her gereklilikte opsiyonel kalır (tür-bazlı katı şema zorlaması yapılmaz, gereksiz karmaşıklık).

### Deneyim notundan gereklilik türetme
- `KnowledgeItem.isExperienceNote: boolean` alanı bir bilgi birimini "deneyim notu" olarak işaretler (bir işe `taskId` ile bağlı olabilir veya bağımsız olabilir — Excel örneğindeki gibi bir projeye bağlı retrospektif).
- Türetme aksiyonu: kullanıcı bir deneyim notundan "Gereklilik oluştur" der; açılan küçük formda tür/isim/hedef değer/durum önceden doldurulmaz (not metninden otomatik çıkarım yok — NLP/LLM özetleme kapsam dışı, Spark'ın istemci-taraflı hesaplama kısıtına da uygun), kullanıcı hızlıca doldurur.
- Sonuç: yeni `Requirement.originNoteId` alanı kaynak nota işaret eder; notun `derivedRequirementIds: string[]` alanına yeni gerekliliğin id'si eklenir → **iki yönlü bağ**, konunun çalışma ortamında geriye izlenebilirlik sağlar.
- **Review ritmiyle ilişki**: Rehber paneli (mevcut `src/lib/capacityGuidance.ts` girdileri genişletilerek), henüz hiçbir gereklilik türetilmemiş deneyim notlarını haftalık/aylık review sırasında hatırlatabilir. Bu, planlama motorunun (`lib/planning-engine`) formüllerini değiştirmez, yalnızca girdi ekler — isteğe bağlı bir Faz 2 eklentisi, ilk sürümde zorunlu değil.

## Gerekçe / alternatifler
| Seçenek | Neden seçildi/elendi |
|---|---|
| Durum ve ilerleme için tek, birleşik enum (ör. "yok/başlanmadı/devam/tamam") | Elendi — Beceri gibi süreklilik gösteren gerekliliklerde ilerleme yüzdesi, Varlık/Araç gibi ikili gerekliliklerde durum daha doğal temsil; tek enum ikisini de kötü karşılar |
| Türetmede not metninden otomatik alan doldurma (NLP/LLM) | Elendi (şimdilik) — Spark plan istemci-taraflı hesaplama kısıtına ek karmaşıklık getirir, kapsam dışı; kullanıcı elle hızlı doldurur ("minimum girdi" ilkesiyle çelişmeyecek kadar küçük bir form) |
| Tek yönlü bağ (yalnızca `Requirement.originNoteId`) | Elendi — kaynak nottan hangi gerekliliklerin türediğini görmek (`derivedRequirementIds`) konunun çalışma ortamında geriye izlenebilirlik için gerekli, spesifik olarak istendi |
| Durum alanını her gereklilik türü için şema seviyesinde zorunlu/koşullu yapmak | Elendi — gereksiz erken katılaştırma; opsiyonel alan + UI ipucu eşlemesi aynı faydayı daha az karmaşıklıkla sağlar |

## Sonuçlar
- `Requirement` tipine 4 opsiyonel alan eklenir (`status`, `estimatedCost`, `sourceUrl`, `originNoteId`) — additive, geriye dönük uyumlu, migration script gerekmez.
- Yeni config dosyaları (`requirement-statuses.ts`, `requirement-type-field-hints.ts`) `config-audit` kapsamına girer.
- Planlama motoru (`lib/planning-engine`, ADR 0004) dokunulmaz; Rehber genişlemesi yalnızca girdi ekler, mevcut formülleri değiştirmez.
