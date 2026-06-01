import type { StorefrontSection } from '../../../types/storefrontBuilder.types';
import {
  buildBannerImageLayerProps,
  buildHeroLayerProps,
  bannerHeightClass,
  featuredGridColumnsClass,
  mapProductCardVariant,
  objectFitClass,
  sectionWidthClass,
} from '../../../utils/storefrontImageLayout';

export {
  buildBannerImageLayerProps,
  buildHeroLayerProps,
  bannerHeightClass,
  featuredGridColumnsClass,
  mapProductCardVariant,
  objectFitClass,
  sectionWidthClass,
};

export const KNOWN_LAYOUT_SECTION_TYPES = new Set([
  'hero',
  'categoryGrid',
  'featuredProducts',
  'campaignBanner',
  'trustBadges',
  'textImage',
]);

export function layoutStr(settings: Record<string, unknown>, key: string, fallback = ''): string {
  const v = settings[key];
  if (v == null) return fallback;
  return String(v);
}

export function layoutNum(settings: Record<string, unknown>, key: string, fallback: number): number {
  const v = settings[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function layoutBool(settings: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = settings[key];
  if (v === undefined || v === null) return fallback;
  return Boolean(v);
}

export function activeLayoutSections(sections: StorefrontSection[] | undefined): StorefrontSection[] {
  if (!Array.isArray(sections)) return [];
  return sections.filter(s => s && s.enabled !== false && KNOWN_LAYOUT_SECTION_TYPES.has(s.type));
}

export function resolveStorePath(path: string, storeLink: (p: string) => string): string {
  const trimmed = path.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/store')) return storeLink(trimmed);
  if (trimmed.startsWith('/')) return storeLink(`/store${trimmed}`);
  return storeLink(`/store/${trimmed.replace(/^\//, '')}`);
}

export type LayoutTrustBadge = { title: string; description: string };

export function parseBadgeLines(raw: string): string[] {
  return parseTrustBadges(raw).map(b => (b.description ? `${b.title} — ${b.description}` : b.title));
}

export function parseTrustBadges(raw: string): LayoutTrustBadge[] {
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

export function gridColumnsClass(columns: number): string {
  if (columns === 2) return 'grid-cols-2';
  if (columns === 3) return 'grid-cols-2 sm:grid-cols-3';
  return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
}

export function themePrimaryColor(theme: Record<string, unknown> | undefined): string | null {
  const c = theme?.primaryColor;
  return typeof c === 'string' && c.trim() ? c.trim() : null;
}
