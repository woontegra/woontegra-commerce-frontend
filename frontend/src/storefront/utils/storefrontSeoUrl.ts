/** Aktif vitrin canonical URL — özel alan adı doğrulandığında ?tenant= kullanılmaz. */

export type StorefrontSeoTenantRef = {
  slug: string;
  customDomain?: string | null;
  domainVerified?: boolean;
};

export function storefrontUsesCustomDomain(t: StorefrontSeoTenantRef): boolean {
  return Boolean(t.domainVerified && t.customDomain?.trim());
}

export function resolveStorefrontCanonicalUrl(
  tenant: StorefrontSeoTenantRef,
  canonicalPath: string,
): string {
  const path = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;

  if (storefrontUsesCustomDomain(tenant)) {
    const host = tenant.customDomain!.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
    const pathname = path.split('?')[0] || '/';
    return `https://${host}${pathname}`;
  }

  const env = import.meta.env.VITE_FRONTEND_URL as string | undefined;
  const origin =
    env?.trim()?.replace(/\/$/, '') ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  return origin ? `${origin}${path}` : path;
}
