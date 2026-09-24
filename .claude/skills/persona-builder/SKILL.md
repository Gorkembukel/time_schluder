---
name: persona-builder
description: Web geliştirme dışında yeni bir alan/karar konusu ortaya çıktığında, kullanıcıyla soru-cevap yaparak yeni bir persona tanımlar ve .claude/personas/ altına kaydeder. Persona tek başına uydurulmaz.
---

# persona-builder

Yeni bir konu (web geliştirme dışında) proje kapsamına girdiğinde, o konuya uygun kararları verecek personayı kullanıcıyla birlikte tanımlar.

## Süreç
1. Konunun mevcut personalardan (Web Developer, Zaman & Kaynak Yönetimi Paydaşı, Finans Paydaşı) hangisine ait olduğunu değerlendir. Gerçekten yeni bir alansa devam et.
2. Kullanıcıya **3-5 soru**, numaralı ve gruplu şekilde sor:
   1. Bu personanın rolü ve uzmanlık alanı ne?
   2. Hangi kararları bu persona verir, hangilerini vermez (sınırları ne)?
   3. Hangi terminolojiyi/kavramları kullanır?
   4. Diğer personalarla (özellikle Web Developer) kesişim noktaları nerede, kararlar nasıl ayrılır?
   5. Bu personanın karar verirken kontrol etmesi gereken bir checklist var mı?
3. Cevaplara göre `.claude/personas/<isim-kebab-case>.md` dosyasını şu şablonla oluştur:

```markdown
# <Persona Adı>

## Rol
...

## Uzmanlık alanı
...

## Sorumluluk sınırları
### Karar verdiği konular
- ...
### Karar vermediği konular
- ...

## Terminoloji
- ...

## Kontrol listesi
- [ ] ...
```

4. Dosyayı kullanıcıya göster, onay al.
5. `CLAUDE.md`'deki persona listesine referansı güncelle (gerekirse).

## Kurallar
- Bu skill'i çalıştırmadan yeni persona dosyası oluşturma.
- Var olan bir personanın kapsamını genişletmek yeterliyse yeni persona açma, mevcut dosyayı güncelle.
