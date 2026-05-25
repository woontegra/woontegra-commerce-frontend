import { useStorefrontTenant } from '../../contexts/StorefrontTenantContext';
import { resolveTheme } from '../../themes/registry';

export function StorefrontThemedHome() {
  const { tenant } = useStorefrontTenant();
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
