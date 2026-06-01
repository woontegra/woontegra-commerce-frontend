import { useMemo } from 'react';
import type { ThemeLayoutProps } from '../../themes/types';
import { getDefaultThemeSettings } from '../config/defaultThemeSettings';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { StorefrontFooter } from '../components/StorefrontFooter';
import { AnnouncementBar } from '../components/AnnouncementBar';
import { useStorefrontGlobalTheme } from '../hooks/StorefrontGlobalThemeProvider';

/**
 * Default Storefront Theme — ana layout
 * İleride tenant.themeSettings JSON ile beslenecek.
 */
export default function StorefrontLayout({ children, tenant, storeLink }: ThemeLayoutProps) {
  const { announcementBar, headerSettings, footerSettings } = useStorefrontGlobalTheme();
  const settings = useMemo(
    () => getDefaultThemeSettings({ logoUrl: tenant.logoUrl }),
    [tenant.logoUrl],
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <AnnouncementBar settings={announcementBar} resolveHref={storeLink} />
      <StorefrontHeader tenant={tenant} storeLink={storeLink} settings={headerSettings} />
      <main className="flex-1">{children}</main>
      <StorefrontFooter
        tenant={tenant}
        settings={settings}
        footerSettings={footerSettings}
        storeLink={storeLink}
      />
    </div>
  );
}
