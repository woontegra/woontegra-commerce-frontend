import type { StorefrontTenantInfo } from '../../contexts/StorefrontTenantContext';

/** Mağaza SEO açıklaması — boşsa fallback döner. */
export function resolveStorefrontSiteDescription(
  tenant: Pick<StorefrontTenantInfo, 'name' | 'siteDescription'> | null | undefined,
  fallback = '',
): string {
  const trimmed = tenant?.siteDescription?.trim();
  if (trimmed) return trimmed;
  return fallback;
}
