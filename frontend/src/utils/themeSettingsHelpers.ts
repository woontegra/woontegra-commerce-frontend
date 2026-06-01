export type ThemeProductCardStyle = 'standard' | 'plain' | 'compact';

export type ThemeSettings = {
  enabled: boolean;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  buttonRadius: number;
  cardRadius: number;
  containerMaxWidthPx: number;
  productCardStyle: ThemeProductCardStyle;
  sectionSpacingPx: number;
};

export const GLOBAL_THEME_SETTINGS_ID = '__themeSettings__';

export const THEME_FONT_OPTIONS = [
  { id: 'system', label: 'Sistem varsayılanı' },
  { id: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { id: '"Segoe UI", system-ui, sans-serif', label: 'Segoe UI' },
  { id: 'Georgia, "Times New Roman", serif', label: 'Georgia' },
  { id: '"Courier New", monospace', label: 'Courier' },
] as const;

export function defaultThemeSettings(): ThemeSettings {
  return {
    enabled: false,
    primaryColor: '#4f46e5',
    secondaryColor: '#10b981',
    backgroundColor: '#f8fafc',
    textColor: '#0f172a',
    fontFamily: 'system',
    buttonRadius: 8,
    cardRadius: 12,
    containerMaxWidthPx: 1152,
    productCardStyle: 'standard',
    sectionSpacingPx: 48,
  };
}

function str(raw: Record<string, unknown>, key: keyof ThemeSettings, fallback: string): string {
  const v = raw[key];
  if (v == null) return fallback;
  return String(v);
}

function num(raw: Record<string, unknown>, key: keyof ThemeSettings, fallback: number): number {
  const v = raw[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(raw: Record<string, unknown>, key: keyof ThemeSettings, fallback: boolean): boolean {
  const v = raw[key];
  return v === undefined ? fallback : Boolean(v);
}

function parseProductCardStyle(raw: string, fallback: ThemeProductCardStyle): ThemeProductCardStyle {
  if (raw === 'plain' || raw === 'compact') return raw;
  return raw === 'standard' ? 'standard' : fallback;
}

export function mergeThemeSettings(raw: unknown): ThemeSettings {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const d = defaultThemeSettings();
  return {
    enabled: bool(o, 'enabled', d.enabled),
    primaryColor: str(o, 'primaryColor', d.primaryColor),
    secondaryColor: str(o, 'secondaryColor', d.secondaryColor),
    backgroundColor: str(o, 'backgroundColor', d.backgroundColor),
    textColor: str(o, 'textColor', d.textColor),
    fontFamily: str(o, 'fontFamily', d.fontFamily),
    buttonRadius: Math.min(32, Math.max(0, num(o, 'buttonRadius', d.buttonRadius))),
    cardRadius: Math.min(32, Math.max(0, num(o, 'cardRadius', d.cardRadius))),
    containerMaxWidthPx: Math.min(1600, Math.max(960, num(o, 'containerMaxWidthPx', d.containerMaxWidthPx))),
    productCardStyle: parseProductCardStyle(str(o, 'productCardStyle', d.productCardStyle), d.productCardStyle),
    sectionSpacingPx: Math.min(120, Math.max(16, num(o, 'sectionSpacingPx', d.sectionSpacingPx))),
  };
}

export function extractThemeSettingsFromTheme(theme: Record<string, unknown> | undefined): ThemeSettings {
  if (!theme) return defaultThemeSettings();
  return mergeThemeSettings(theme.themeSettings);
}

export function storefrontThemeCssVariables(settings: ThemeSettings): Record<string, string> {
  if (!settings.enabled) return {};
  const vars: Record<string, string> = {
    '--store-primary': settings.primaryColor,
    '--store-secondary': settings.secondaryColor,
    '--store-bg': settings.backgroundColor,
    '--store-text': settings.textColor,
    '--store-button-radius': `${settings.buttonRadius}px`,
    '--store-card-radius': `${settings.cardRadius}px`,
    '--store-container-max': `${settings.containerMaxWidthPx}px`,
    '--store-section-spacing': `${settings.sectionSpacingPx}px`,
  };
  if (settings.fontFamily && settings.fontFamily !== 'system') {
    vars['--store-font-family'] = settings.fontFamily;
  }
  return vars;
}

export function resolveBlockProductCardStyle(
  blockSettings: Record<string, unknown>,
  themeSettings: ThemeSettings,
): ThemeProductCardStyle {
  const blockStyle = String(blockSettings.cardStyle ?? 'standard');
  if (blockStyle === 'plain' || blockStyle === 'compact') return blockStyle;
  if (themeSettings.enabled) return themeSettings.productCardStyle;
  return 'standard';
}

export function resolveThemePrimaryColor(theme: Record<string, unknown> | undefined): string | null {
  const ts = extractThemeSettingsFromTheme(theme);
  if (ts.enabled && ts.primaryColor.trim()) return ts.primaryColor.trim();
  const legacy = theme?.primaryColor;
  return typeof legacy === 'string' && legacy.trim() ? legacy.trim() : null;
}

export function mapThemeProductCardVariant(style: ThemeProductCardStyle | string): 'card' | 'plain' {
  if (style === 'plain' || style === 'compact') return 'plain';
  return 'card';
}
