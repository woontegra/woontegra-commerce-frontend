export type HeaderLayout = 'logoLeftMenuCenter' | 'logoCenterMenuBelow' | 'minimal';
export type HeaderLogoPosition = 'left' | 'center';
export type HeaderMenuPosition = 'left' | 'center' | 'right';
export type HeaderMobileLayout = 'stacked' | 'compact' | 'minimal';

export type HeaderSettings = {
  enabled: boolean;
  layout: HeaderLayout;
  logoPosition: HeaderLogoPosition;
  menuPosition: HeaderMenuPosition;
  showSearch: boolean;
  showCart: boolean;
  showFavorites: boolean;
  showAccount: boolean;
  sticky: boolean;
  heightPx: number;
  backgroundColor: string;
  textColor: string;
  activeColor: string;
  borderEnabled: boolean;
  menuFontSizePx: number;
  logoMaxHeightPx: number;
  mobileLayout: HeaderMobileLayout;
};

export const GLOBAL_HEADER_SETTINGS_ID = '__headerSettings__';

export function defaultHeaderSettings(): HeaderSettings {
  return {
    enabled: false,
    layout: 'logoLeftMenuCenter',
    logoPosition: 'left',
    menuPosition: 'center',
    showSearch: true,
    showCart: true,
    showFavorites: false,
    showAccount: true,
    sticky: true,
    heightPx: 64,
    backgroundColor: '#ffffff',
    textColor: '#475569',
    activeColor: '#4f46e5',
    borderEnabled: true,
    menuFontSizePx: 14,
    logoMaxHeightPx: 36,
    mobileLayout: 'stacked',
  };
}

function str(raw: Record<string, unknown>, key: keyof HeaderSettings, fallback: string): string {
  const v = raw[key];
  if (v == null) return fallback;
  return String(v);
}

function num(raw: Record<string, unknown>, key: keyof HeaderSettings, fallback: number): number {
  const v = raw[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(raw: Record<string, unknown>, key: keyof HeaderSettings, fallback: boolean): boolean {
  const v = raw[key];
  return v === undefined ? fallback : Boolean(v);
}

function parseLayout(raw: string, fallback: HeaderLayout): HeaderLayout {
  if (raw === 'logoCenterMenuBelow' || raw === 'minimal') return raw;
  return raw === 'logoLeftMenuCenter' ? 'logoLeftMenuCenter' : fallback;
}

function parseLogoPosition(raw: string, fallback: HeaderLogoPosition): HeaderLogoPosition {
  return raw === 'center' ? 'center' : fallback;
}

function parseMenuPosition(raw: string, fallback: HeaderMenuPosition): HeaderMenuPosition {
  if (raw === 'left' || raw === 'right') return raw;
  return raw === 'center' ? 'center' : fallback;
}

function parseMobileLayout(raw: string, fallback: HeaderMobileLayout): HeaderMobileLayout {
  if (raw === 'compact' || raw === 'minimal') return raw;
  return raw === 'stacked' ? 'stacked' : fallback;
}

export function mergeHeaderSettings(raw: unknown): HeaderSettings {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const d = defaultHeaderSettings();
  const layout = parseLayout(str(o, 'layout', d.layout), d.layout);

  return {
    enabled: bool(o, 'enabled', d.enabled),
    layout,
    logoPosition: parseLogoPosition(str(o, 'logoPosition', d.logoPosition), d.logoPosition),
    menuPosition: parseMenuPosition(str(o, 'menuPosition', d.menuPosition), d.menuPosition),
    showSearch: bool(o, 'showSearch', d.showSearch),
    showCart: bool(o, 'showCart', d.showCart),
    showFavorites: bool(o, 'showFavorites', d.showFavorites),
    showAccount: bool(o, 'showAccount', d.showAccount),
    sticky: bool(o, 'sticky', d.sticky),
    heightPx: Math.min(120, Math.max(48, num(o, 'heightPx', d.heightPx))),
    backgroundColor: str(o, 'backgroundColor', d.backgroundColor),
    textColor: str(o, 'textColor', d.textColor),
    activeColor: str(o, 'activeColor', d.activeColor),
    borderEnabled: bool(o, 'borderEnabled', d.borderEnabled),
    menuFontSizePx: Math.min(20, Math.max(11, num(o, 'menuFontSizePx', d.menuFontSizePx))),
    logoMaxHeightPx: Math.min(72, Math.max(24, num(o, 'logoMaxHeightPx', d.logoMaxHeightPx))),
    mobileLayout: parseMobileLayout(str(o, 'mobileLayout', d.mobileLayout), d.mobileLayout),
  };
}

export function extractHeaderSettingsFromTheme(theme: Record<string, unknown> | undefined): HeaderSettings {
  if (!theme) return defaultHeaderSettings();
  return mergeHeaderSettings(theme.headerSettings);
}

export function layoutPresetPatch(layout: HeaderLayout): Partial<HeaderSettings> {
  if (layout === 'logoCenterMenuBelow') {
    return { layout, logoPosition: 'center', menuPosition: 'center' };
  }
  if (layout === 'minimal') {
    return { layout, logoPosition: 'left', menuPosition: 'right' };
  }
  return { layout, logoPosition: 'left', menuPosition: 'center' };
}

export const HEADER_LAYOUT_LABELS: Record<HeaderLayout, string> = {
  logoLeftMenuCenter: 'Logo sol, menü orta, ikonlar sağ',
  logoCenterMenuBelow: 'Logo orta, menü alt',
  minimal: 'Minimal header',
};
