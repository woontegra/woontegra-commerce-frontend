import { storePublicClient } from '../../services/storePublicApi';
import type { ResolvedNavItem } from '../../types/navigationMenu';

export async function fetchStoreNavigationMenus(
  tenantSlug: string,
): Promise<{ header: ResolvedNavItem[]; footer: ResolvedNavItem[] }> {
  const res = await storePublicClient.get('/store/navigation-menus', {
    params: { tenant: tenantSlug },
  });
  const data = res.data?.data ?? res.data ?? {};
  return {
    header: Array.isArray(data.header) ? data.header : [],
    footer: Array.isArray(data.footer) ? data.footer : [],
  };
}
