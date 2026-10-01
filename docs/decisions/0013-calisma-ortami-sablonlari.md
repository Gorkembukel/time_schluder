# 0013. Çalışma ortamı şablonları: kopya mı, referans mı

## Durum
Kabul edildi

## Bağlam
Bazı konular standart (bilgi birimi + gereklilik) şemasına sığmıyor. Excel kanıtları:
- **Mobil geliştirme**: zamana bağlı olmayan bir öğrenme müfredatı — kavram (Clean architecture, State management, DI, Offline-first storage, Coroutines…) → alt kavram → tutorial/kaynak → doküman → ilerleme.
- **Atölye**: proje kodlu proje kataloğu (000–006) + beceri/araç envanteri.

Kullanıcı, konu oluşturulurken bir başlangıç yapısı (şablon) seçilebilmesini, bu yapıyı sonradan serbestçe düzenleyebilmesini (bölüm ekle/çıkar/yeniden adlandır) ve düzenlediği yapıyı yeni bir şablon olarak kaydedebilmesini istiyor. Açık soru: şablon sonradan değişirse, o şablondan oluşturulmuş mevcut konular etkilenir mi?

## Karar
**Şablon, konu oluşturulduğu anda konuya kopyalanır (snapshot); sonradan şablonda yapılan değişiklik var olan konuları etkilemez.**
- `Topic.sections: [{ id, kind, title, order, config? }]` — konu oluşturulurken seçilen şablonun `sections` dizisi bu alana kopyalanır.
- `TopicTemplate { id, name, sections: [...], isBuiltIn: boolean }` — başlangıç seti (`Boş`, `Müfredat`, `Envanter`, `Proje kataloğu`) kod içinde seed edilir (`config/topic-templates.ts`), `config/finance-categories.ts`'teki "seed sonra Firestore'da (`users/{uid}/topicTemplates/{id}`) düzenlenebilir" deseniyle birebir aynı.
- Kullanıcı bir konunun düzenlediği `sections` yapısını "Yeni şablon olarak kaydet" ile `isBuiltIn: false` yeni bir `TopicTemplate`'e kopyalar.

## Gerekçe / alternatifler
| Seçenek | Neden seçildi/elendi |
|---|---|
| **Kopya (snapshot)** | **Seçildi** — kullanıcı zaten şablonu "serbestçe düzenleyip çıkarabilme" istiyor; canlı referans bu serbestlik ile şablonun kendi güncellemeleri arasında sürekli çakışma/birleştirme (merge) sorunu yaratırdı. Jira'nın proje/issue-type şablonları da oluşturma anında kopyalanır, canlı bağlı kalmaz — tanıdık bir zihinsel model (Jira Developer personasıyla tutarlı). |
| Referans + override (şablon değişince, override edilmemiş alanlar güncellenir) | Elendi — kişisel, tek kullanıcılı bir araç için gereksiz karmaşıklık (diff/merge UI); şablonların çoğu zaten kullanıcının kendi geçmiş düzenlemelerinden türeyecek, canlı senkronizasyon değeri düşük |
| Şablon yok, her konu sıfırdan serbest yapı | Elendi — Excel'deki tekrarlayan yapıları (müfredat, envanter, proje kataloğu) her seferinde sıfırdan kurmak gereksiz tekrar, "minimum girdi, maksimum yönlendirme" ilkesiyle (bkz. `.claude/personas/musteri.md`) çelişir |

## Sonuçlar
- `config/topic-templates.ts` yeni config dosyası, `config-audit` kapsamına girer.
- Bu ADR, tasarım dokümanındaki Faz 4'te uygulanır; Faz 1-3'te Konu'nun `sections` alanı kullanılmaz (boş/serbest liste olarak çalışır), şablon altyapısı geriye dönük uyumlu şekilde sonradan eklenir — mevcut hiçbir Konu kaydı bozulmaz.
- Şablon değişikliği geçmişe dönük uygulanmaz; kullanıcı isterse mevcut bir konunun bölümlerini elle şablonun yeni haliyle hizalayabilir (otomatik değil).

## Faz 4 uygulama notu (2026-10-01)
Kullanıcıyla netleştirme: tüm bölümler ekranda aynı şekilde davranır — bir bölüm yalnızca adlandırılmış bir bilgi birimi grubudur, türe özgü bir render/veri modeli yoktur. Bu, orijinal kararın `TopicSection { id, kind, title, order, config? }` şemasını basitleştirir:
- `kind`/`config?` alanları düşürüldü (kullanılmayan, spekülatif alan eklememe ilkesiyle) — gerçek şema: `{ id, title, order }`.
- Bölüm sırası yeniden sıralanamaz (ADR'nin "ekle/çıkar/yeniden adlandır" listesi reorder içermiyordu); yeni bölümler sona eklenir.
- Bir bölüm silindiğinde içeriği silinmez — atanmış bilgi birimleri "Sınıflandırılmamış" grubuna döner (`KnowledgeItem.sectionId` temizlenir).
- Bilgi birimi oluşturulurken opsiyonel bir "Bölüm" seçiciyle atanır, sonradan düzenleme formundan değiştirilebilir.
