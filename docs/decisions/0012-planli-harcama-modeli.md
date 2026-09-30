# 0012. Planlı harcama: fiyatlı gereklilikten finans işlemine zincir

## Durum
Kabul edildi

## Bağlam
Mevcut finans modülünde yalnızca gerçekleşmiş işlemler (`FinanceTransaction`) var; bir gerekliliğin tahmini maliyeti ile bütçe planlaması arasında bağ yok. Fork araştırması: `FinanceTransaction.requirementId` alanı zaten var ve çalışıyor (bir gerçekleşmiş işlem bir gerekliliğe bağlanabiliyor), ama "henüz gerçekleşmemiş, planlanan harcama" kavramı hiç yok — sadece gerçekleşmiş harcama modelleniyor. `requirements.md` §7 de finans dashboard'unun "bütçe vs. gerçekleşen" gösterdiğini söylüyor ama bu bütçe kategori bazlı, hedef/konu bazlı değil.

## Karar
Yeni top-level koleksiyon: `users/{uid}/plannedExpenses/{id}`:
```
{ id, requirementId, lifeAreaId, topicId?, description,
  estimatedAmountTRY, plannedDate?, status: "planlandı" | "gerçekleşti" | "iptal",
  linkedTransactionId?, createdAt, updatedAt }
```
- Bir `Requirement` `status: "alınacak"` (bkz. ADR 0011) ve `estimatedCost` dolu olduğunda, kullanıcıya "Planlı harcama oluştur" aksiyonu sunulur (otomatik oluşturulmaz — kullanıcı onayı gerekir, mevcut "büyük değişiklik → onay iste" ilkesiyle tutarlı, bkz. ADR 0004).
- **Satın alma akışı**: Planlı harcamadaki "Satın alındı" aksiyonu, mevcut `TransactionForm`'u kategori/tutar/`lifeAreaId`/`requirementId` önceden doldurulmuş olarak açar; kur snapshot mekanizması (`src/lib/fx/fetchFxSnapshot.ts`, ADR 0006) **değişmeden** çalışır. İşlem kaydedilince: `plannedExpense.status = "gerçekleşti"`, `linkedTransactionId` set edilir; `Requirement.status`'ün `"edinildi"`'ye çekilmesi **kullanıcıya önerilir, otomatik uygulanmaz** (Müşteri personasının "otomatik değer + üzerine yazma imkânı" ilkesiyle tutarlı — kısmi ödeme veya iade ihtimali gibi durumlarda erken/yanlış durum değişikliğini önler).
- `FinanceTransaction`'a opsiyonel `plannedExpenseId?: string` eklenir (ters referans, raporlama için).
- Dashboard: konu/hayat alanı bazlı "planlı maliyet toplamı vs. gerçekleşen toplamı" yeni bir özet kartı eklenir — mevcut kategori bazlı dağılımın yanına, onu değiştirmeden.

## Gerekçe / alternatifler
| Seçenek | Neden seçildi/elendi |
|---|---|
| **`plannedExpenses` top-level koleksiyon, düz referanslarla** | **Seçildi** — `tasks`/`financeTransactions` ile aynı desen (top-level + `lifeAreaId`/`requirementId` referans alanları), collection-group sorgusu gerektirmez |
| `plannedExpenses`'i `requirements` altına nested yapmak | Elendi — dashboard'un konu/hayat alanı bazlı toplamı için her gereklilik altını ayrı ayrı taramak yerine tek koleksiyonda `where` sorgusu yapmak Spark okuma kotası açısından daha verimli |
| Satın alınca otomatik olarak Requirement durumunu güncelle | Elendi — mevcut planlama motorunun "büyük değişiklik → onay iste" ilkesiyle tutarsız; kısmi ödeme/iade ihtimalinde yanlış erken durum güncellemesi riski |
| Planlı harcamayı ayrı bir kavram yapmadan doğrudan "taslak" durumlu bir `FinanceTransaction` olarak modellemek | Elendi — gerçekleşmiş ve planlanan işlemleri aynı koleksiyonda tutmak, dönemsel gerçek harcama toplamı gibi her sorguyu `status` filtresiyle kirletir; ayrı koleksiyon daha temiz |

## Sonuçlar
- `FinanceTransaction`'a additive bir alan (`plannedExpenseId?`) eklenir, mevcut işlemler etkilenmez, migration script gerekmez.
- Yeni koleksiyon `firestore.rules`'daki mevcut `users/{userId}/{document=**}` kuralı (ADR 0003) kapsamında, kural dosyası değişmez.
- Finans dashboard'una yeni bir özet eklenir, mevcut özetler değişmez.
