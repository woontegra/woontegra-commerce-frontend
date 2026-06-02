import type { ThemeSettings } from '../../utils/themeSettingsHelpers';
import { resolveThemePreset } from './registry';
import type { ThemePreset, ThemePresetId } from './types';

export function themePresetToCssVariables(preset: ThemePreset): Record<string, string> {
  const { colors, fonts, radius, spacing, productCard, header, footer, mobile } = preset.tokens;

  return {
    '--store-primary': colors.primary,
    '--store-secondary': colors.secondary,
    '--store-bg': colors.background,
    '--store-surface': colors.surface,
    '--store-text': colors.text,
    '--store-text-muted': colors.textMuted,
    '--store-border': colors.border,
    '--store-accent': colors.accent,
    '--store-accent-soft': colors.accentSoft,
    '--store-font-family': fonts.family,
    '--store-button-radius': radius.button,
    '--store-card-radius': radius.card,
    '--store-container-max': spacing.containerMax,
    '--store-container-products': spacing.containerProducts,
    '--store-section-spacing': spacing.section,
    '--store-product-card-style': productCard.style,
    '--store-product-card-aspect': productCard.mediaAspectRatio,
    '--store-product-card-mobile-max-h': productCard.mobileMediaMaxHeight,
    '--store-header-bg': header.background,
    '--store-header-text': header.text,
    '--store-header-height': header.height,
    '--store-header-mobile-height': header.mobileHeight,
    '--store-footer-bg': footer.background,
    '--store-footer-text': footer.text,
    '--store-mobile-section-spacing': mobile.sectionSpacing,
    '--store-mobile-card-radius': mobile.cardRadius,
    '--store-bottom-nav-offset': mobile.bottomNavOffset,
    '--store-mobile-product-grid-gap': mobile.productGridGap,
    '--store-hero-gradient':
      'linear-gradient(145deg, #141312 0%, #1c1917 38%, #292524 72%, #44403c 100%)',
    '--store-hero-gradient-soft':
      'linear-gradient(160deg, #faf9f7 0%, #f5f5f4 45%, #eceae7 100%)',
  };
}

function builderOverridesToCssVariables(settings: ThemeSettings): Record<string, string> {
  const vars: Record<string, string> = {
    '--store-primary': settings.primaryColor,
    '--store-secondary': settings.secondaryColor,
    '--store-bg': settings.backgroundColor,
    '--store-text': settings.textColor,
    '--store-button-radius': `${settings.buttonRadius}px`,
    '--store-card-radius': `${settings.cardRadius}px`,
    '--store-container-max': `${settings.containerMaxWidthPx}px`,
    '--store-section-spacing': `${settings.sectionSpacingPx}px`,
    '--store-product-card-style': settings.productCardStyle,
  };

  if (settings.fontFamily && settings.fontFamily !== 'system') {
    vars['--store-font-family'] = settings.fontFamily;
  }

  return vars;
}

/**
 * Preset tokenları uygular; builder themeSettings.enabled ise ilgili alanları override eder.
 */
export function resolveStorefrontThemeStyle(
  presetId: ThemePresetId | string,
  builderSettings: ThemeSettings,
): Record<string, string> {
  const preset = resolveThemePreset(presetId);
  const base = themePresetToCssVariables(preset);

  if (!builderSettings.enabled) {
    return base;
  }

  return { ...base, ...builderOverridesToCssVariables(builderSettings) };
}

export function resolveThemePrimaryFromPreset(
  presetId: ThemePresetId | string,
  builderSettings: ThemeSettings,
): string {
  if (builderSettings.enabled && builderSettings.primaryColor.trim()) {
    return builderSettings.primaryColor.trim();
  }
  return resolveThemePreset(presetId).tokens.colors.primary;
}
