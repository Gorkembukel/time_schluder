/**
 * Bilgi birimi türlerinin görünüm sırası ve ikonu (bkz. docs/decisions/0010). Değerlerin kendisi
 * (`KNOWLEDGE_ITEM_TYPES`) `types/domain.ts`'te — bu dosya yalnızca UI'ın ihtiyaç duyduğu
 * sıralama/ikon eşlemesini tutar, `config-audit`'in denetim kapsamına giren katmandır.
 */
import { FileText, Link2, Lightbulb, StickyNote, User, type LucideIcon } from 'lucide-react'
import { KNOWLEDGE_ITEM_TYPES, type KnowledgeItemType } from '../types/domain'

export const KNOWLEDGE_ITEM_TYPE_ICONS: Record<KnowledgeItemType, LucideIcon> = {
  not: StickyNote,
  link: Link2,
  dokuman: FileText,
  kisi: User,
  'tasarim-karari': Lightbulb,
}

/** `link`/`dokuman`: değer bir URL'dir ve kart tıklanınca doğrudan açılır. */
export function isLinkType(type: KnowledgeItemType): boolean {
  return type === 'link' || type === 'dokuman'
}

export const KNOWLEDGE_ITEM_TYPE_ORDER: readonly KnowledgeItemType[] = KNOWLEDGE_ITEM_TYPES
