# 0009. Konu kavramı ve zaman hiyerarşisiyle ilişkisi

## Durum
Kabul edildi

## Bağlam
Kullanıcının uygulama öncesi kullandığı Excel'de, zaman katmanının yanında hayat alanı altında kalıcı, zamana bağlı olmayan çalışma alanları vardı (ör. "Mobil development", "Atölye kurma yolunda", "LLM orchestrator" sayfaları). Mevcut modelde Hayat Alanı (Initiative) doğrudan Gereklilik ve zaman hiyerarşisine (Epic/Story/Task) bağlanıyor; bu ikisi arasında kalıcı bir "Konu" kavramı yok. Mevcut hiyerarşi (Initiative→Epic→Story→Task, parent link, roll-up — bkz. `docs/domain-glossary.md`, `.claude/personas/jira-developer.md`) ve onun kod karşılığı (`src/lib/taskHierarchy.ts`: `ancestorsOf`, `effectiveLifeAreaId`, `rollupProgress`; `requirementsRepository.ts`'deki gereklilik roll-up'ı) çalışıyor ve test edilmiş durumda — bu ADR bunu bozmadan yeni kavramın yerini belirler.

## Karar
**Konu, zaman hiyerarşisinde bir seviye değil, ona dik bir bağlamdır.** Jira'daki "Component" kavramına eşdeğer: bir kapsamda (burada: hayat alanında) tanımlanır, işlere (Task) çoklu ve isteğe bağlı olarak etiketlenir, kendisi zamandan/tarihten bağımsızdır.

- `Topic { id, lifeAreaId, name, description?, createdAt, updatedAt }` — bir hayat alanına aittir (zorunlu, tek). Firestore: `lifeAreas/{areaId}/topics/{topicId}` (Requirement ile aynı nesting deseni).
- `Task.topicIds?: string[]` — bir işe sıfır, bir veya birden çok konu etiketlenebilir (Excel'deki "proje kodu 004 hem Atölye hem Mobil geliştirme sayfasında referanslandı" örneğini karşılar).
- `Requirement.topicId?: string` — bir gereklilik isteğe bağlı olarak bir konuya bağlanır; `lifeAreaId` zorunlu alan olarak kalır (mevcut model), `topicId` onu daraltan opsiyonel bir alt gruplamadır. Gereklilik işe değil konuya/alana bağlıdır — iş, mevcut `requirementId` alanıyla gerekliliğe referans verir (tek yönlü, değişmez).
- Initiative→Epic→Story→Task zinciri, parent link ve roll-up mantığı **değişmez**.

## Gerekçe / alternatifler
| Seçenek | Neden seçildi/elendi |
|---|---|
| Konu = hiyerarşide yeni bir seviye (Initiative → **Konu** → Epic → ...) | Elendi — her Epic'in tam olarak bir üst Konu'ya bağlanmasını zorunlu kılar; Excel kanıtı bunun tersini gösteriyor (bir iş birden çok konuya hizmet edebiliyor). Ayrıca test edilmiş `taskHierarchy.ts` ve gereklilik roll-up mantığını bozar. |
| Konu = hayat alanına bağlı olmayan, tamamen bağımsız serbest etiket | Elendi — Excel'de konular hep bir üst alan (mühendislik, atölye) altında gruplanmıştı; hayat alanı bağı olmadan boşluk analizi ve alan bazlı roll-up anlamsızlaşır. |
| **Konu = hayat alanına bağlı, hiyerarşiye dik bağlam (Jira Component analojisi)** | **Seçildi** — mevcut hiyerarşiyi bozmaz, çoklu-konu ilişkisini doğal karşılar, Jira Developer personasının zaten kullandığı zihinsel modelle tutarlı. |

## Açık sorulara yanıt
- **Konu ↔ Epic/Story ilişkisi**: yukarıdaki karar — dik bağlam, hiyerarşi seviyesi değil.
- **Bir iş birden çok konuya hizmet edebilir mi?**: Evet, `Task.topicIds: string[]`.
- **Gereklilik konuya mı işe mi bağlıdır?**: Hayat alanına (zorunlu) ve isteğe bağlı olarak konuya; işe değil.
- **Konu başka hayat alanına taşınabilir mi?**: Evet — Konu'nun `lifeAreaId`'si güncellenir; ona nested olan Requirement'ların `lifeAreaId`'si batch ile devralır (mevcut `deleteLifeArea`'nın batch temizleme deseniyle tutarlı, bkz. `lifeAreasRepository.ts`). `topicIds` ile etiketlenmiş Task'ların kendi `lifeAreaId`/`parentTaskId` zinciri **zorla değiştirilmez** (bir Task birden çok konuya ait olabileceği için).

## Sonuçlar
- `taskHierarchy.ts`, `requirementsRepository.ts`, `tasksRepository.ts` değişmeden kalır; yalnızca `Task` ve `Requirement` tiplerine opsiyonel alan eklenir (additive, geriye dönük uyumlu — mevcut veride bu alanlar `undefined`, UI bunu "konu atanmamış" olarak yorumlar, migration script gerekmez).
- Konu silinirse: ona bağlı `Requirement.topicId` ve `Task.topicIds` referansları temizlenir (batch), Requirement/Task'in kendisi silinmez.
- `firestore.rules`'daki mevcut `users/{userId}/{document=**}` kuralı (ADR 0003) yeni `topics` alt koleksiyonunu değişiklik gerektirmeden kapsar.
