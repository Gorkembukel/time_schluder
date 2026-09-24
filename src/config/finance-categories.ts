/**
 * Finans Paydaşı'nın önerdiği, kullanıcının onayladığı başlangıç kategori seti
 * (bkz. docs/requirements.md §7). Ayarlar sayfasından düzenlenebilir — bu liste
 * yalnızca ilk kurulumda Firestore'a seed edilecek varsayılan değerdir.
 */
import type { FinanceCategory } from '../types/domain'

export const DEFAULT_FINANCE_CATEGORIES: Omit<FinanceCategory, 'id'>[] = [
  { name: 'Barınma', kind: 'expense', order: 0, isDefault: true },
  { name: 'Market & Gıda', kind: 'expense', order: 1, isDefault: true },
  { name: 'Ulaşım', kind: 'expense', order: 2, isDefault: true },
  { name: 'Sağlık', kind: 'expense', order: 3, isDefault: true },
  { name: 'Eğitim', kind: 'expense', order: 4, isDefault: true },
  { name: 'Giyim & Kişisel Bakım', kind: 'expense', order: 5, isDefault: true },
  { name: 'Eğlence & Sosyal', kind: 'expense', order: 6, isDefault: true },
  { name: 'Yatırım & Birikim', kind: 'expense', order: 7, isDefault: true },
  { name: 'Borç & Taksit', kind: 'expense', order: 8, isDefault: true },
  { name: 'Diğer', kind: 'expense', order: 9, isDefault: true },
  { name: 'Maaş', kind: 'income', order: 0, isDefault: true },
  { name: 'Yan Gelir / Freelance', kind: 'income', order: 1, isDefault: true },
  { name: 'Yatırım Getirisi', kind: 'income', order: 2, isDefault: true },
  { name: 'Hediye / Diğer', kind: 'income', order: 3, isDefault: true },
]
