/** Hero builder preset values and shared types (frontend-only, no backend schema). */

export type HeroHeightPreset = 'compact' | 'standard' | 'wide' | 'large' | 'fullscreen' | 'custom';
export type HeroFocalPoint =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right'
  | 'center-left'
  | 'center-right'
  | 'top-center'
  | 'bottom-center';

export type HeroContentPlacement =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type HeroOverlayPreset = 'none' | 'softDark' | 'mediumDark' | 'brand' | 'custom';

export const HERO_HEIGHT_PRESETS: Record<
  Exclude<HeroHeightPreset, 'fullscreen' | 'custom'>,
  { desktop: number; tablet: number; mobile: number; label: string }
> = {
  compact: { desktop: 420, tablet: 380, mobile: 320, label: 'Kompakt' },
  standard: { desktop: 560, tablet: 480, mobile: 400, label: 'Standart' },
  wide: { desktop: 700, tablet: 560, mobile: 460, label: 'Geniş' },
  large: { desktop: 820, tablet: 620, mobile: 480, label: 'Büyük vitrin' },
};

export const FOCAL_GRID_POINTS: { id: HeroFocalPoint; label: string }[] = [
  { id: 'top-left', label: 'Sol üst' },
  { id: 'top', label: 'Üst' },
  { id: 'top-right', label: 'Sağ üst' },
  { id: 'left', label: 'Sol' },
  { id: 'center', label: 'Merkez' },
  { id: 'right', label: 'Sağ' },
  { id: 'bottom-left', label: 'Sol alt' },
  { id: 'bottom', label: 'Alt' },
  { id: 'bottom-right', label: 'Sağ alt' },
];

export const PLACEMENT_GRID_POINTS: { id: HeroContentPlacement; label: string }[] = [
  { id: 'top-left', label: 'Sol üst' },
  { id: 'top-center', label: 'Üst orta' },
  { id: 'top-right', label: 'Sağ üst' },
  { id: 'center-left', label: 'Sol orta' },
  { id: 'center', label: 'Merkez' },
  { id: 'center-right', label: 'Sağ orta' },
  { id: 'bottom-left', label: 'Sol alt' },
  { id: 'bottom-center', label: 'Alt orta' },
  { id: 'bottom-right', label: 'Sağ alt' },
];

export const OVERLAY_PRESET_OPTIONS: { id: HeroOverlayPreset; label: string; color: string; opacity: number }[] = [
  { id: 'none', label: 'Yok', color: '#000000', opacity: 0 },
  { id: 'softDark', label: 'Hafif koyu', color: '#000000', opacity: 20 },
  { id: 'mediumDark', label: 'Orta koyu', color: '#000000', opacity: 40 },
  { id: 'brand', label: 'Marka rengi', color: '#4f46e5', opacity: 35 },
  { id: 'custom', label: 'Özel', color: '#000000', opacity: 30 },
];

export type HeroPreviewViewport = 'desktop' | 'tablet' | 'mobile';

export const PREVIEW_VIEWPORT_WIDTH: Record<HeroPreviewViewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '390px',
};
