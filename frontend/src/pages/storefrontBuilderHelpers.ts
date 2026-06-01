import type { StorefrontBlockType, StorefrontLayout, StorefrontSection } from '../types/storefrontBuilder.types';

export const SUPPORTED_BLOCK_TYPES: StorefrontBlockType[] = [
  'hero',
  'categoryGrid',
  'featuredProducts',
  'campaignBanner',
  'trustBadges',
  'textImage',
];

export const BLOCK_LABELS: Record<string, string> = {
  hero: 'Hero Banner',
  categoryGrid: 'Kategori Vitrini',
  featuredProducts: 'Öne Çıkan Ürünler',
  campaignBanner: 'Kampanya Banner',
  trustBadges: 'Güven Rozetleri',
  textImage: 'Görsel + Metin',
};

export const BLOCK_DESCRIPTIONS: Record<string, string> = {
  hero: 'Ana sayfa üst banner alanı',
  categoryGrid: 'Kategori kartları vitrini',
  featuredProducts: 'Ürün listesi vitrini',
  campaignBanner: 'Kampanya veya duyuru bandı',
  trustBadges: 'Güven ve hizmet rozetleri',
  textImage: 'Görsel ve metin yan yana',
};

export function blockLabel(type: string): string {
  return BLOCK_LABELS[type] ?? 'Bilinmeyen Blok';
}

export function isKnownBlockType(type: string): boolean {
  return SUPPORTED_BLOCK_TYPES.includes(type as StorefrontBlockType);
}

export function defaultSettingsForType(type: string): Record<string, unknown> {
  switch (type) {
    case 'hero':
      return {
        title: 'Mağazanıza hoş geldiniz',
        subtitle: 'Öne çıkan ürünleri ve kampanyaları keşfedin',
        buttonText: 'Alışverişe Başla',
        buttonUrl: '/store/urunler',
        imageUrl: '',
        alignment: 'center',
      };
    case 'categoryGrid':
      return { title: 'Kategoriler', limit: 8, showImages: true };
    case 'featuredProducts':
      return { title: 'Öne Çıkan Ürünler', limit: 8, source: 'featured' };
    case 'campaignBanner':
      return {
        title: 'Kampanya',
        subtitle: 'Sınırlı süre fırsatlar',
        buttonText: 'İncele',
        buttonUrl: '/store/urunler',
        imageUrl: '',
      };
    case 'trustBadges':
      return {
        title: 'Neden bizi tercih etmelisiniz?',
        badges: 'Ücretsiz kargo\nGüvenli ödeme\nHızlı teslimat',
      };
    case 'textImage':
      return {
        title: 'Hakkımızda',
        text: 'Markanızı tanıtan kısa bir metin ekleyin.',
        imageUrl: '',
        imagePosition: 'left',
      };
    default:
      return {};
  }
}

export function createSection(type: string): StorefrontSection {
  return {
    id: `${type}_${Date.now()}`,
    type,
    enabled: true,
    settings: defaultSettingsForType(type),
  };
}

export function normalizeSection(raw: unknown, index: number): StorefrontSection {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const type = String(o.type ?? 'unknown').trim() || 'unknown';
  const id = String(o.id ?? '').trim() || `${type}_${index}`;
  return {
    id,
    type,
    enabled: o.enabled === undefined ? true : Boolean(o.enabled),
    settings:
      o.settings && typeof o.settings === 'object' && !Array.isArray(o.settings)
        ? (o.settings as Record<string, unknown>)
        : defaultSettingsForType(type),
  };
}

export function normalizeLayout(raw: unknown): StorefrontLayout {
  const root = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const version = typeof root.version === 'number' ? root.version : 1;
  const theme =
    root.theme && typeof root.theme === 'object' && !Array.isArray(root.theme)
      ? (root.theme as Record<string, unknown>)
      : {};
  const sections = Array.isArray(root.sections)
    ? root.sections.map((s, i) => normalizeSection(s, i))
    : [];
  return { version, theme, sections };
}

export function layoutFingerprint(layout: StorefrontLayout): string {
  return JSON.stringify(layout.sections);
}

export function formatBuilderDate(value: string | null | undefined): string {
  if (!value) return 'Henüz yayınlanmadı';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function statusLabel(status: string): string {
  if (status === 'PUBLISHED') return 'Yayında';
  return 'Taslak';
}
