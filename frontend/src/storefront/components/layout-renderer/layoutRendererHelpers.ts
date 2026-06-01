import type { StorefrontSection } from '../../../types/storefrontBuilder.types';

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

export function parseBadgeLines(raw: string): string[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

export function themePrimaryColor(theme: Record<string, unknown> | undefined): string | null {
  const c = theme?.primaryColor;
  return typeof c === 'string' && c.trim() ? c.trim() : null;
}
