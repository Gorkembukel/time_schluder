/**
 * Konu oluşturulurken seçilebilen başlangıç şablon seti (bkz. docs/decisions/0013). Ayarlar'dan
 * düzenlenemez ama kullanıcı "Yeni şablon olarak kaydet" ile kendi özel şablonlarını ekleyebilir —
 * `config/finance-categories.ts`'teki "seed sonra Firestore'da düzenlenebilir" deseniyle aynı.
 */
import type { TopicTemplate } from '../types/domain'

export const DEFAULT_TOPIC_TEMPLATES: Omit<TopicTemplate, 'id'>[] = [
  { name: 'Boş', isBuiltIn: true, sections: [] },
  {
    name: 'Müfredat',
    isBuiltIn: true,
    sections: [
      { title: 'Kavramlar', order: 0 },
      { title: 'Kaynaklar', order: 1 },
      { title: 'Dokümanlar', order: 2 },
    ],
  },
  {
    name: 'Envanter',
    isBuiltIn: true,
    sections: [
      { title: 'Araçlar', order: 0 },
      { title: 'Beceriler', order: 1 },
    ],
  },
  {
    name: 'Proje kataloğu',
    isBuiltIn: true,
    sections: [{ title: 'Projeler', order: 0 }],
  },
]
