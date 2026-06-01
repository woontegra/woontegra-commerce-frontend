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

export function parseOverlayOpacity(value: unknown, fallback = 30): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

export function hexToRgba(hex: string, opacityPercent: number): string {
  const trimmed = hex.trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(trimmed);
  if (!match) {
    return `rgba(0, 0, 0, ${opacityPercent / 100})`;
  }
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacityPercent / 100})`;
}

export function cssBackgroundPosition(position: string): string {
  switch (position) {
    case 'top':
      return 'center top';
    case 'bottom':
      return 'center bottom';
    case 'left':
      return 'left center';
    case 'right':
      return 'right center';
    default:
      return 'center center';
  }
}

export function resolveHeroHeightMode(settings: Record<string, unknown>): string {
  return str(settings, 'heightMode', str(settings, 'height', 'medium'));
}

export function resolveHeroContentAlign(settings: Record<string, unknown>): string {
  return str(settings, 'contentAlign', str(settings, 'alignment', 'center'));
}

export function resolveHeroBackgroundType(settings: Record<string, unknown>, hasImage: boolean): string {
  const raw = str(settings, 'backgroundType', hasImage ? 'image' : 'gradient');
  if (raw === 'solid') return 'color';
  if (raw === 'color') return 'color';
  if (raw === 'image') return 'image';
  return raw;
}

/** Hero görseli: imageUrl varsa bas; yalnızca düz renk modunda görseli gizle. */
export function shouldRenderHeroImage(
  settings: Record<string, unknown>,
  imageUrl: string | null,
): boolean {
  const hasImage = !!imageUrl?.trim();
  if (!hasImage) return false;
  const bgType = resolveHeroBackgroundType(settings, true);
  return bgType !== 'color';
}

export function heroHeightModeClass(heightMode: string): string {
  switch (heightMode) {
    case 'small':
      return 'min-h-[280px] sm:min-h-[320px]';
    case 'fullscreen':
      return 'min-h-[85vh] sm:min-h-screen';
    case 'large':
      return 'min-h-[480px] sm:min-h-[560px]';
    default:
      return 'min-h-[360px] sm:min-h-[420px]';
  }
}

/** @deprecated use heroHeightModeClass */
export function heroHeightClass(height: string): string {
  return heroHeightModeClass(height);
}

export function heroWidthModeClass(widthMode: string): string {
  switch (widthMode) {
    case 'narrow':
      return 'store-container-narrow mx-auto w-full';
    case 'container':
      return 'store-container mx-auto w-full';
    default:
      return 'w-full';
  }
}

export function heroVerticalJustifyClass(verticalAlign: string): string {
  switch (verticalAlign) {
    case 'top':
      return 'justify-start';
    case 'bottom':
      return 'justify-end';
    default:
      return 'justify-center';
  }
}

export function heroAlignClass(alignment: string): string {
  if (alignment === 'left') return 'text-left items-start';
  if (alignment === 'right') return 'text-right items-end';
  return 'text-center items-center';
}

export function sectionWidthClass(widthMode: string): string {
  switch (widthMode) {
    case 'full':
      return 'w-full px-4';
    case 'narrow':
      return 'store-container-narrow mx-auto w-full px-4';
    default:
      return 'store-container mx-auto w-full px-4';
  }
}

export function featuredGridColumnsClass(columns: number): string {
  if (columns === 2) return 'grid-cols-2';
  if (columns === 3) return 'grid-cols-2 sm:grid-cols-3';
  if (columns === 5) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';
  if (columns === 4) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
}

export function mapProductCardVariant(cardStyle: string): 'card' | 'plain' {
  if (cardStyle === 'plain' || cardStyle === 'compact') return 'plain';
  return 'card';
}

export type HeroLayerProps = {
  heightClass: string;
  widthClass: string;
  verticalJustifyClass: string;
  textColor: string;
  alignClass: string;
  baseStyle?: Record<string, string>;
  imageLayerStyle?: Record<string, string>;
  showOverlay: boolean;
  overlayStyle?: Record<string, string>;
};

export function buildHeroLayerProps(
  settings: Record<string, unknown>,
  themePrimary: string | null,
  imageUrl: string | null,
): HeroLayerProps {
  const hasImage = !!imageUrl?.trim();
  const bgType = resolveHeroBackgroundType(settings, hasImage);
  const bgColor = str(settings, 'backgroundColor', themePrimary ?? '#4f46e5').trim() || '#4f46e5';
  const textColor = str(settings, 'textColor', '#ffffff');
  const alignment = resolveHeroContentAlign(settings);
  const imageFit = str(settings, 'imageFit', 'cover');
  const imagePosition = str(settings, 'imagePosition', 'center');
  const overlayEnabled = bool(settings, 'overlayEnabled', false);
  const overlayColor = str(settings, 'overlayColor', '#000000');
  const overlayOpacity = parseOverlayOpacity(settings.overlayOpacity, 0);
  const heightMode = resolveHeroHeightMode(settings);
  const widthMode = str(settings, 'widthMode', 'full');
  const verticalAlign = str(settings, 'contentVerticalAlign', 'center');

  const useImage = shouldRenderHeroImage(settings, imageUrl);
  const escapedUrl = imageUrl ? imageUrl.replace(/"/g, '\\"') : '';

  let baseStyle: Record<string, string> | undefined;
  if (!useImage) {
    if (bgType === 'color') {
      baseStyle = { backgroundColor: bgColor };
    } else {
      baseStyle = { background: `linear-gradient(135deg, ${bgColor}, #6366f1)` };
    }
  } else if (imageFit === 'contain') {
    baseStyle = { backgroundColor: bgColor };
  }

  let imageLayerStyle: Record<string, string> | undefined;
  if (useImage && escapedUrl) {
    imageLayerStyle = {
      backgroundImage: `url("${escapedUrl}")`,
      backgroundSize: imageFit === 'contain' ? 'contain' : 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: cssBackgroundPosition(imagePosition),
    };
  }

  const showOverlay = useImage && overlayEnabled && overlayOpacity > 0;

  return {
    heightClass: heroHeightModeClass(heightMode),
    widthClass: heroWidthModeClass(widthMode),
    verticalJustifyClass: heroVerticalJustifyClass(verticalAlign),
    textColor,
    alignClass: heroAlignClass(alignment),
    baseStyle,
    imageLayerStyle,
    showOverlay,
    overlayStyle: showOverlay
      ? { backgroundColor: hexToRgba(overlayColor, overlayOpacity) }
      : undefined,
  };
}

export type BannerImageLayerProps = {
  imageLayerStyle?: Record<string, string>;
  showOverlay: boolean;
  overlayStyle?: Record<string, string>;
};

export function buildBannerImageLayerProps(
  settings: Record<string, unknown>,
  imageUrl: string | null,
): BannerImageLayerProps {
  const imageFit = str(settings, 'imageFit', 'cover');
  const imagePosition = str(settings, 'imagePosition', 'right');
  const overlayEnabled = bool(settings, 'overlayEnabled', false);
  const overlayColor = str(settings, 'overlayColor', str(settings, 'backgroundColor', '#fffbeb'));
  const overlayOpacity = parseOverlayOpacity(settings.overlayOpacity, 25);

  if (!imageUrl) {
    return { showOverlay: false };
  }

  const escapedUrl = imageUrl.replace(/"/g, '\\"');
  const imageLayerStyle: Record<string, string> = {
    backgroundImage: `url("${escapedUrl}")`,
    backgroundSize: imageFit === 'contain' ? 'contain' : 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: cssBackgroundPosition(imagePosition),
  };

  const showOverlay = overlayEnabled && overlayOpacity > 0;

  return {
    imageLayerStyle,
    showOverlay,
    overlayStyle: showOverlay
      ? { backgroundColor: hexToRgba(overlayColor, overlayOpacity) }
      : undefined,
  };
}

export function bannerHeightClass(heightMode: string): string {
  switch (heightMode) {
    case 'small':
      return 'min-h-[160px]';
    case 'large':
      return 'min-h-[320px]';
    default:
      return 'min-h-[220px]';
  }
}

export function objectFitClass(imageFit: string): string {
  return imageFit === 'contain' ? 'object-contain' : 'object-cover';
}
