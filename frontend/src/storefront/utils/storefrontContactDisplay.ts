import { storePublicClient } from '../../services/storePublicApi';
import { whatsappHref, type FooterSettings } from '../../utils/footerSettingsHelpers';

export type StoreContactDisplay = {
  email: string;
  phone: string;
  address: string;
  workingHours: string;
  whatsappHref: string | null;
};

const DEFAULT_HOURS = 'Pazartesi – Cuma, 09:00 – 18:00';

function isPlaceholderValue(v: string): boolean {
  const t = v.trim().toLowerCase();
  if (!t) return true;
  return (
    t.includes('mağaza ayarlarından') ||
    t.includes('tanımlanmadı') ||
    t.includes('ekleyebilirsiniz') ||
    t === '—' ||
    t === '-'
  );
}

export function parseContactFieldsFromText(content: string): Partial<StoreContactDisplay> {
  const pick = (label: string): string => {
    const re = new RegExp(`${label}:\\s*([^\\n]+)`, 'i');
    const m = content.match(re);
    if (!m) return '';
    const v = m[1].trim();
    return isPlaceholderValue(v) ? '' : v;
  };
  const hoursMatch = content.match(/Çalışma saatleri\s*\n([^\n]+(?:\n[^\n]+)?)/i);
  let workingHours = '';
  if (hoursMatch) {
    const block = hoursMatch[1].replace(/\n/g, ' ').trim();
    if (!isPlaceholderValue(block)) workingHours = block;
  }
  return {
    email: pick('E-posta'),
    phone: pick('Telefon'),
    address: pick('Adres'),
    workingHours: workingHours || (content.includes('09:00') ? DEFAULT_HOURS : ''),
  };
}

function hrefFromFooterLink(url: string): { email?: string; phone?: string } {
  const u = url.trim();
  if (u.startsWith('mailto:')) {
    return { email: u.replace(/^mailto:/i, '').trim() };
  }
  if (u.startsWith('tel:')) {
    return { phone: u.replace(/^tel:/i, '').trim() };
  }
  const mailInText = u.match(/[\w.+-]+@[\w.-]+\.\w+/);
  if (mailInText) return { email: mailInText[0] };
  const phoneish = u.replace(/\D/g, '');
  if (phoneish.length >= 10 && !u.includes('http')) {
    return { phone: u.trim() };
  }
  return {};
}

export function extractContactFromFooter(
  footer: Pick<FooterSettings, 'showWhatsapp' | 'whatsappNumber' | 'columns'>,
): Partial<StoreContactDisplay> {
  const out: Partial<StoreContactDisplay> = {
    whatsappHref:
      footer.showWhatsapp && footer.whatsappNumber.trim()
        ? whatsappHref(footer.whatsappNumber)
        : null,
  };
  for (const col of footer.columns) {
    for (const link of col.links) {
      const fromUrl = hrefFromFooterLink(link.url);
      if (fromUrl.email && !out.email) out.email = fromUrl.email;
      if (fromUrl.phone && !out.phone) out.phone = fromUrl.phone;
      const fromLabel = hrefFromFooterLink(link.label);
      if (fromLabel.email && !out.email) out.email = fromLabel.email;
      if (fromLabel.phone && !out.phone) out.phone = fromLabel.phone;
    }
  }
  return out;
}

export async function fetchPublishedContactPageFields(
  tenantSlug: string,
): Promise<Partial<StoreContactDisplay>> {
  try {
    const res = await storePublicClient.get('/store/sayfa/iletisim', {
      params: { tenant: tenantSlug },
    });
    const content = (res.data as { data?: { content?: string } })?.data?.content ?? '';
    if (!content.trim()) return {};
    return parseContactFieldsFromText(content);
  } catch {
    return {};
  }
}

export function mergeContactDisplay(
  ...parts: Array<Partial<StoreContactDisplay> | undefined>
): StoreContactDisplay {
  const merged: StoreContactDisplay = {
    email: '',
    phone: '',
    address: '',
    workingHours: DEFAULT_HOURS,
    whatsappHref: null,
  };
  for (const p of parts) {
    if (!p) continue;
    if (p.email?.trim()) merged.email = p.email.trim();
    if (p.phone?.trim()) merged.phone = p.phone.trim();
    if (p.address?.trim()) merged.address = p.address.trim();
    if (p.workingHours?.trim()) merged.workingHours = p.workingHours.trim();
    if (p.whatsappHref) merged.whatsappHref = p.whatsappHref;
  }
  return merged;
}

export type ContactInfoCard = {
  key: string;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
  available: boolean;
  fallback: string;
};

export function buildContactInfoCards(info: StoreContactDisplay): ContactInfoCard[] {
  const cards: ContactInfoCard[] = [
    {
      key: 'email',
      label: 'E-posta',
      value: info.email,
      href: info.email ? `mailto:${info.email}` : undefined,
      available: Boolean(info.email),
      fallback: 'E-posta henüz tanımlı değil — formdan bize yazabilirsiniz.',
    },
    {
      key: 'phone',
      label: 'Telefon',
      value: info.phone,
      href: info.phone ? `tel:${info.phone.replace(/\s/g, '')}` : undefined,
      available: Boolean(info.phone),
      fallback: 'Telefon bilgisi paylaşılmadı — mesajınızda numaranızı belirtin.',
    },
  ];
  if (info.whatsappHref) {
    cards.push({
      key: 'whatsapp',
      label: 'WhatsApp',
      value: 'WhatsApp üzerinden yazın',
      href: info.whatsappHref,
      external: true,
      available: true,
      fallback: '',
    });
  }
  cards.push(
    {
      key: 'address',
      label: 'Adres',
      value: info.address,
      available: Boolean(info.address),
      fallback: 'Adres bilgisi henüz eklenmedi.',
    },
    {
      key: 'hours',
      label: 'Çalışma saatleri',
      value: info.workingHours,
      available: true,
      fallback: DEFAULT_HOURS,
    },
  );
  return cards;
}
