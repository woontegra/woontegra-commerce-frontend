import { premiumCommercePreset } from './presets/premiumCommerce';
import type { ThemePreset, ThemePresetId } from './types';

export const DEFAULT_THEME_PRESET_ID: ThemePresetId = 'premium-commerce';

const presetRegistry: Record<ThemePresetId, ThemePreset> = {
  'premium-commerce': premiumCommercePreset,
  /** Eski tenant theme id — premium-commerce ile aynı preset */
  default: premiumCommercePreset,
};

export function resolveThemePreset(presetId: string | null | undefined): ThemePreset {
  const key = (presetId || DEFAULT_THEME_PRESET_ID).trim().toLowerCase();
  if (key in presetRegistry) {
    return presetRegistry[key as ThemePresetId];
  }
  return presetRegistry[DEFAULT_THEME_PRESET_ID];
}

export function listThemePresets(): ThemePreset[] {
  return [premiumCommercePreset];
}

export function isThemePresetId(value: string): value is ThemePresetId {
  return value in presetRegistry;
}
