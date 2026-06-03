export type FooterLayout = 'simple' | 'columns' | 'centered';

export type FooterLink = {
  id: string;
  label: string;
  url: string;
};

export type FooterColumn = {
  id: string;
  title: string;
  links: FooterLink[];
};

export const FOOTER_LOGO_WIDTH_MIN = 80;
export const FOOTER_LOGO_WIDTH_MAX = 240;
export const FOOTER_LOGO_MAX_HEIGHT_MIN = 24;
export const FOOTER_LOGO_MAX_HEIGHT_MAX = 96;

export type FooterSettings = {
  enabled: boolean;
  layout: FooterLayout;
  logoUrl: string;
  logoWidthPx: number;
  logoMaxHeightPx: number;
  description: string;
  backgroundColor: string;
  textColor: string;
  headingColor: string;
  showNewsletter: boolean;
  newsletterTitle: string;
  newsletterDescription: string;
  showSocialLinks: boolean;
  socialLinks: FooterLink[];
  showWhatsapp: boolean;
  whatsappNumber: string;
  columns: FooterColumn[];
  legalLinksEnabled: boolean;
};

export const GLOBAL_FOOTER_SETTINGS_ID = '__footerSettings__';

export const DEFAULT_LEGAL_LINKS: FooterLink[] = [
  { id: 'legal-kvkk', label: 'KVKK Aydınlatma Metni', url: '/kvkk' },
  { id: 'legal-privacy', label: 'Gizlilik Politikası', url: '/gizlilik' },
  { id: 'legal-terms', label: 'Kullanım Şartları', url: '/kullanim-sartlari' },
  { id: 'legal-distance-sales', label: 'Mesafeli Satış Sözleşmesi', url: '/mesafeli-satis-sozlesmesi' },
  { id: 'legal-returns', label: 'İade ve İptal Koşulları', url: '/iade-ve-iptal-kosullari' },
  { id: 'legal-cookies', label: 'Çerez Politikası', url: '/cerez-politikasi' },
];

export function newFooterLink(label = '', url = ''): FooterLink {
  return { id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label, url };
}

export function newFooterColumn(title = 'Kolon'): FooterColumn {
  return {
    id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    links: [],
  };
}

export function defaultFooterSettings(): FooterSettings {
  return {
    enabled: false,
    layout: 'columns',
    logoUrl: '',
    logoWidthPx: 155,
    logoMaxHeightPx: 56,
    description: '',
    backgroundColor: '#ffffff',
    textColor: '#64748b',
    headingColor: '#0f172a',
    showNewsletter: false,
    newsletterTitle: 'E-bülten',
    newsletterDescription: 'Kampanya ve yeniliklerden haberdar olun.',
    showSocialLinks: false,
    socialLinks: [],
    showWhatsapp: false,
    whatsappNumber: '',
    columns: [],
    legalLinksEnabled: true,
  };
}

function str(raw: Record<string, unknown>, key: keyof FooterSettings, fallback: string): string {
  const v = raw[key];
  if (v == null) return fallback;
  return String(v);
}

function bool(raw: Record<string, unknown>, key: keyof FooterSettings, fallback: boolean): boolean {
  const v = raw[key];
  return v === undefined ? fallback : Boolean(v);
}

function num(raw: Record<string, unknown>, key: keyof FooterSettings, fallback: number): number {
  const v = raw[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseLink(raw: unknown, index: number): FooterLink | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const label = String(o.label ?? '').trim();
  const url = String(o.url ?? '').trim();
  if (!label && !url) return null;
  const id = String(o.id ?? '').trim() || `link_${index}`;
  return { id, label, url };
}

function parseLinks(raw: unknown): FooterLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => parseLink(item, i)).filter((l): l is FooterLink => l != null);
}

function parseColumn(raw: unknown, index: number): FooterColumn | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const title = String(o.title ?? '').trim();
  const id = String(o.id ?? '').trim() || `col_${index}`;
  const links = parseLinks(o.links);
  if (!title && links.length === 0) return null;
  return { id, title: title || 'Kolon', links };
}

function parseColumns(raw: unknown): FooterColumn[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => parseColumn(item, i)).filter((c): c is FooterColumn => c != null);
}

export function mergeFooterSettings(raw: unknown): FooterSettings {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const d = defaultFooterSettings();
  const layoutRaw = str(o, 'layout', d.layout);
  const layout: FooterLayout =
    layoutRaw === 'simple' ? 'simple' : layoutRaw === 'centered' ? 'centered' : 'columns';

  return {
    enabled: bool(o, 'enabled', d.enabled),
    layout,
    logoUrl: str(o, 'logoUrl', d.logoUrl),
    logoWidthPx: Math.min(
      FOOTER_LOGO_WIDTH_MAX,
      Math.max(FOOTER_LOGO_WIDTH_MIN, num(o, 'logoWidthPx', d.logoWidthPx)),
    ),
    logoMaxHeightPx: Math.min(
      FOOTER_LOGO_MAX_HEIGHT_MAX,
      Math.max(FOOTER_LOGO_MAX_HEIGHT_MIN, num(o, 'logoMaxHeightPx', d.logoMaxHeightPx)),
    ),
    description: str(o, 'description', d.description),
    backgroundColor: str(o, 'backgroundColor', d.backgroundColor),
    textColor: str(o, 'textColor', d.textColor),
    headingColor: str(o, 'headingColor', d.headingColor),
    showNewsletter: bool(o, 'showNewsletter', d.showNewsletter),
    newsletterTitle: str(o, 'newsletterTitle', d.newsletterTitle),
    newsletterDescription: str(o, 'newsletterDescription', d.newsletterDescription),
    showSocialLinks: bool(o, 'showSocialLinks', d.showSocialLinks),
    socialLinks: parseLinks(o.socialLinks),
    showWhatsapp: bool(o, 'showWhatsapp', d.showWhatsapp),
    whatsappNumber: str(o, 'whatsappNumber', d.whatsappNumber),
    columns: parseColumns(o.columns),
    legalLinksEnabled: bool(o, 'legalLinksEnabled', d.legalLinksEnabled),
  };
}

export function extractFooterSettingsFromTheme(theme: Record<string, unknown> | undefined): FooterSettings {
  if (!theme) return defaultFooterSettings();
  return mergeFooterSettings(theme.footerSettings);
}

export function footerLogoImageStyle(
  settings: Pick<FooterSettings, 'logoWidthPx' | 'logoMaxHeightPx'>,
): {
  width: string;
  maxWidth: string;
  height: string;
  maxHeight: string;
  objectFit: 'contain';
  objectPosition: string;
} {
  const logoWidthPx = settings.logoWidthPx || 155;
  const logoMaxHeightPx = settings.logoMaxHeightPx || 56;
  return {
    width: `${logoWidthPx}px`,
    maxWidth: '100%',
    height: 'auto',
    maxHeight: `${logoMaxHeightPx}px`,
    objectFit: 'contain',
    objectPosition: 'left center',
  };
}

export function resolveFooterLogoUrl(settings: FooterSettings, tenantLogoUrl: string | null): string | null {
  const custom = settings.logoUrl.trim();
  if (custom) return custom;
  return tenantLogoUrl;
}

export function whatsappHref(number: string): string | null {
  const digits = number.replace(/\D/g, '');
  if (!digits) return null;
  const normalized = digits.startsWith('90') ? digits : digits.startsWith('0') ? `90${digits.slice(1)}` : `90${digits}`;
  return `https://wa.me/${normalized}`;
}

export function resolveFooterHref(url: string, storeLink?: (path: string) => string): string {
  const trimmed = url.trim();
  if (!trimmed) return '#';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return trimmed;
  }
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return storeLink ? storeLink(path) : path;
}

export function hasFooterContent(settings: FooterSettings): boolean {
  return Boolean(
    settings.description.trim() ||
      settings.columns.some(c => c.title.trim() || c.links.length > 0) ||
      (settings.showSocialLinks && settings.socialLinks.length > 0) ||
      settings.showWhatsapp ||
      settings.showNewsletter ||
      settings.legalLinksEnabled,
  );
}
