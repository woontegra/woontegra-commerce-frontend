/**
 * Storefront Theme Engine v1
 * - Preset registry (Premium Commerce)
 * - Token → CSS variable çözümlemesi
 * - Sayfa modülü (themes/registry ile uyumlu)
 */
import type { StorefrontThemeModule } from '../../themes/types';
import StorefrontLayout from '../layouts/StorefrontLayout';
import StoreHomePage from '../pages/StoreHomePage';
import StoreProductListPage from '../pages/StoreProductListPage';
import StoreProductDetailPage from '../pages/StoreProductDetailPage';

export { DEFAULT_THEME_PRESET_ID, listThemePresets, resolveThemePreset, isThemePresetId } from './registry';
export { resolveStorefrontThemeStyle, resolveThemePrimaryFromPreset, themePresetToCssVariables } from './resolveThemeStyle';
export { premiumCommercePreset } from './presets/premiumCommerce';
export type {
  ThemePreset,
  ThemePresetId,
  ThemePresetTokens,
  ThemeColorTokens,
  ThemeFontTokens,
  ThemeRadiusTokens,
  ThemeSpacingTokens,
  ThemeProductCardTokens,
  ThemeHeaderTokens,
  ThemeFooterTokens,
  ThemeMobileTokens,
} from './types';

export const defaultStorefrontTheme: StorefrontThemeModule = {
  Layout: StorefrontLayout,
  HomePage: StoreHomePage,
  ProductList: StoreProductListPage,
  ProductDetail: StoreProductDetailPage,
};

export default defaultStorefrontTheme;
