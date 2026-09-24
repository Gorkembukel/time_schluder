# 0008. Tasarım sistemi: icon kütüphanesi ve tekrar kullanılabilir bileşenler

## Durum
Kabul edildi

## Bağlam
Kullanıcı gerçek kullanım sonrası geri bildirim verdi: UI "eski ve kaba" hissettiriyor, ikon yok, kart/buton stilleri her ekranda ayrı ayrı (ad-hoc Tailwind class string'leriyle) tekrarlanıyor, dashboard/overview yok. **Müşteri** personasının referans aldığı ürünler (Jira, Notion, Linear) tutarlı bir bileşen dilinden faydalanıyor.

## Karar
- **İkon kütüphanesi: `lucide-react`.** Tree-shakeable (her ikon ayrı import, sadece kullanılanlar bundle'a girer), MIT lisanslı, modern/nötr çizgi stili (Linear/Notion'ın kullandığı aileyle aynı ruhta).
- **Yeni paylaşılan bileşenler** (`src/components/`): `Button` (primary/secondary/ghost/danger varyantları), `Card` (tutarlı kenarlık/köşe/gölge, opsiyonel `interactive` hover efekti), `PageHeader` (başlık + alt başlık + sağ aksiyon alanı), `Badge` (durum etiketleri), `EmptyState` (ikonlu boş durum mesajı), `StatTile` (dashboard sayısal özet kutusu).
- Bu bileşenler kademeli olarak tüm ekranlara uygulanıyor (App nav, Bugün, Takvim, Hayat Alanları, Finans, Ayarlar, Giriş) — her ekranda tekrarlanan `className` string'leri bu bileşenlere taşınıyor.
- Tipografi hiyerarşisi netleştirildi: sayfa başlığı (`text-2xl font-bold`) ile kart/bölüm başlığı (`text-sm font-semibold`) artık görsel olarak ayrışıyor (öncesinde ikisi de `text-xl`/`text-sm` karışık kullanılıyordu).

## Gerekçe / alternatifler
| Seçenek | Neden seçildi/elendi |
|---|---|
| `lucide-react` | Seçildi — tree-shakeable, geniş ikon seti, Notion/Linear estetiğine yakın |
| `@heroicons/react` | Elendi değil ama tercih edilmedi — set daha küçük, Tailwind'in kendi ürünü olsa da lucide daha geniş kapsamlı |
| Özel SVG ikon seti çizmek | Elendi — bakım yükü yüksek, kazanç düşük |
| Bileşenleri paylaşmadan her ekranda ayrı className tekrarı | Elendi — tam olarak kullanıcının "kaba" bulduğu tutarsızlığın kaynağı |

## Sonuçlar
- Yeni bağımlılık: `lucide-react` (küçük, tree-shakeable — bundle etkisi kullanılan ikon sayısıyla orantılı).
- Sonraki ekranlar (Dashboard, stratejik planlama UI) baştan bu bileşenlerle inşa edilecek, tutarlılık otomatik sağlanacak.
