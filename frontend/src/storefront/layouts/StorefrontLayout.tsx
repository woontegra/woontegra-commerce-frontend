import { useMemo } from 'react';
import type { ThemeLayoutProps } from '../../themes/types';
import { getDefaultThemeSettings } from '../config/defaultThemeSettings';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { StorefrontFooter } from '../components/StorefrontFooter';
import { AnnouncementBar } from '../components/AnnouncementBar';
import { StorefrontThemeRoot } from '../components/StorefrontThemeRoot';
import { StorefrontMobileBottomNav } from '../components/StorefrontMobileBottomNav';
import { useStorefrontGlobalTheme } from '../hooks/StorefrontGlobalThemeProvider';

/**
 * Default Storefront Theme — ana layout
 */
export default function StorefrontLayout({ children, tenant, storeLink }: ThemeLayoutProps) {
  const { announcementBar, headerSettings, footerSettings, themeSettings } = useStorefrontGlobalTheme();
  const settings = useMemo(
    () => getDefaultThemeSettings({ logoUrl: tenant.logoUrl }),
    [tenant.logoUrl],
  );

  return (
    <StorefrontThemeRoot themeSettings={themeSettings} className="storefront-has-mobile-nav">
      <AnnouncementBar settings={announcementBar} resolveHref={storeLink} />
      <StorefrontHeader tenant={tenant} storeLink={storeLink} settings={headerSettings} />
      <main className="flex-1 store-storefront-main min-w-0">{children}</main>
      <StorefrontFooter
        tenant={tenant}
        settings={settings}
        footerSettings={footerSettings}
        storeLink={storeLink}
      />
      <StorefrontMobileBottomNav storeLink={storeLink} headerSettings={headerSettings} />
    </StorefrontThemeRoot>
  );
}
