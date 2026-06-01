export type AnnouncementBarMode = 'static' | 'marquee';
export type AnnouncementBarLayout = 'single' | 'split' | 'centered';
export type AnnouncementBarFontWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type AnnouncementBarAlign = 'left' | 'center' | 'right';

export type AnnouncementBarSettings = {
  enabled: boolean;
  showOnDesktop: boolean;
  showOnMobile: boolean;
  text: string;
  secondaryText: string;
  mobileText: string;
  mode: AnnouncementBarMode;
  heightPx: number;
  backgroundColor: string;
  textColor: string;
  fontSizePx: number;
  fontWeight: AnnouncementBarFontWeight;
  align: AnnouncementBarAlign;
  layout: AnnouncementBarLayout;
  marqueeSpeed: number;
  marqueeRepeat: boolean;
  marqueeOnMobile: boolean;
  linkEnabled: boolean;
  linkUrl: string;
  linkTarget: '_self' | '_blank';
};

export const GLOBAL_ANNOUNCEMENT_BAR_ID = '__announcementBar__';

export function defaultAnnouncementBarSettings(): AnnouncementBarSettings {
  return {
    enabled: false,
    showOnDesktop: true,
    showOnMobile: true,
    text: 'Ücretsiz kargo fırsatlarını kaçırmayın',
    secondaryText: '',
    mobileText: '',
    mode: 'static',
    heightPx: 36,
    backgroundColor: '#7c3aed',
    textColor: '#ffffff',
    fontSizePx: 14,
    fontWeight: 'semibold',
    align: 'center',
    layout: 'centered',
    marqueeSpeed: 25,
    marqueeRepeat: true,
    marqueeOnMobile: true,
    linkEnabled: false,
    linkUrl: '',
    linkTarget: '_self',
  };
}

function str(raw: Record<string, unknown>, key: keyof AnnouncementBarSettings, fallback: string): string {
  const v = raw[key];
  if (v == null) return fallback;
  return String(v);
}

function num(raw: Record<string, unknown>, key: keyof AnnouncementBarSettings, fallback: number): number {
  const v = raw[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(raw: Record<string, unknown>, key: keyof AnnouncementBarSettings, fallback: boolean): boolean {
  const v = raw[key];
  return v === undefined ? fallback : Boolean(v);
}

export function mergeAnnouncementBarSettings(raw: unknown): AnnouncementBarSettings {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const d = defaultAnnouncementBarSettings();
  const mode = str(o, 'mode', d.mode) === 'marquee' ? 'marquee' : 'static';
  const layoutRaw = str(o, 'layout', d.layout);
  const layout: AnnouncementBarLayout =
    layoutRaw === 'split' ? 'split' : layoutRaw === 'single' ? 'single' : 'centered';
  const weightRaw = str(o, 'fontWeight', d.fontWeight);
  const fontWeight: AnnouncementBarFontWeight =
    weightRaw === 'normal' || weightRaw === 'medium' || weightRaw === 'bold' ? weightRaw : 'semibold';
  const alignRaw = str(o, 'align', d.align);
  const align: AnnouncementBarAlign =
    alignRaw === 'left' || alignRaw === 'right' ? alignRaw : 'center';
  const linkTarget = str(o, 'linkTarget', d.linkTarget) === '_blank' ? '_blank' : '_self';

  return {
    enabled: bool(o, 'enabled', d.enabled),
    showOnDesktop: bool(o, 'showOnDesktop', d.showOnDesktop),
    showOnMobile: bool(o, 'showOnMobile', d.showOnMobile),
    text: str(o, 'text', d.text),
    secondaryText: str(o, 'secondaryText', d.secondaryText),
    mobileText: str(o, 'mobileText', d.mobileText),
    mode,
    heightPx: Math.min(80, Math.max(24, num(o, 'heightPx', d.heightPx))),
    backgroundColor: str(o, 'backgroundColor', d.backgroundColor),
    textColor: str(o, 'textColor', d.textColor),
    fontSizePx: Math.min(24, Math.max(10, num(o, 'fontSizePx', d.fontSizePx))),
    fontWeight,
    align,
    layout,
    marqueeSpeed: Math.min(60, Math.max(8, num(o, 'marqueeSpeed', d.marqueeSpeed))),
    marqueeRepeat: bool(o, 'marqueeRepeat', d.marqueeRepeat),
    marqueeOnMobile: bool(o, 'marqueeOnMobile', d.marqueeOnMobile),
    linkEnabled: bool(o, 'linkEnabled', d.linkEnabled),
    linkUrl: str(o, 'linkUrl', d.linkUrl),
    linkTarget,
  };
}

export function extractAnnouncementBarFromTheme(theme: Record<string, unknown> | undefined): AnnouncementBarSettings {
  if (!theme) return defaultAnnouncementBarSettings();
  return mergeAnnouncementBarSettings(theme.announcementBar);
}

export function fontWeightCss(weight: AnnouncementBarFontWeight): string {
  const map: Record<AnnouncementBarFontWeight, string> = {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };
  return map[weight] ?? '600';
}

export function resolveAnnouncementDisplayText(
  settings: AnnouncementBarSettings,
  viewport: 'desktop' | 'mobile',
): { primary: string; secondary: string } {
  const primary =
    viewport === 'mobile' && settings.mobileText.trim()
      ? settings.mobileText.trim()
      : settings.text.trim();
  const secondary = settings.secondaryText.trim();
  return { primary, secondary };
}

export function shouldRenderAnnouncementBar(
  settings: AnnouncementBarSettings,
  viewport: 'desktop' | 'mobile',
  options?: { preview?: boolean; allowEmptyPreview?: boolean },
): boolean {
  if (!settings.enabled) return false;
  if (viewport === 'desktop' && !settings.showOnDesktop) return false;
  if (viewport === 'mobile' && !settings.showOnMobile) return false;

  const { primary, secondary } = resolveAnnouncementDisplayText(settings, viewport);
  const hasContent = Boolean(primary || (settings.layout === 'split' && secondary));
  if (hasContent) return true;
  return Boolean(options?.preview && options?.allowEmptyPreview);
}

export function announcementBarVisibilityClass(settings: AnnouncementBarSettings): string {
  if (!settings.showOnDesktop && settings.showOnMobile) return 'md:hidden';
  if (settings.showOnDesktop && !settings.showOnMobile) return 'hidden md:block';
  if (!settings.showOnDesktop && !settings.showOnMobile) return 'hidden';
  return '';
}
