import { useMemo, type CSSProperties, type ReactNode } from 'react';
import '../../styles/storefrontTheme.css';
import '../../styles/storefrontHeaderMobile.css';
import '../../styles/storefrontMobileBottomNav.css';
import '../../styles/heroBlock.css';
import { DEFAULT_THEME_PRESET_ID, resolveThemePreset } from '../theme/registry';
import { resolveStorefrontThemeStyle } from '../theme/resolveThemeStyle';
import type { ThemePresetId } from '../theme/types';
import type { ThemeSettings } from '../../utils/themeSettingsHelpers';

type StorefrontThemeRootProps = {
  themeSettings: ThemeSettings;
  /** Theme Engine preset; varsayılan premium-commerce */
  presetId?: ThemePresetId | string;
  className?: string;
  children: ReactNode;
};

export function StorefrontThemeRoot({
  themeSettings,
  presetId = DEFAULT_THEME_PRESET_ID,
  className = '',
  children,
}: StorefrontThemeRootProps) {
  const preset = useMemo(() => resolveThemePreset(presetId), [presetId]);
  const style = useMemo(
    () => resolveStorefrontThemeStyle(preset.id, themeSettings) as CSSProperties,
    [preset.id, themeSettings],
  );
  const rootClass = `storefront-theme-root min-h-screen flex flex-col ${className}`.trim();

  return (
    <div className={rootClass} style={style} data-theme-preset={preset.id}>
      {children}
    </div>
  );
}
