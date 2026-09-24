---
name: pull-request
description: Mevcut branch için GitHub üzerinde `gh` CLI ile Pull Request açar. Sadece kullanıcı açıkça istediğinde çalıştırılır, git-checkpoint akışının bir parçası değildir.
---

# pull-request

`git-checkpoint`'ten bağımsız bir yetenektir. Kod "PR'a hazır" hale geldiğinde bunu kullanıcıya bildirir, ama **kullanıcı açıkça istemeden PR açmaz**.

## Ön koşul kontrolü
1. `gh --version` ile CLI kurulu mu kontrol et.
2. `gh auth status` ile oturum açık mı kontrol et.
3. İkisinden biri eksikse kurulum/login adımlarını kullanıcıya anlat, kendin kurmaya/login olmaya çalışma.

## PR açma
```bash
gh pr create --title "<kısa başlık>" --body "<şablona göre doldurulmuş açıklama>"
```

## PR açıklama şablonu
```markdown
## Özet
<1-3 cümle>

## Yapılan değişiklikler
- ...

## Neden
<bu değişikliğin motivasyonu>

## Test edilenler
- [ ] ...

## Ekran görüntüsü / notlar
<varsa>

## Hardcode denetimi sonucu
<config-audit skill çıktısının özeti — bulunanlar ve alınan aksiyonlar>

## İlgili persona
<bu değişiklikte kararları veren persona(lar)>
```

## Kurallar
- PR açmadan önce ilgili branch'in push edilmiş olduğundan emin ol (`git-checkpoint` akışı tamamlanmış olmalı).
- `config-audit` skill'i o dilimde çalıştırılmadıysa önce onu çalıştır, sonucu şablona ekle.
- PR açtıktan sonra linki kullanıcıya ver.
