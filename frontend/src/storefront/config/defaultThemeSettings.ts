import type { StorefrontThemeSettings } from '../types/storefront.types';

/** Admin tema ayarları gelene kadar varsayılanlar */
export function getDefaultThemeSettings(overrides?: Partial<StorefrontThemeSettings>): StorefrontThemeSettings {
  return {
    primaryColor:  '#4f46e5',
    logoUrl:       null,
    faviconUrl:    null,
    bannerTitle:   null,
    bannerSubtitle: null,
    footerText:    null,
    socialLinks:   [],
    ...overrides,
  };
}
