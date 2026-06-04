import { useStorefrontTenant } from '../../contexts/StorefrontTenantContext';
import { useStorefrontSeo } from '../../storefront/hooks/useStorefrontSeo';
import { resolveTheme } from '../../themes/registry';
import { buildStorefrontHomeUrl } from '../../utils/storefrontUrl';

export function StorefrontThemedHome() {
  const { tenant } = useStorefrontTenant();

  const siteDesc =
    tenant?.siteDescription?.trim() ||
    (tenant ? `${tenant.name} — online mağaza` : '');

  useStorefrontSeo({
    title: tenant?.name ?? 'Mağaza',
    description: siteDesc,
    canonicalPath: tenant ? buildStorefrontHomeUrl(tenant.slug) : undefined,
    image: tenant?.logoUrl,
    type: 'website',
    tenant: tenant ?? undefined,
  });

  if (!tenant) return null;
  const T = resolveTheme(tenant.theme);
  return <T.HomePage />;
}

export function StorefrontThemedProductList() {
  const { tenant } = useStorefrontTenant();
  if (!tenant) return null;
  const T = resolveTheme(tenant.theme);
  return <T.ProductList />;
}

export function StorefrontThemedProductDetail() {
  const { tenant } = useStorefrontTenant();
  if (!tenant) return null;
  const T = resolveTheme(tenant.theme);
  return <T.ProductDetail />;
}
