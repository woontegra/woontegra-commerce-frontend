import { useMemo } from 'react';
import type { ThemeLayoutProps } from '../../themes/types';
import { getDefaultThemeSettings } from '../config/defaultThemeSettings';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { StorefrontFooter } from '../components/StorefrontFooter';

/**
 * Default Storefront Theme — ana layout
 * İleride tenant.themeSettings JSON ile beslenecek.
 */
export default function StorefrontLayout({ children, tenant, storeLink }: ThemeLayoutProps) {
  const settings = useMemo(
    () => getDefaultThemeSettings({ logoUrl: tenant.logoUrl }),
    [tenant.logoUrl],
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <StorefrontHeader tenant={tenant} storeLink={storeLink} />
      <main className="flex-1">{children}</main>
      <StorefrontFooter tenant={tenant} settings={settings} />
    </div>
  );
}
