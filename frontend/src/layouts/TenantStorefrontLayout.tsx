import { Outlet } from 'react-router-dom';
import { StorefrontTenantProvider, useStorefrontTenant } from '../contexts/StorefrontTenantContext';
import { StorefrontCartProvider } from '../storefront/hooks/StorefrontCartProvider';
import { StorefrontAuthProvider } from '../storefront/hooks/StorefrontAuthProvider';
import { StorefrontFavoritesProvider } from '../storefront/hooks/StorefrontFavoritesProvider';
import { resolveTheme } from '../themes/registry';

function Shell() {
  const { loading, error, tenant, storeLink } = useStorefrontTenant();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Mağaza yükleniyor…</p>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <p className="text-slate-800 font-medium max-w-md">{error || 'Mağaza bulunamadı.'}</p>
        <p className="mt-4 text-sm text-slate-500 max-w-lg">
          Yerel geliştirmede vitrin için örnek:{' '}
          <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs">
            /store?tenant=kiraci-slug
          </code>
          . Özel alan adı veya subdomain, API ile aynı proxy üzerinden geldiğinde otomatik çözülür; aksi halde{' '}
          <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs">X-Store-Frontend-Host</code> ile
          mağaza ana bilgisayar adı iletilir.
        </p>
        <a
          href="/"
          className="mt-8 text-sm font-medium text-indigo-600 hover:underline"
        >
          Ana siteye dön
        </a>
      </div>
    );
  }

  const Theme = resolveTheme(tenant.theme);
  return (
    <Theme.Layout tenant={tenant} storeLink={storeLink}>
      <Outlet />
    </Theme.Layout>
  );
}

/**
 * Çok kiracılı mağaza vitrini: tenant (?tenant= veya host) + tema paketi.
 */
export default function TenantStorefrontLayout() {
  return (
    <StorefrontTenantProvider>
      <StorefrontAuthProvider>
        <StorefrontFavoritesProvider>
          <StorefrontCartProvider>
            <Shell />
          </StorefrontCartProvider>
        </StorefrontFavoritesProvider>
      </StorefrontAuthProvider>
    </StorefrontTenantProvider>
  );
}
