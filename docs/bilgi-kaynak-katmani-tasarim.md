# Bilgi ve Kaynak Katmanı — Tasarım Dokümanı

> Persona: **Domain Modeler** (bkz. `.claude/personas/domain-modeler.md`). Bu doküman kod içermez; uygulamaya kullanıcı onayından sonra geçilir. İlgili ADR'ler: `docs/decisions/0009`–`0013` (hepsi "Önerildi"). İlgili sözlük güncellemesi: `docs/domain-glossary.md` → "Konu ve çalışma ortamı katmanı (taslak)".

## 1. Neden bu görev
Uygulama zaman katmanını (6 ölçekli hiyerarşi, haftalık program, Havuz, roll-up, Otomatik planla) kapsıyor, ama kullanıcının uygulama öncesi kullandığı Excel'de zamanın yanında bir "bilgi ve kaynak katmanı" vardı: konuya özel notlar/linkler, deneyimden doğan ihtiyaçlar, envanter (elimde ne var), planlı harcamalar, standart şemaya sığmayan alana özel yapılar (müfredat, proje kataloğu). Bu katmanın uygulamada karşılığı yok.

## 2. Mevcut durum raporu (kod analizi, varsayım yok)

| Alan | Kodda karşılığı |
|---|---|
| **Hayat Alanı** | Tam çalışıyor. `LifeArea { id, name, order, priority?, color?, createdAt, updatedAt }` (`src/types/domain.ts:59-68`), Firestore `users/{uid}/lifeAreas/{areaId}`, tam CRUD (`src/services/repositories/lifeAreasRepository.ts`), silme alt `requirements`'ı batch temizliyor. |
| **Gereklilik** | Tam çalışıyor. `{ id, lifeAreaId, name, type, targetMetric, currentValue, unit, parentRequirementId?, createdAt, updatedAt }` (`domain.ts:70-82`). 9 tür `REQUIREMENT_TYPES` const olarak sabit (`domain.ts:13-36` — bu, `requirements.md`'nin "✅ Gereklilik türü listesi aynen korunuyor" kararıyla kasıtlı, hardcode ihlali değil). Hiyerarşik (alt gereklilik), roll-up, ilerleme çubuğu, tam UI (`AreaCard.tsx`). **Durum/envanter alanı, deneyim→gereklilik türetme, konu bağı, maliyet alanı — hiçbiri yok.** |
| **İş hiyerarşisi** | Tam çalışıyor. Düz `tasks` koleksiyonu + `parentTaskId`, `src/lib/taskHierarchy.ts`'de döngü korumalı ata zinciri, hayat alanı/gereklilik devralma, roll-up. |
| **Finans** | Tam çalışıyor. `FinanceTransaction` (`domain.ts:202-213`) — kategori, opsiyonel hayat alanı/gereklilik bağı, gerçek USD/altın/BTC snapshot (`src/lib/fx/fetchFxSnapshot.ts`, 3 API + elle giriş fallback). Kategori seed'i `config/finance-categories.ts`'de, `parentCategoryId` alanı şemada var ama seed verisinde kullanılmamış (alt kategori altyapısı hazır, veri yok). **Planlı (henüz gerçekleşmemiş) harcama kavramı yok.** |
| **Konu** | **YOK.** Kodda "konu"/"topic" (planlama dışı anlamda) hiç geçmiyor. |
| **Bilgi birimi** | **YOK.** Not/link/doküman/kişi ekleme özelliğine dair hiçbir iz yok. |
| **Envanter durumu** | **YOK.** Gerekliliklerde yalnızca sayısal ilerleme var, "sahip mi/alınacak mı" enum'u yok. |
| **Şablon (çalışma ortamı)** | **YOK.** "Çalışma ortamı" kavramı olmadığı için şablon da yok. |

## 3. Kavram modeli — özet
Ayrıntılar ve alternatif karşılaştırmaları ilgili ADR'lerde. Zincir:

```
Hayat Alanı (mevcut)
  └─ Konu (yeni, ADR 0009) ──┬─ dik bağlam, Epic/Story/Task hiyerarşisine girmez
                              │  (Jira "Component" analojisi)
                              │
     Konunun çalışma ortamı:  │
       ├─ Bilgi birimi (yeni, ADR 0010): not/link/doküman(link)/kişi/tasarım kararı
       │     └─ "deneyim notu" alt türü ──türetir──> Gereklilik (ADR 0011, iki yönlü bağ)
       ├─ Gereklilik (mevcut + genişletilmiş, ADR 0011): + status, estimatedCost, sourceUrl
       │     └─ status="alınacak" + estimatedCost ──> Planlı harcama (yeni, ADR 0012)
       │           └─ "satın alındı" ──> Finans işlemi (mevcut, kur snapshot değişmeden)
       └─ Şablon (yeni, ADR 0013): konu oluşturulurken kopyalanan başlangıç yapısı
```

Tasarım ilkeleri (tüm ADR'lerde tekrarlanan):
1. **Additive** — mevcut tiplere yalnızca opsiyonel alan eklenir, hiçbir mevcut alan/davranış değişmez. Migration script gerekmez (eksik alan = "atanmamış" olarak yorumlanır).
2. **Mevcut desenler tekrar kullanılır** — `financeCategories`'in "seed sonra Firestore'da düzenlenebilir" deseni (şablonlar, bilgi birimi türleri, envanter durumları için); `tasks`/`financeTransactions`'ın "top-level + düz referans" deseni (yeni koleksiyonlar için); `deleteLifeArea`'nın batch temizleme deseni (konu taşıma/silme için).
3. **Planlama motoruna dokunulmaz** — `lib/planning-engine` (ADR 0004) değişmez; yeni katman Rehber'e yalnızca ek girdi sağlar.
4. **Otomatik durum geçişi yok** — büyük/geri alınamaz görünen değişiklikler (satın alma sonrası "edinildi" işaretleme gibi) kullanıcıya önerilir, otomatik uygulanmaz (mevcut "büyük değişiklik → onay" ilkesiyle tutarlı).

## 4. Zaman katmanıyla temas noktaları
- **İşler konuya nasıl bağlanır**: `Task.topicIds?: string[]` — çoklu, opsiyonel etiket. Hiyerarşi/roll-up zincirini etkilemez.
- **Eksik bir gereklilik bir işin ön koşulu olabilir mi, bağımlılık motoruna girer mi?** Hayır — bilinçli bir kapsam sınırı. `Requirement`'ın süresi yoktur (binary/ilerleme durumu), oysa `dependencyGraph.ts`'deki FS/SS/FF/SF + lag/lead modeli süre/tarih üzerine kurulu (CPM matematiği). İkisini tek grafa sokmak kritik yol hesabını bozar. Bunun yerine: Task'a opsiyonel `blockingRequirementIds?: string[]` eklenebilir (yalnızca **görünür uyarı**, "bu göreve başlamadan önce eksik: X gerekliliği" — Rehber üzerinden), planlama motoruna hiç girmez. Bu, ayrı bir ADR gerektirmeyecek kadar küçük ve tersinir bir karar; Faz 2'de değerlendirilebilir.
- **Rehber paneli bu katmandan öneri üretebilir mi?** Evet, additive olarak: `capacityGuidance.ts`'in girdilerine (a) konu/hedef bazlı boşluk analizi sonuçları, (b) henüz gereklilik türetilmemiş deneyim notları, (c) vadesi geçmiş/aşan planlı harcamalar eklenir. Mevcut kapasite/backcast/forecast formülleri değişmez.

## 5. Firestore veri modeli — genişletilmiş ağaç
ADR 0003'ü değiştirmez, üzerine ekler (tüm yeni alan ve koleksiyonlar additive):

```
users/{uid}
  ├─ lifeAreas/{areaId}                (mevcut)
  │    ├─ requirements/{reqId}         (mevcut + status?, estimatedCost?, sourceUrl?,
  │    │                                 originNoteId?, topicId? — ADR 0011, 0009)
  │    └─ topics/{topicId}             (YENİ — ADR 0009)
  │         name, description?, sections? (ADR 0013, Faz 4'e kadar boş), createdAt, updatedAt
  ├─ knowledgeItems/{itemId}           (YENİ, top-level — ADR 0010)
  │    type, title, body?, url?, topicId, taskId?, requirementId?,
  │    isExperienceNote?, derivedRequirementIds?, createdAt, updatedAt
  ├─ plannedExpenses/{id}              (YENİ, top-level — ADR 0012)
  │    requirementId, lifeAreaId, topicId?, description, estimatedAmountTRY,
  │    plannedDate?, status, linkedTransactionId?, createdAt, updatedAt
  ├─ topicTemplates/{id}               (YENİ — ADR 0013, Faz 4)
  │    name, sections, isBuiltIn
  ├─ tasks/{taskId}                    (mevcut + topicIds?: string[] — ADR 0009)
  └─ financeTransactions/{txId}        (mevcut + plannedExpenseId? — ADR 0012)
```
Güvenlik kuralı (`users/{userId}/{document=**}`, ADR 0003) değişmeden tüm yeni koleksiyonları kapsar. Kota etkisi: yeni okuma/yazma hacmi kişisel ölçekte (yüzlerce kayıt) Spark limitlerinin çok altında; her yeni sorgu mevcut ilkeye uyarak `limit()` ve gerekirse tarih/topicId filtresiyle sınırlanır.

## 6. Kısıtlar ve migration
- **Firebase Spark**: tüm yeni koleksiyonlar Firestore üzerinde, Cloud Functions gerektirmez. **Dosya depolama (Storage) artık Spark'ta yok** (bkz. ADR 0010) — Faz 1-3'te dosya yüklenmez, yalnızca link tutulur; gerçek dosya yükleme ayrı, kullanıcı onayı gerektiren bir karardır (Blaze plana geçiş).
- **Hardcode yasağı**: bilgi birimi türleri, envanter durumları, şablonlar config'de tanımlı ve Ayarlar'dan düzenlenebilir (Gereklilik türlerinin aksine, bunlar ürün kararıyla sabitlenmiş değil).
- **Migration**: gerekmez. Tüm yeni alanlar opsiyonel; mevcut kullanıcı verisi (tek kullanıcı, kendi hesabı) hiçbir dönüştürme olmadan çalışmaya devam eder, eksik alanlar "atanmamış/genel" olarak yorumlanır.

## 7. Fazlara bölünmüş uygulama planı
Her faz tek başına kullanılabilir değer sunar (kullanıcının önerdiği sıra):

**Faz 1 — Konu + Çalışma Ortamı + Bilgi Birimi**
- `Topic` CRUD (Hayat Alanları ekranında "Konular" alt listesi/sekmesi).
- Konu detay sayfası ("çalışma ortamı"): Bilgi Birimi listesi (not/link/kişi/tasarım kararı, doküman=link), ekle/sil/düzenle, konu içi + konular arası arama.
- `Task.topicIds` ve `Requirement.topicId` — ilgili formlara "Konu" seçici eklenir.
- domain-glossary.md'deki taslak terimler bu fazın sonunda "kabul edildi" statüsüne alınır.

**Faz 2 — Envanter + Deneyim→Gereklilik dönüşümü**
- `Requirement.status/estimatedCost/sourceUrl` + tür-bazlı UI ipucu.
- Bilgi Birimi'nde "deneyim notu" alt türü + "Gereklilikten türet" aksiyonu (iki yönlü bağ).
- Boşluk analizi görünümü (bölüm 8'deki Artifact prototipi onaylanınca koda geçer).
- (Opsiyonel) Rehber'e deneyim notu hatırlatması.

**Faz 3 — Finans-hedef bağı (planlı harcama)**
- `plannedExpenses` koleksiyonu + CRUD.
- "Planlı harcama oluştur" (gereklilikten) ve "Satın alındı" (finans işlemine dönüştürme) akışları.
- Finans dashboard'una konu/hayat alanı bazlı "planlı vs. gerçekleşen" özeti.

**Faz 4 — Şablonlar**
- `config/topic-templates.ts` seed + `topicTemplates` koleksiyonu.
- Konu oluştururken şablon seçimi, `Topic.sections` modeli.
- "Yeni şablon olarak kaydet".
- Müfredat/Envanter/Proje kataloğu şablon türlerinin ilk içerikleri (Excel örneklerinden türetilir).

## 8. Artifact prototipleri
Kod yazılmadan önce üç akış Artifact olarak prototiplendi (mock veri, Excel örnekleriyle):
1. **[Konu çalışma ortamı](https://claude.ai/artifact/BDGGp9tdTHAPmSTkry1swm)** — konu detay sayfası: bilgi birimi listesi, konu içi/arası arama, deneyim notundan türetme, konuya bağlı gereklilik/iş özetleri.
2. **[Nottan gereklilik türetme](https://claude.ai/artifact/RP9hHh2pCE8q3XFSAQmJAy)** — deneyim notundan tek adımda gereklilik oluşturma akışı (tür/isim/durum/maliyet), iki yönlü bağ.
3. **[Boşluk analizi](https://claude.ai/artifact/C7UcF7tFdkMedTv3XgdJao)** — konu/alan bazlı eksik gereklilik listesi, toplam tahmini maliyet, Rehber önerisi, planlı harcama başlatma.

Onay sonrası bu prototipler Faz 1/2 kapsamında koda taşınır.
