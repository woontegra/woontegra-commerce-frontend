import type { StorefrontThemeSettings } from '../types/storefront.types';

/** Admin tema ayarları gelene kadar varsayılanlar */
export function getDefaultThemeSettings(overrides?: Partial<StorefrontThemeSettings>): StorefrontThemeSettings {
  return {
    primaryColor:  '#1c1917',
    logoUrl:       null,
    faviconUrl:    null,
    bannerTitle:   null,
    bannerSubtitle: null,
    footerText:    null,
    socialLinks:   [],
    ...overrides,
  };
}
