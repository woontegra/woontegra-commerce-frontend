import { generateSlug } from './slugGenerator';

/** Kullanıcıya gösterilen standart bağlantı/adres alanı yardım metni */
export const SLUG_FIELD_HELP =
  'Boş bırakırsanız başlıktan otomatik oluşturulur. İsterseniz değiştirebilirsiniz.';

/** Kayıt öncesi: boş bağlantı alanı kaynak metinden üretilir */
export function resolveSlugForSave(sourceLabel: string, slug: string): string {
  const trimmed = slug.trim();
  if (trimmed) return trimmed;
  return generateSlug(sourceLabel);
}
