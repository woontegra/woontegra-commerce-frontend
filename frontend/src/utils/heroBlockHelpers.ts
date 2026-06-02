import { normalizeImageUrl } from './imageUtils';
import {
  buildHeroLayerProps,
  hexToRgba,
  parseOverlayOpacity,
  shouldRenderHeroImage,
} from './storefrontImageLayout';
import {
  HERO_HEIGHT_PRESETS,
  type HeroContentPlacement,
  type HeroFocalPoint,
  type HeroHeightPreset,
  type HeroOverlayPreset,
  type HeroPreviewViewport,
} from './heroBuilderConstants';
import { mergeHeroSliderSettings } from './heroSliderHelpers';

function str(settings: Record<string, unknown>, key: string, fallback = ''): string {
  const v = settings[key];
  if (v == null) return fallback;
  return String(v);
}

function bool(settings: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = settings[key];
  if (v === undefined || v === null) return fallback;
  return Boolean(v);
}

function num(settings: Record<string, unknown>, key: string, fallback: number): number {
  const v = settings[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function buildImageLayerStyle(
  settings: Record<string, unknown>,
  imageUrl: string | null,
  themePrimary: string | null,
): Record<string, string> | undefined {
  if (!imageUrl?.trim() || !shouldRenderHeroImage(settings, imageUrl)) return undefined;
  const focal = str(settings, 'imageFocalPoint') || str(settings, 'imagePosition', 'center');
  const layers = buildHeroLayerProps(
    { ...settings, imagePosition: focal },
    themePrimary,
    imageUrl,
  );
  if (!layers.imageLayerStyle) return undefined;
  return { ...layers.imageLayerStyle, backgroundPosition: focalPointToCss(focal) };
}

export function normalizeFocalPoint(raw: string): HeroFocalPoint {
  const aliases: Record<string, HeroFocalPoint> = {
    'top-left': 'top-left',
    'top-center': 'top',
    top: 'top',
    'top-right': 'top-right',
    left: 'left',
    'center-left': 'left',
    center: 'center',
    right: 'right',
    'center-right': 'right',
    'bottom-left': 'bottom-left',
    'bottom-center': 'bottom',
    bottom: 'bottom',
    'bottom-right': 'bottom-right',
  };
  return aliases[raw] ?? 'center';
}

export function normalizeContentPlacement(raw: string): HeroContentPlacement {
  const aliases: Record<string, HeroContentPlacement> = {
    'top-left': 'top-left',
    'top-center': 'top-center',
    top: 'top-center',
    'top-right': 'top-right',
    'center-left': 'center-left',
    left: 'center-left',
    center: 'center',
    'center-right': 'center-right',
    right: 'center-right',
    'bottom-left': 'bottom-left',
    'bottom-center': 'bottom-center',
    bottom: 'bottom-center',
    'bottom-right': 'bottom-right',
  };
  return aliases[raw] ?? 'center';
}

export function focalPointToCss(point: string): string {
  const p = normalizeFocalPoint(point);
  const map: Record<HeroFocalPoint, string> = {
    'top-left': 'left top',
    top: 'center top',
    'top-right': 'right top',
    left: 'left center',
    center: 'center center',
    right: 'right center',
    'bottom-left': 'left bottom',
    bottom: 'center bottom',
    'bottom-right': 'right bottom',
    'center-left': 'left center',
    'center-right': 'right center',
    'top-center': 'center top',
    'bottom-center': 'center bottom',
  };
  return map[p] ?? 'center center';
}

export function legacyAlignToPlacement(
  contentAlign: string,
  contentVerticalAlign: string,
): HeroContentPlacement {
  const v = contentVerticalAlign === 'top' ? 'top' : contentVerticalAlign === 'bottom' ? 'bottom' : 'center';
  const h = contentAlign === 'left' ? 'left' : contentAlign === 'right' ? 'right' : 'center';
  if (v === 'center' && h === 'center') return 'center';
  if (v === 'center') return h === 'left' ? 'center-left' : 'center-right';
  if (h === 'center') return v === 'top' ? 'top-center' : 'bottom-center';
  return `${v}-${h}` as HeroContentPlacement;
}

export function placementToLegacyAlign(placement: HeroContentPlacement): {
  contentAlign: string;
  contentVerticalAlign: string;
} {
  switch (placement) {
    case 'top-left':
      return { contentAlign: 'left', contentVerticalAlign: 'top' };
    case 'top-center':
      return { contentAlign: 'center', contentVerticalAlign: 'top' };
    case 'top-right':
      return { contentAlign: 'right', contentVerticalAlign: 'top' };
    case 'center-left':
      return { contentAlign: 'left', contentVerticalAlign: 'center' };
    case 'center-right':
      return { contentAlign: 'right', contentVerticalAlign: 'center' };
    case 'bottom-left':
      return { contentAlign: 'left', contentVerticalAlign: 'bottom' };
    case 'bottom-center':
      return { contentAlign: 'center', contentVerticalAlign: 'bottom' };
    case 'bottom-right':
      return { contentAlign: 'right', contentVerticalAlign: 'bottom' };
    default:
      return { contentAlign: 'center', contentVerticalAlign: 'center' };
  }
}

export function resolveHeightPreset(settings: Record<string, unknown>): HeroHeightPreset {
  const custom = bool(settings, 'heightCustomEnabled', false);
  if (custom || str(settings, 'heightPreset') === 'custom') return 'custom';
  const preset = str(settings, 'heightPreset', '');
  if (preset === 'fullscreen') return 'fullscreen';
  if (preset && preset in HERO_HEIGHT_PRESETS) return preset as HeroHeightPreset;
  return normalizeLegacyHeightPreset(str(settings, 'heightMode', str(settings, 'height', 'wide')));
}

function normalizeLegacyHeightPreset(mode: string): HeroHeightPreset {
  switch (mode) {
    case 'small':
    case 'compact':
      return 'compact';
    case 'medium':
    case 'standard':
      return 'standard';
    case 'large':
      return 'large';
    case 'fullscreen':
      return 'fullscreen';
    default:
      return 'wide';
  }
}

export function resolveHeroHeights(settings: Record<string, unknown>): {
  preset: HeroHeightPreset;
  desktop: number;
  tablet: number;
  mobile: number;
  fullscreen: boolean;
} {
  const preset = resolveHeightPreset(settings);
  if (preset === 'fullscreen') {
    return { preset, desktop: 0, tablet: 0, mobile: 0, fullscreen: true };
  }
  if (preset === 'custom') {
    return {
      preset,
      desktop: clamp(num(settings, 'heightDesktopPx', num(settings, 'heightPx', 700)), 320, 1000),
      tablet: clamp(num(settings, 'heightTabletPx', 560), 280, 800),
      mobile: clamp(num(settings, 'heightMobilePx', 460), 260, 600),
      fullscreen: false,
    };
  }
  const p = HERO_HEIGHT_PRESETS[preset as keyof typeof HERO_HEIGHT_PRESETS];
  return {
    preset,
    desktop: p.desktop,
    tablet: p.tablet,
    mobile: p.mobile,
    fullscreen: false,
  };
}

export function heroHeightStyle(
  settings: Record<string, unknown>,
  previewViewport?: HeroPreviewViewport,
): { className: string; style: import('react').CSSProperties } {
  const heights = resolveHeroHeights(settings);
  if (heights.fullscreen) {
    if (previewViewport) {
      return {
        className: '',
        style: { minHeight: previewViewport === 'mobile' ? '80vh' : 'calc(100vh - 4rem)' },
      };
    }
    return { className: 'hero-block-height hero-block-height--fullscreen', style: {} };
  }
  if (previewViewport) {
    const px =
      previewViewport === 'mobile'
        ? heights.mobile
        : previewViewport === 'tablet'
          ? heights.tablet
          : heights.desktop;
    return { className: '', style: { minHeight: `${px}px` } };
  }
  return {
    className: 'hero-block-height',
    style: {
      ['--hero-h-mobile' as string]: `${heights.mobile}px`,
      ['--hero-h-tablet' as string]: `${heights.tablet}px`,
      ['--hero-h-desktop' as string]: `${heights.desktop}px`,
    },
  };
}

export function resolveHeroImageUrls(
  _settings: Record<string, unknown>,
  desktopUrl: string | null,
  mobileUrl: string | null,
  previewViewport?: HeroPreviewViewport,
): { desktop: string | null; mobile: string | null; preview: string | null } {
  const desktop = desktopUrl?.trim() || null;
  const mobile = mobileUrl?.trim() || null;
  if (previewViewport === 'mobile') {
    return { desktop, mobile, preview: mobile || desktop };
  }
  if (previewViewport) {
    return { desktop, mobile, preview: desktop };
  }
  return { desktop, mobile, preview: null };
}

export function contentPlacementClasses(placement: HeroContentPlacement): {
  outer: string;
  inner: string;
  text: string;
} {
  const p = normalizeContentPlacement(placement);
  const text =
    p.endsWith('left') || p === 'center-left'
      ? 'text-left'
      : p.endsWith('right') || p === 'center-right'
        ? 'text-right'
        : 'text-center';
  const items =
    p.includes('left') ? 'items-start' : p.includes('right') ? 'items-end' : 'items-center';
  const justify = p.startsWith('top')
    ? 'justify-start'
    : p.startsWith('bottom')
      ? 'justify-end'
      : 'justify-center';
  return {
    outer: `flex-1 flex flex-col ${justify} w-full min-h-[inherit]`,
    inner: `flex flex-col ${items} ${text}`,
    text,
  };
}

export function resolveContentMaxWidth(settings: Record<string, unknown>): {
  className: string;
  style?: import('react').CSSProperties;
} {
  const preset = str(settings, 'contentWidthPreset', str(settings, 'contentWidth', 'medium'));
  const customPx = clamp(num(settings, 'contentMaxWidthPx', 720), 280, 1400);
  if (preset === 'full') return { className: 'w-full max-w-none' };
  if (preset === 'custom') return { className: 'w-full', style: { maxWidth: `${customPx}px` } };
  const map: Record<string, string> = {
    narrow: 'max-w-md',
    sm: 'max-w-md',
    medium: 'max-w-2xl',
    md: 'max-w-2xl',
    wide: 'max-w-4xl',
    lg: 'max-w-4xl',
  };
  const widths: Record<string, number> = { narrow: 480, medium: 720, wide: 960 };
  if (preset in map) {
    return { className: `w-full ${map[preset]}`, style: { maxWidth: `${widths[preset] ?? customPx}px` } };
  }
  return { className: 'w-full max-w-2xl', style: { maxWidth: '720px' } };
}

export function resolveHeroOverlay(settings: Record<string, unknown>, themePrimary: string | null = null): {
  show: boolean;
  style?: Record<string, string>;
} {
  const imageTone = str(settings, 'imageTone', 'original');
  const overlayPreset = str(settings, 'overlayPreset', 'none') as HeroOverlayPreset;

  if (overlayPreset === 'none' && imageTone === 'original') {
    if (!bool(settings, 'overlayEnabled', false)) return { show: false };
  }

  let enabled = bool(settings, 'overlayEnabled', false);
  let opacity = parseOverlayOpacity(settings.overlayOpacity, 0);
  let color = str(settings, 'overlayColor', '#000000');

  if (overlayPreset !== 'none' && overlayPreset !== 'custom') {
    const presets: Record<string, { color: string; opacity: number }> = {
      softDark: { color: '#000000', opacity: 20 },
      mediumDark: { color: '#000000', opacity: 40 },
      brand: { color: themePrimary || str(settings, 'backgroundColor', '#4f46e5'), opacity: 35 },
    };
    const p = presets[overlayPreset];
    if (p) {
      enabled = true;
      color = p.color;
      opacity = p.opacity;
    }
  }

  if (imageTone === 'dimmed') {
    enabled = true;
    if (opacity <= 0) opacity = 25;
    color = color || '#000000';
  } else if (imageTone === 'customOverlay') {
    enabled = true;
    if (opacity <= 0) opacity = 30;
  } else if (imageTone === 'original') {
    if (overlayPreset === 'none' && !bool(settings, 'overlayEnabled', false)) {
      return { show: false };
    }
  }

  if (!enabled || opacity <= 0) return { show: false };
  return { show: true, style: { backgroundColor: hexToRgba(color, opacity) } };
}

export function heroTitleStyle(settings: Record<string, unknown>): import('react').CSSProperties {
  const preset = str(settings, 'titleSizePreset', str(settings, 'titleSize', 'md'));
  const sizes: Record<string, string> = {
    sm: '1.75rem',
    md: '2.25rem',
    lg: '3rem',
    hero: '3.75rem',
  };
  const style: import('react').CSSProperties = {
    color: str(settings, 'titleColor', str(settings, 'textColor', '#ffffff')),
  };
  if (preset === 'custom') {
    style.fontSize = `${clamp(num(settings, 'titleFontSizePx', 36), 16, 96)}px`;
  } else if (sizes[preset]) {
    style.fontSize = sizes[preset];
  }
  const lh = num(settings, 'titleLineHeight', 0);
  if (lh > 0) style.lineHeight = lh;
  const ls = num(settings, 'titleLetterSpacing', 0);
  if (ls !== 0) style.letterSpacing = `${ls}px`;
  return style;
}

export function heroSubtitleStyle(settings: Record<string, unknown>): import('react').CSSProperties {
  const preset = str(settings, 'subtitleSizePreset', str(settings, 'subtitleSize', 'md'));
  const sizes: Record<string, string> = { sm: '0.875rem', md: '1rem', lg: '1.125rem' };
  const style: import('react').CSSProperties = {
    color: str(settings, 'subtitleColor', str(settings, 'textColor', '#ffffff')),
  };
  if (preset === 'custom') {
    style.fontSize = `${clamp(num(settings, 'subtitleFontSizePx', 16), 12, 48)}px`;
  } else if (sizes[preset]) {
    style.fontSize = sizes[preset];
  }
  return style;
}

export function heroFontWeightClass(weight: string): string {
  if (weight === 'normal') return 'font-normal';
  if (weight === 'semibold') return 'font-semibold';
  return 'font-bold';
}

export function heroButtonRadiusClass(radius: string): string {
  if (radius === 'sharp' || radius === 'sm') return 'rounded-none';
  if (radius === 'pill') return 'rounded-full';
  return 'rounded-xl';
}

export function heroButtonSizeClass(size: string): string {
  if (size === 'sm') return 'px-3.5 py-2 text-xs';
  if (size === 'lg') return 'px-6 py-3 text-base';
  return 'px-5 py-2.5 text-sm';
}

export type HeroButtonStyle = {
  show: boolean;
  text: string;
  href: string;
  variant: string;
  bgColor: string;
  textColor: string;
  radius: string;
  size: string;
};

export type HeroContentProps = {
  title: string;
  subtitle: string;
  titleWeightClass: string;
  subtitleClass: string;
  titleStyle: import('react').CSSProperties;
  subtitleStyle: import('react').CSSProperties;
  placement: ReturnType<typeof contentPlacementClasses>;
  contentWidth: ReturnType<typeof resolveContentMaxWidth>;
  contentBoxClass: string;
  contentBoxStyle?: Record<string, string>;
  buttonRowClass: string;
  primaryButton: HeroButtonStyle;
  secondaryButton: HeroButtonStyle;
};

export function buildHeroContentProps(
  settings: Record<string, unknown>,
  resolveHref: (path: string) => string,
): HeroContentProps {
  const placementRaw = str(settings, 'contentPlacement');
  const placement = contentPlacementClasses(
    placementRaw
      ? normalizeContentPlacement(placementRaw)
      : legacyAlignToPlacement(
          str(settings, 'contentAlign', str(settings, 'alignment', 'center')),
          str(settings, 'contentVerticalAlign', 'center'),
        ),
  );

  const primaryText = str(settings, 'primaryButtonText', str(settings, 'buttonText', ''));
  const primaryUrl = str(settings, 'primaryButtonUrl', str(settings, 'buttonUrl', '/store/urunler'));
  const primaryEnabled =
    settings.primaryButtonEnabled !== undefined
      ? bool(settings, 'primaryButtonEnabled', true)
      : !!primaryText.trim();

  const secondaryText = str(settings, 'secondaryButtonText', '');
  const secondaryUrl = str(settings, 'secondaryButtonUrl', '');
  const secondaryEnabled = bool(settings, 'secondaryButtonEnabled', false) && !!secondaryText.trim();

  const contentBoxEnabled = bool(settings, 'contentBoxEnabled', false);
  const contentBoxStyleVal = str(settings, 'contentBoxStyle', 'none');
  const contentBoxOpacity = parseOverlayOpacity(settings.contentBoxOpacity, 40);

  let contentBoxClass = '';
  let contentBoxInlineStyle: Record<string, string> | undefined;
  if (contentBoxEnabled && contentBoxStyleVal !== 'none') {
    contentBoxClass = 'rounded-2xl px-6 py-5 sm:px-8 sm:py-6';
    if (contentBoxStyleVal === 'glass') contentBoxClass += ' backdrop-blur-md';
    contentBoxInlineStyle = {
      backgroundColor: hexToRgba(str(settings, 'contentBoxColor', '#000000'), contentBoxOpacity),
    };
  }

  const btnAlign = str(settings, 'buttonGroupAlign', 'center');
  const buttonRowClass =
    btnAlign === 'left' ? 'justify-start' : btnAlign === 'right' ? 'justify-end' : 'justify-center';

  return {
    title: str(settings, 'title', 'Hoş geldiniz'),
    subtitle: str(settings, 'subtitle'),
    titleWeightClass: heroFontWeightClass(str(settings, 'titleWeight', 'bold')),
    subtitleClass: 'mt-3',
    titleStyle: heroTitleStyle(settings),
    subtitleStyle: heroSubtitleStyle(settings),
    placement,
    contentWidth: resolveContentMaxWidth(settings),
    contentBoxClass,
    contentBoxStyle: contentBoxInlineStyle,
    buttonRowClass,
    primaryButton: {
      show: primaryEnabled && !!primaryText.trim(),
      text: primaryText,
      href: resolveHref(primaryUrl),
      variant: str(settings, 'primaryButtonVariant', 'solid'),
      bgColor: str(settings, 'primaryButtonBgColor', '#ffffff'),
      textColor: str(settings, 'primaryButtonTextColor', '#4f46e5'),
      radius: str(settings, 'primaryButtonRadius', 'soft'),
      size: str(settings, 'primaryButtonSize', 'md'),
    },
    secondaryButton: {
      show: secondaryEnabled,
      text: secondaryText,
      href: secondaryUrl ? resolveHref(secondaryUrl) : '',
      variant: str(settings, 'secondaryButtonVariant', 'outline'),
      bgColor: str(settings, 'secondaryButtonBgColor', 'transparent'),
      textColor: str(settings, 'secondaryButtonTextColor', '#ffffff'),
      radius: str(settings, 'secondaryButtonRadius', str(settings, 'primaryButtonRadius', 'soft')),
      size: str(settings, 'secondaryButtonSize', 'md'),
    },
  };
}

export function heroButtonClassName(variant: string, radius: string, size: string): string {
  const base = `inline-flex font-semibold transition-opacity hover:opacity-90 ${heroButtonRadiusClass(radius)} ${heroButtonSizeClass(size)}`;
  if (variant === 'outline') return `${base} border-2 bg-transparent`;
  if (variant === 'link' || variant === 'minimal') {
    return `inline-flex font-semibold underline underline-offset-2 hover:opacity-80 ${heroButtonSizeClass(size)}`;
  }
  return `${base} shadow-sm`;
}

export function heroButtonInlineStyle(btn: HeroButtonStyle): Record<string, string> {
  if (btn.variant === 'link' || btn.variant === 'minimal') return { color: btn.textColor };
  if (btn.variant === 'outline') {
    return { color: btn.textColor, borderColor: btn.textColor, backgroundColor: 'transparent' };
  }
  return { backgroundColor: btn.bgColor, color: btn.textColor };
}

export function buildHeroVisualLayers(
  settings: Record<string, unknown>,
  themePrimary: string | null,
  desktopImageUrl: string | null,
  mobileImageUrl: string | null,
  previewViewport?: HeroPreviewViewport,
) {
  const urls = resolveHeroImageUrls(settings, desktopImageUrl, mobileImageUrl, previewViewport);
  const merged = { ...settings };
  const focal = str(settings, 'imageFocalPoint') || str(settings, 'imagePosition', 'center');
  merged.imagePosition = focal;

  const previewSingle = previewViewport ? urls.preview : null;
  const desktopLayer = previewSingle
    ? buildImageLayerStyle(settings, previewSingle, themePrimary)
    : buildImageLayerStyle(settings, urls.desktop, themePrimary);
  const mobileLayer =
    !previewViewport && urls.mobile
      ? buildImageLayerStyle(settings, urls.mobile, themePrimary)
      : undefined;

  const baseLayers = buildHeroLayerProps(merged, themePrimary, previewSingle || urls.desktop || urls.mobile);
  const overlay = resolveHeroOverlay(settings, themePrimary);

  return {
    baseStyle: baseLayers.baseStyle,
    desktopImageLayerStyle: desktopLayer,
    mobileImageLayerStyle: mobileLayer,
    useResponsiveImages: !previewViewport && !!urls.desktop,
    showOverlay: overlay.show,
    overlayStyle: overlay.style,
    widthClass: baseLayers.widthClass,
  };
}

export function buildHeroBlockModel(props: {
  settings: Record<string, unknown>;
  desktopImageUrl: string | null;
  mobileImageUrl: string | null;
  themePrimary: string | null;
  resolveHref: (path: string) => string;
  previewViewport?: HeroPreviewViewport;
}) {
  const { settings, desktopImageUrl, mobileImageUrl, themePrimary, resolveHref, previewViewport } = props;
  const visual = buildHeroVisualLayers(
    settings,
    themePrimary,
    desktopImageUrl,
    mobileImageUrl,
    previewViewport,
  );
  const content = buildHeroContentProps(settings, resolveHref);
  const height = heroHeightStyle(settings, previewViewport);
  const widthMode = str(settings, 'widthMode', 'full');

  return {
    visual,
    content,
    height,
    widthMode,
    sectionShell:
      widthMode === 'full'
        ? 'relative overflow-hidden w-full flex flex-col'
        : `relative overflow-hidden rounded-2xl flex flex-col ${visual.widthClass}`,
  };
}

export function mergeHeroSettings(raw: Record<string, unknown>, merged: Record<string, unknown>): Record<string, unknown> {
  if (!str(merged, 'primaryButtonText') && str(merged, 'buttonText')) {
    merged.primaryButtonText = merged.buttonText;
  }
  if (!str(merged, 'primaryButtonUrl') && str(merged, 'buttonUrl')) {
    merged.primaryButtonUrl = merged.buttonUrl;
  }
  if (merged.primaryButtonEnabled === undefined && str(merged, 'buttonText')) {
    merged.primaryButtonEnabled = true;
  }
  if (!str(merged, 'titleColor') && str(merged, 'textColor')) {
    merged.titleColor = merged.textColor;
  }
  if (!str(merged, 'subtitleColor')) {
    merged.subtitleColor = str(merged, 'titleColor') || str(merged, 'textColor', '#ffffff');
  }
  if (raw.imageTone === undefined) merged.imageTone = 'original';
  if (raw.overlayEnabled === undefined && raw.overlayPreset === undefined) {
    merged.overlayEnabled = false;
    merged.overlayOpacity = 0;
    merged.overlayPreset = 'none';
  }
  if (raw.overlayColor === undefined) merged.overlayColor = '#000000';
  if (raw.mobileImageUrl === undefined) merged.mobileImageUrl = '';

  if (!raw.heightPreset && !raw.heightCustomEnabled) {
    merged.heightPreset = normalizeLegacyHeightPreset(str(merged, 'heightMode', str(merged, 'height', 'wide')));
  }
  if (raw.heightDesktopPx === undefined) {
    const h = resolveHeroHeights({ ...merged, heightPreset: merged.heightPreset ?? 'wide' });
    merged.heightDesktopPx = h.desktop;
    merged.heightTabletPx = h.tablet;
    merged.heightMobilePx = h.mobile;
    merged.heightPx = h.desktop;
  }

  if (!raw.contentPlacement) {
    merged.contentPlacement = legacyAlignToPlacement(
      str(merged, 'contentAlign', str(merged, 'alignment', 'center')),
      str(merged, 'contentVerticalAlign', 'center'),
    );
  }

  if (!raw.imageFocalPoint && str(merged, 'imagePosition')) {
    merged.imageFocalPoint = normalizeFocalPoint(str(merged, 'imagePosition'));
  }

  if (!raw.contentWidthPreset && str(merged, 'contentWidth')) {
    const cw = str(merged, 'contentWidth');
    merged.contentWidthPreset = cw === 'sm' ? 'narrow' : cw === 'lg' ? 'wide' : 'medium';
  }

  if (raw.titleSizePreset === undefined && raw.titleSize) {
    merged.titleSizePreset = str(merged, 'titleSize');
  }

  const imageUrl = str(merged, 'imageUrl');
  if (imageUrl) merged.backgroundType = 'image';
  mergeHeroSliderSettings(raw, merged);
  return merged;
}

export function normalizeHeroImageUrl(url: string | null | undefined): string | null {
  return normalizeImageUrl(url ?? '') ?? null;
}

export { shouldRenderHeroImage };
