/** Panel vitrin URL'leri — aktif tenant slug ile (?tenant=) */

export function buildStorefrontListUrl(tenantSlug: string): string {
  return `/store/urunler?tenant=${encodeURIComponent(tenantSlug)}`;
}

export function buildStorefrontProductUrl(tenantSlug: string, productSlug: string): string {
  return `/store/urun/${encodeURIComponent(productSlug)}?tenant=${encodeURIComponent(tenantSlug)}`;
}

function frontendOrigin(): string {
  const env = import.meta.env.VITE_FRONTEND_URL as string | undefined;
  if (env?.trim()) return env.trim().replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

/** Kopyalama / paylaşım için tam URL (liste). */
export function buildAbsoluteStorefrontListUrl(tenantSlug: string): string {
  const path = buildStorefrontListUrl(tenantSlug);
  const origin = frontendOrigin();
  return origin ? `${origin}${path}` : path;
}

/** Kopyalama / paylaşım için tam URL (ürün detay). */
export function buildAbsoluteStorefrontProductUrl(tenantSlug: string, productSlug: string): string {
  const path = buildStorefrontProductUrl(tenantSlug, productSlug);
  const origin = frontendOrigin();
  return origin ? `${origin}${path}` : path;
}
