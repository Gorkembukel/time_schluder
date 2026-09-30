# 0010. Bilgi birimi modeli ve dosya depolama kısıtı

## Durum
Önerildi

## Bağlam
Excel kanıtları: konuya bağlı YouTube playlist linkleri, harici bir üniversitenin robot kılavuzu linki, kişi/ilişki bilgisi notu (bir şirket başkanının aynı zamanda ticaret odası başkanı olduğu bilgisi), tasarım kararı notu ("safety için logic kısmı rölelerle yapılırsa software bug girmez"). Hiçbiri bir "iş" değil, ama konunun çalışma ortamında birikmesi gereken bilgi. Fork araştırması doğruladı: kodda not/link/doküman/kişi ekleme özelliğine dair hiçbir iz yok — sıfırdan tasarlanacak.

**Önemli kısıt bulgusu (2026-09-30 itibarıyla, Firebase resmi fiyatlandırma kaynakları):** Cloud Storage for Firebase artık Spark planında yok. 2026-02-03'ten itibaren, kullanım hacmi ne olursa olsun bir Storage bucket'ı oluşturmak/kullanmak Blaze plana (faturalandırma hesabı bağlama) geçişi zorunlu kılıyor. Kullanım Google Cloud Storage'ın "Always Free" sınırında (5 GB-ay depolama, ayda 100 GB Kuzey Amerika çıkışı) kalırsa fatura $0 olabilir, ama kart/plan bağlama adımı gerekiyor — bu, projenin "Firebase Spark (ücretsiz) plan" öncülünü (CLAUDE.md, ADR 0003) etkileyen, **yalnızca kullanıcının onaylayabileceği** bir karardır ve bu ADR'nin kapsamı dışındadır.

## Karar
- **Bilgi birimi türleri** config'de tanımlı, Ayarlar'dan düzenlenebilir (Gereklilik türünün aksine bu liste bir ürün kararıyla "sabit" ilan edilmedi, dolayısıyla hardcode yasağı tam uygulanır): `not`, `link`, `doküman`, `kişi`, `tasarım kararı`. Varsayılan seti kod içinde seed edilir (`config/knowledge-item-types.ts`), `config/finance-categories.ts`'teki "seed sonra Firestore'da düzenlenebilir" deseniyle birebir aynı.
- `KnowledgeItem { id, type, title, body?, url?, topicId, taskId?, requirementId?, isExperienceNote?: boolean, derivedRequirementIds?: string[], createdAt, updatedAt }` — top-level koleksiyon `users/{uid}/knowledgeItems`, nested değil: konular arası arama tek koleksiyon taraması ile yapılabilsin diye.
- **`doküman` türü Faz 1'de yalnızca harici link'i tutar** (Google Drive, yerel dosya yolu notu vb.); gerçek dosya baytı yüklenmez. Bu, Cloud Storage / Blaze plan gereksinimini tamamen ortadan kaldırır, ek maliyet veya plan değişikliği gerektirmez.
- **Arama**: Faz 1'de istemci taraflı filtre yeterli — kişisel, tek kullanıcılı ölçekte (muhtemelen birkaç yüz kayıt) `knowledgeItems` koleksiyonu `limit()` ile çekilip client-side substring eşleşmesiyle filtrelenir; ayrı bir arama servisi (Algolia vb.) veya Cloud Functions gerektirmez.

## Gerekçe / alternatifler
| Seçenek | Neden seçildi/elendi |
|---|---|
| **A. Doküman = yalnızca link (Faz 1)** | **Seçildi** — Spark plan öncülünü korur, kart bağlama gerektirmez, Excel kanıtlarının çoğu zaten link |
| B. Blaze plana geçip Cloud Storage kullan | Şimdilik elendi — kullanım muhtemelen $0 kalır ama kart bağlama/plan değişikliği kullanıcının açıkça onaylaması gereken bir karar; bu ADR'nin kapsamı dışında. Gerçek dosya yükleme ileride istenirse ayrı bir ADR ile açılır. |
| C. Küçük dosyaları base64 olarak Firestore dokümanına göm | Elendi — Firestore doküman başına 1 MiB sert limiti var, gerçek dosyalar (PDF, görsel) için uygunsuz, gereksiz okuma/yazma kotası tüketir |
| Arama için Algolia/harici servis | Elendi — kişisel ölçekte gereksiz karmaşıklık ve muhtemel ek maliyet; istemci taraflı filtre yeterli |

## Sonuçlar
- Yeni top-level koleksiyon `knowledgeItems`; `firestore.rules`'daki mevcut `users/{userId}/{document=**}` kuralı (ADR 0003) değişmeden kapsar.
- Kullanıcı gerçek dosya yükleme isterse: bu ayrı bir karar (Blaze plana geçiş) olarak kullanıcıya sunulmalı, otomatik uygulanmamalı.
- `config/knowledge-item-types.ts` yeni bir config dosyası olarak `config-audit`'in denetim kapsamına girer.

## Ek: GitHub'ı kişisel dosya barındırma yeri olarak kullanma (2026-09-30)
Kullanıcı, "yalnızca link" kararı kapsamında `doküman` bilgi birimi için GitHub'da (ör. ayrı bir private repo) dosya biriktirip linkini vermeyi önerdi. Bu, tasarımı değiştirmeden zaten çalışır:
- **Public repo**: `raw.githubusercontent.com/...` linki doğrudan, kimlik doğrulamasız açılır.
- **Private repo**: `github.com/.../blob/...` linki, kullanıcı kendi tarayıcısında zaten kendi GitHub hesabına giriş yapmış olduğu için (tek kullanıcılı kişisel kullanım) sorunsuz açılır.

Kullanıcı ayrıca, uygulamaya bir "GitHub hesabı bağlama" mekanizması (API key/secret girmeden) eklenip eklenemeyeceğini sordu — **araştırıldı ve mümkün değil**: GitHub'ın OAuth token değişim uç noktası (`/login/oauth/access_token`) tarayıcıdan doğrudan çağrılamaz (CORS engelli) ve hem klasik web akışı hem de device flow, `client_secret` gerektirir; GitHub, public client'lar için PKCE (secret'sız akış) desteklemiyor ([topluluk isteği hâlâ açık](https://github.com/orgs/community/discussions/15752)). Secret'ı istemci paketine gömmek gerçek bir güvenlik açığı olurdu; secret'ı gizleyecek bir backend/proxy ise "Spark + Cloud Functions yok" mimarisinin dışına çıkardı.

**Karar: entegrasyon eklenmiyor.** Private repo linkleri, kullanıcının kendi tarayıcı oturumu üzerinden zaten çalıştığı için uygulamanın GitHub'ı tanımasına gerek yok — `doküman` bilgi birimi bu linki sıradan bir URL olarak saklar, ADR'nin geri kalanında değişiklik yok. Daha derin entegrasyon (repo içeriğini uygulama içinde listeleme/önizleme) ileride istenirse, o zaman bir Personal Access Token (kullanıcının kendi oluşturup Ayarlar'a yapıştıracağı, salt-okunur ve tek repo'ya kapsamlı bir token — bir "app secret" değil) en basit seçenek olarak değerlendirilebilir; bugün için kapsam dışı.
