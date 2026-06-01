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
  hero: 'Ana sayfanın üst vitrin alanı — markanızı ve çağrıyı öne çıkarır.',
  categoryGrid: 'Kategori kartlarıyla keşfi hızlandırın.',
  featuredProducts: 'Seçili ürünleri vitrinde listeleyin.',
  campaignBanner: 'Kampanya ve duyurular için dikkat çekici bant.',
  trustBadges: 'Güven, hizmet ve teslimat vaatlerinizi gösterin.',
  textImage: 'Marka hikâyesi veya bilgi metni + görsel.',
};

export type TrustBadgeItem = { title: string; description: string };

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
        backgroundType: 'gradient',
        backgroundColor: '#4f46e5',
        textColor: '#ffffff',
      };
    case 'categoryGrid':
      return {
        title: 'Kategoriler',
        limit: 8,
        showImages: true,
        columns: 4,
        viewAllLabel: 'Tüm kategorileri göster',
      };
    case 'featuredProducts':
      return {
        title: 'Öne Çıkan Ürünler',
        limit: 8,
        source: 'featured',
        cardStyle: 'card',
        showPrice: true,
        showAddToCart: true,
      };
    case 'campaignBanner':
      return {
        title: 'Kampanya',
        subtitle: 'Sınırlı süre fırsatlar',
        buttonText: 'İncele',
        buttonUrl: '/store/urunler',
        imageUrl: '',
        backgroundColor: '#fffbeb',
        textColor: '#78350f',
      };
    case 'trustBadges':
      return {
        title: 'Neden bizi tercih etmelisiniz?',
        badges:
          'Güvenli ödeme|Kredi kartı ve iyzico güvencesi\nKolay iade|14 gün içinde iade\nHızlı kargo|1-3 iş günü',
      };
    case 'textImage':
      return {
        title: 'Hakkımızda',
        text: 'Markanızı tanıtan kısa bir metin ekleyin.',
        imageUrl: '',
        imagePosition: 'left',
        buttonText: '',
        buttonUrl: '',
      };
    default:
      return {};
  }
}

export function mergeSectionSettings(type: string, raw: Record<string, unknown>): Record<string, unknown> {
  return { ...defaultSettingsForType(type), ...raw };
}

export function parseTrustBadges(raw: string): TrustBadgeItem[] {
  if (!raw.trim()) return [];
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const pipe = line.indexOf('|');
      if (pipe >= 0) {
        return {
          title: line.slice(0, pipe).trim(),
          description: line.slice(pipe + 1).trim(),
        };
      }
      return { title: line, description: '' };
    });
}

export function serializeTrustBadges(items: TrustBadgeItem[]): string {
  return items
    .map(item => {
      const title = item.title ?? '';
      const description = item.description ?? '';
      if (description.trim()) {
        return `${title}|${description}`;
      }
      return title;
    })
    .join('\n');
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
  const rawSettings =
    o.settings && typeof o.settings === 'object' && !Array.isArray(o.settings)
      ? (o.settings as Record<string, unknown>)
      : {};
  return {
    id,
    type,
    enabled: o.enabled === undefined ? true : Boolean(o.enabled),
    settings: mergeSectionSettings(type, rawSettings),
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

export function gridColumnsClass(columns: number): string {
  if (columns === 2) return 'grid-cols-2';
  if (columns === 3) return 'grid-cols-2 sm:grid-cols-3';
  return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
}

export function heroBackgroundStyle(
  settings: Record<string, unknown>,
  themePrimary: string | null,
): { style: Record<string, string>; hasImageOverlay: boolean } {
  const bgType = String(settings.backgroundType ?? 'gradient');
  const bgColor = String(settings.backgroundColor ?? themePrimary ?? '#4f46e5').trim() || '#4f46e5';
  const imageUrl = String(settings.imageUrl ?? '').trim();

  if (bgType === 'image' && imageUrl) {
    return {
      style: {
        backgroundImage: `linear-gradient(rgba(15,23,42,0.45), rgba(15,23,42,0.45)), url("${imageUrl.replace(/"/g, '\\"')}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      },
      hasImageOverlay: true,
    };
  }
  if (bgType === 'solid') {
    return { style: { backgroundColor: bgColor }, hasImageOverlay: false };
  }
  return {
    style: { background: `linear-gradient(135deg, ${bgColor}, #6366f1)` },
    hasImageOverlay: false,
  };
}
