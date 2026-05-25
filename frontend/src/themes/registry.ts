import type { StorefrontThemeModule } from './types';
import * as defaultTheme from './default';

const registry: Record<string, StorefrontThemeModule> = {
  default: defaultTheme,
};

/**
 * Kiracı `theme` alanına göre vitrin paketi; bilinmeyen isimde `default`.
 */
export function resolveTheme(themeId: string | null | undefined): StorefrontThemeModule {
  const key = (themeId || 'default').trim().toLowerCase();
  return registry[key] ?? registry.default;
}
