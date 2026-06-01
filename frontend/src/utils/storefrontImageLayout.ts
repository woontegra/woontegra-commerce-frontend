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
    return `rgba(79, 70, 229, ${opacityPercent / 100})`;
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

export function heroHeightClass(height: string): string {
  switch (height) {
    case 'small':
      return 'min-h-[280px] sm:min-h-[320px]';
    case 'large':
      return 'min-h-[480px] sm:min-h-[560px]';
    default:
      return 'min-h-[360px] sm:min-h-[420px]';
  }
}

export function heroAlignClass(alignment: string): string {
  if (alignment === 'left') return 'text-left items-start';
  if (alignment === 'right') return 'text-right items-end';
  return 'text-center items-center';
}

export type HeroLayerProps = {
  heightClass: string;
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
  const bgType = str(settings, 'backgroundType', 'gradient');
  const bgColor = str(settings, 'backgroundColor', themePrimary ?? '#4f46e5').trim() || '#4f46e5';
  const textColor = str(settings, 'textColor', '#ffffff');
  const alignment = str(settings, 'alignment', 'center');
  const imageFit = str(settings, 'imageFit', 'cover');
  const imagePosition = str(settings, 'imagePosition', 'center');
  const overlayEnabled = bool(settings, 'overlayEnabled', true);
  const overlayColor = str(settings, 'overlayColor', '#4f46e5');
  const overlayOpacity = parseOverlayOpacity(settings.overlayOpacity, 30);
  const height = str(settings, 'height', 'medium');

  const useImage = bgType === 'image' && !!imageUrl;
  const escapedUrl = imageUrl ? imageUrl.replace(/"/g, '\\"') : '';

  let baseStyle: Record<string, string> | undefined;
  if (!useImage) {
    if (bgType === 'solid') {
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
    heightClass: heroHeightClass(height),
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

export function objectFitClass(imageFit: string): string {
  return imageFit === 'contain' ? 'object-contain' : 'object-cover';
}
