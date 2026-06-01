import { buildAbsoluteStorefrontListUrl, buildStorefrontListUrl } from '../utils/storefrontUrl';
import { displayStoreName, displayStorefrontName } from '../utils/displayStoreName';

export interface StoreInfoForm {
  storeName:      string;
  contactEmail:   string;
  contactPhone:   string;
  contactAddress: string;
  logoUrl:        string;
  description:    string;
}

export interface StoreBrandingMeta {
  storefrontSlug: string | null;
  customDomain:   string | null;
  domainVerified: boolean;
}

export interface ChecklistItem {
  key:     string;
  label:   string;
  done:    boolean;
}

export function buildChecklist(form: StoreInfoForm, faviconUrl = ''): ChecklistItem[] {
  return [
    { key: 'name',        label: 'Mağaza adı girildi',      done: Boolean(form.storeName.trim()) },
    { key: 'email',       label: 'E-posta girildi',         done: Boolean(form.contactEmail.trim()) },
    { key: 'phone',       label: 'Telefon girildi',         done: Boolean(form.contactPhone.trim()) },
    { key: 'address',     label: 'Adres girildi',           done: Boolean(form.contactAddress.trim()) },
    { key: 'logo',        label: 'Logo tanımlandı',         done: Boolean(form.logoUrl.trim()) },
    { key: 'favicon',     label: 'Favicon tanımlandı',      done: Boolean(faviconUrl.trim()) },
    { key: 'description', label: 'Kısa açıklama girildi',   done: Boolean(form.description.trim()) },
  ];
}

export function contactCompletionLabel(form: StoreInfoForm): string {
  const items = buildChecklist(form).filter(i => ['email', 'phone', 'address'].includes(i.key));
  const done = items.filter(i => i.done).length;
  if (done === 0) return 'Eksik';
  if (done === items.length) return 'Tamamlandı';
  return `${done}/${items.length} tamam`;
}

export function storeStatusLabel(form: StoreInfoForm): { value: string; hint?: string } {
  if (!form.storeName.trim()) {
    return { value: 'Eksik Bilgi', hint: 'Mağaza adı zorunlu' };
  }
  const checklist = buildChecklist(form);
  const missing = checklist.filter(i => !i.done).length;
  if (missing === 0) return { value: 'Hazır', hint: 'Temel bilgiler tamam' };
  if (missing <= 2) return { value: 'Aktif', hint: `${missing} eksik alan` };
  return { value: 'Eksik Bilgi', hint: `${missing} eksik alan` };
}

export function logoStatusLabel(logoUrl: string): string {
  return logoUrl.trim() ? 'Logo yüklü' : 'Logo eksik';
}

export function faviconStatusLabel(faviconUrl: string): string {
  return faviconUrl.trim() ? 'Favicon yüklü' : 'Favicon eksik';
}

/** Üst durum kartı: logo + favicon birlikte */
export function brandImagesStatusLabel(logoUrl: string, faviconUrl: string): string {
  const hasLogo = Boolean(logoUrl.trim());
  const hasFav  = Boolean(faviconUrl.trim());
  if (hasLogo && hasFav) return 'Tamamlandı';
  if (!hasLogo && !hasFav) return 'Logo ve favicon eksik';
  if (!hasLogo) return 'Logo eksik';
  return 'Favicon eksik';
}

export function resolveStorefrontHref(meta: StoreBrandingMeta): string | null {
  if (meta.customDomain && meta.domainVerified) {
    return `https://${meta.customDomain}`;
  }
  if (meta.storefrontSlug?.trim()) {
    return buildStorefrontListUrl(meta.storefrontSlug.trim());
  }
  return null;
}

export function resolveStorefrontDisplay(meta: StoreBrandingMeta): string {
  if (meta.customDomain && meta.domainVerified) {
    return meta.customDomain;
  }
  if (meta.storefrontSlug?.trim()) {
    const abs = buildAbsoluteStorefrontListUrl(meta.storefrontSlug.trim());
    try {
      const u = new URL(abs, window.location.origin);
      return `${u.hostname}${u.pathname}${u.search}`;
    } catch {
      return buildStorefrontListUrl(meta.storefrontSlug.trim());
    }
  }
  return 'Henüz tanımlı değil';
}

export function storeInitial(name: string): string {
  const n = displayStorefrontName(name, '').trim();
  return (n.charAt(0) || 'M').toUpperCase();
}

export function panelDisplayName(name: string): string {
  const v = displayStoreName(name, '');
  return v || 'Henüz tanımlı değil';
}

export function storefrontDisplayName(name: string): string {
  const v = displayStorefrontName(name, '');
  return v || 'Henüz tanımlı değil';
}

export function safePreviewText(value: string, fallback: string): string {
  const v = value.trim();
  return v || fallback;
}
