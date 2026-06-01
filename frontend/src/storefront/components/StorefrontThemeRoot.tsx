import { useMemo, type CSSProperties, type ReactNode } from 'react';
import '../../styles/storefrontTheme.css';
import { storefrontThemeCssVariables, type ThemeSettings } from '../../utils/themeSettingsHelpers';

type StorefrontThemeRootProps = {
  themeSettings: ThemeSettings;
  className?: string;
  children: ReactNode;
};

export function StorefrontThemeRoot({ themeSettings, className = '', children }: StorefrontThemeRootProps) {
  const style = useMemo(
    () => storefrontThemeCssVariables(themeSettings) as CSSProperties,
    [themeSettings],
  );
  const rootClass = themeSettings.enabled
    ? `storefront-theme-root min-h-screen flex flex-col ${className}`.trim()
    : `min-h-screen flex flex-col bg-slate-50 text-slate-900 ${className}`.trim();

  return (
    <div className={rootClass} style={style}>
      {children}
    </div>
  );
}
