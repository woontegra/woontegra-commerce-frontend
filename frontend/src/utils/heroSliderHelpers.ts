import type { HeroContentPlacement } from './heroBuilderConstants';
import { normalizeFocalPoint, normalizeContentPlacement } from './heroBlockHelpers';

export type HeroMode = 'single' | 'slider';
export type HeroSlideTransition = 'fade' | 'slide';

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  eyebrowText: string;
  imageUrl: string;
  mobileImageUrl: string;
  primaryButtonText: string;
  primaryButtonUrl: string;
  secondaryButtonText: string;
  secondaryButtonUrl: string;
  primaryButtonEnabled: boolean;
  secondaryButtonEnabled: boolean;
  overlayEnabled: boolean;
  overlayColor: string;
  overlayOpacity: number;
  overlayPreset: string;
  imageFocalPoint: string;
  contentPlacement: string;
  imageFit: string;
  imageTone: string;
};

export type HeroSliderSettings = {
  autoplay: boolean;
  intervalMs: number;
  showDots: boolean;
  showArrows: boolean;
  transition: HeroSlideTransition;
};

export const HERO_SLIDE_MIN = 1;
export const HERO_SLIDE_MAX = 5;

function str(settings: Record<string, unknown>, key: string, fallback = ''): string {
  const v = settings[key];
  if (v == null) return fallback;
  return String(v);
}

function bool(settings: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = settings[key];
  return v === undefined || v === null ? fallback : Boolean(v);
}

function num(settings: Record<string, unknown>, key: string, fallback: number): number {
  const v = settings[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function newHeroSlideId(): string {
  return `slide_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createSlideFromRootSettings(settings: Record<string, unknown>): HeroSlide {
  const primaryText = str(settings, 'primaryButtonText') || str(settings, 'buttonText');
  const primaryUrl = str(settings, 'primaryButtonUrl') || str(settings, 'buttonUrl', '/store/urunler');
  return {
    id: newHeroSlideId(),
    title: str(settings, 'title', 'Mağazanıza hoş geldiniz'),
    subtitle: str(settings, 'subtitle'),
    eyebrowText: str(settings, 'eyebrowText'),
    imageUrl: str(settings, 'imageUrl'),
    mobileImageUrl: str(settings, 'mobileImageUrl'),
    primaryButtonText: primaryText,
    primaryButtonUrl: primaryUrl,
    secondaryButtonText: str(settings, 'secondaryButtonText'),
    secondaryButtonUrl: str(settings, 'secondaryButtonUrl'),
    primaryButtonEnabled:
      settings.primaryButtonEnabled !== undefined
        ? bool(settings, 'primaryButtonEnabled', true)
        : !!primaryText.trim(),
    secondaryButtonEnabled: bool(settings, 'secondaryButtonEnabled', false),
    overlayEnabled: bool(settings, 'overlayEnabled', false),
    overlayColor: str(settings, 'overlayColor', '#000000'),
    overlayOpacity: num(settings, 'overlayOpacity', 0),
    overlayPreset: str(settings, 'overlayPreset', 'none'),
    imageFocalPoint: str(settings, 'imageFocalPoint', str(settings, 'imagePosition', 'center')),
    contentPlacement: str(
      settings,
      'contentPlacement',
      str(settings, 'contentAlign', 'center') === 'left'
        ? 'center-left'
        : str(settings, 'contentAlign') === 'right'
          ? 'center-right'
          : 'center',
    ),
    imageFit: str(settings, 'imageFit', 'cover'),
    imageTone: str(settings, 'imageTone', 'original'),
  };
}

export function newHeroSlide(partial?: Partial<HeroSlide>): HeroSlide {
  return {
    ...createSlideFromRootSettings({}),
    id: newHeroSlideId(),
    title: 'Yeni slide',
    ...partial,
  };
}

export function copyHeroSlide(slide: HeroSlide): HeroSlide {
  return { ...slide, id: newHeroSlideId(), title: slide.title ? `${slide.title} (kopya)` : 'Yeni slide' };
}

export function resolveHeroMode(settings: Record<string, unknown>): HeroMode {
  return str(settings, 'heroMode', 'single') === 'slider' ? 'slider' : 'single';
}

export function defaultSliderSettings(): HeroSliderSettings {
  return {
    autoplay: true,
    intervalMs: 5000,
    showDots: true,
    showArrows: true,
    transition: 'fade',
  };
}

export function resolveSliderSettings(settings: Record<string, unknown>): HeroSliderSettings {
  const raw =
    settings.sliderSettings && typeof settings.sliderSettings === 'object' && !Array.isArray(settings.sliderSettings)
      ? (settings.sliderSettings as Record<string, unknown>)
      : {};
  const d = defaultSliderSettings();
  const transition = str(raw, 'transition', d.transition);
  return {
    autoplay: raw.autoplay === undefined ? d.autoplay : bool(raw, 'autoplay', d.autoplay),
    intervalMs: Math.min(10000, Math.max(3000, num(raw, 'intervalMs', d.intervalMs))),
    showDots: raw.showDots === undefined ? d.showDots : bool(raw, 'showDots', d.showDots),
    showArrows: raw.showArrows === undefined ? d.showArrows : bool(raw, 'showArrows', d.showArrows),
    transition: transition === 'slide' ? 'slide' : 'fade',
  };
}

function parseHeroSlide(raw: unknown, index: number): HeroSlide | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = str(o, 'id') || `slide_${index}`;
  return {
    id,
    title: str(o, 'title'),
    subtitle: str(o, 'subtitle'),
    eyebrowText: str(o, 'eyebrowText'),
    imageUrl: str(o, 'imageUrl'),
    mobileImageUrl: str(o, 'mobileImageUrl'),
    primaryButtonText: str(o, 'primaryButtonText'),
    primaryButtonUrl: str(o, 'primaryButtonUrl', '/store/urunler'),
    secondaryButtonText: str(o, 'secondaryButtonText'),
    secondaryButtonUrl: str(o, 'secondaryButtonUrl'),
    primaryButtonEnabled: bool(o, 'primaryButtonEnabled', !!str(o, 'primaryButtonText')),
    secondaryButtonEnabled: bool(o, 'secondaryButtonEnabled', false),
    overlayEnabled: bool(o, 'overlayEnabled', false),
    overlayColor: str(o, 'overlayColor', '#000000'),
    overlayOpacity: num(o, 'overlayOpacity', 0),
    overlayPreset: str(o, 'overlayPreset', 'none'),
    imageFocalPoint: normalizeFocalPoint(str(o, 'imageFocalPoint', 'center')),
    contentPlacement: normalizeContentPlacement(str(o, 'contentPlacement', 'center')) as HeroContentPlacement,
    imageFit: str(o, 'imageFit', 'cover'),
    imageTone: str(o, 'imageTone', 'original'),
  };
}

export function resolveHeroSlides(settings: Record<string, unknown>): HeroSlide[] {
  const raw = settings.slides;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((item, i) => parseHeroSlide(item, i)).filter((s): s is HeroSlide => s != null);
  }
  if (str(settings, 'imageUrl') || str(settings, 'title') || str(settings, 'mobileImageUrl')) {
    return [createSlideFromRootSettings(settings)];
  }
  return [];
}

/** Slide alanlarını blok seviyesi layout/stil ayarlarıyla birleştirir. */
export function slideToHeroSettings(
  blockSettings: Record<string, unknown>,
  slide: HeroSlide,
): Record<string, unknown> {
  return {
    ...blockSettings,
    title: slide.title,
    subtitle: slide.subtitle,
    eyebrowText: slide.eyebrowText,
    imageUrl: slide.imageUrl,
    mobileImageUrl: slide.mobileImageUrl,
    primaryButtonText: slide.primaryButtonText,
    primaryButtonUrl: slide.primaryButtonUrl,
    buttonText: slide.primaryButtonText,
    buttonUrl: slide.primaryButtonUrl,
    primaryButtonEnabled: slide.primaryButtonEnabled,
    secondaryButtonText: slide.secondaryButtonText,
    secondaryButtonUrl: slide.secondaryButtonUrl,
    secondaryButtonEnabled: slide.secondaryButtonEnabled,
    overlayEnabled: slide.overlayEnabled,
    overlayColor: slide.overlayColor,
    overlayOpacity: slide.overlayOpacity,
    overlayPreset: slide.overlayPreset,
    imageFocalPoint: slide.imageFocalPoint,
    imagePosition: slide.imageFocalPoint,
    contentPlacement: slide.contentPlacement,
    imageFit: slide.imageFit,
    imageTone: slide.imageTone,
    backgroundType: slide.imageUrl ? 'image' : blockSettings.backgroundType,
  };
}

export function mergeHeroSliderSettings(
  raw: Record<string, unknown>,
  merged: Record<string, unknown>,
): Record<string, unknown> {
  if (raw.heroMode === undefined) merged.heroMode = 'single';
  if (raw.slides === undefined) merged.slides = [];
  if (raw.activeSlideId === undefined && Array.isArray(merged.slides) && merged.slides.length > 0) {
    const first = merged.slides[0] as Record<string, unknown>;
    merged.activeSlideId = String(first.id ?? '');
  }
  if (raw.sliderSettings === undefined) {
    merged.sliderSettings = defaultSliderSettings();
  } else if (merged.sliderSettings && typeof merged.sliderSettings === 'object') {
    merged.sliderSettings = {
      ...defaultSliderSettings(),
      ...(merged.sliderSettings as Record<string, unknown>),
    };
  }
  return merged;
}

export function heroSlidesToJson(slides: HeroSlide[]): Record<string, unknown>[] {
  return slides.map(s => ({ ...s }));
}

export function parseEditableSlides(settings: Record<string, unknown>): HeroSlide[] {
  const raw = settings.slides;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((item, i) => parseHeroSlide(item, i)).filter((s): s is HeroSlide => s != null);
}

/** Builder düzenlemesi için slide listesi — boşsa kök ayarlardan tek slide türetir. */
export function getSlidesForEditor(settings: Record<string, unknown>): HeroSlide[] {
  const parsed = parseEditableSlides(settings);
  if (parsed.length > 0) return parsed;
  if (resolveHeroMode(settings) === 'slider' || str(settings, 'imageUrl') || str(settings, 'title')) {
    return [createSlideFromRootSettings(settings)];
  }
  return [];
}

export function syncSlideToRoot(slide: HeroSlide): Record<string, unknown> {
  return {
    title: slide.title,
    subtitle: slide.subtitle,
    eyebrowText: slide.eyebrowText,
    imageUrl: slide.imageUrl,
    mobileImageUrl: slide.mobileImageUrl,
    primaryButtonText: slide.primaryButtonText,
    primaryButtonUrl: slide.primaryButtonUrl,
    buttonText: slide.primaryButtonText,
    buttonUrl: slide.primaryButtonUrl,
    primaryButtonEnabled: slide.primaryButtonEnabled,
    secondaryButtonText: slide.secondaryButtonText,
    secondaryButtonUrl: slide.secondaryButtonUrl,
    secondaryButtonEnabled: slide.secondaryButtonEnabled,
    overlayEnabled: slide.overlayEnabled,
    overlayColor: slide.overlayColor,
    overlayOpacity: slide.overlayOpacity,
    overlayPreset: slide.overlayPreset,
    imageFocalPoint: slide.imageFocalPoint,
    imagePosition: slide.imageFocalPoint,
    contentPlacement: slide.contentPlacement,
    imageFit: slide.imageFit,
    imageTone: slide.imageTone,
    backgroundType: slide.imageUrl ? 'image' : undefined,
  };
}

export function shouldRenderHeroSection(settings: Record<string, unknown>): boolean {
  if (resolveHeroMode(settings) !== 'slider') return true;
  return resolveHeroSlides(settings).length > 0;
}
