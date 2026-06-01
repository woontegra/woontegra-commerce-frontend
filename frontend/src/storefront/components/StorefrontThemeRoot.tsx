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
  const rootClass = `storefront-theme-root min-h-screen flex flex-col ${className}`.trim();

  return (
    <div className={rootClass} style={style}>
      {children}
    </div>
  );
}
