import { useEffect } from 'react';
import { resolveStorefrontCanonicalUrl, type StorefrontSeoTenantRef } from '../utils/storefrontSeoUrl';

export type UseStorefrontSeoOptions = {
  title: string;
  description?: string;
  /** Relative vitrin path; tam URL tenant + domain ile üretilir. */
  canonicalPath?: string;
  /** Hazır tam canonical verilmişse path yerine kullanılır. */
  canonicalUrl?: string;
  image?: string | null;
  type?: 'website' | 'product' | 'article';
  noindex?: boolean;
  tenant?: StorefrontSeoTenantRef | null;
};

function updateMetaTag(name: string, content: string, property?: boolean): void {
  const attr = property ? 'property' : 'name';
  let element = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.content = content;
}

function applyStorefrontSeo(opts: UseStorefrontSeoOptions): void {
  const {
    title,
    description = '',
    canonicalPath,
    canonicalUrl,
    image,
    type = 'website',
    noindex = false,
    tenant,
  } = opts;

  document.title = title;

  if (description) {
    updateMetaTag('description', description);
  }

  updateMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow');

  updateMetaTag('og:title', title, true);
  if (description) updateMetaTag('og:description', description, true);
  updateMetaTag('og:type', type, true);

  const resolvedCanonical =
    canonicalUrl ||
    (canonicalPath && tenant ? resolveStorefrontCanonicalUrl(tenant, canonicalPath) : undefined);

  if (resolvedCanonical) {
    updateMetaTag('og:url', resolvedCanonical, true);
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = resolvedCanonical;
  }

  if (image) {
    updateMetaTag('og:image', image, true);
    updateMetaTag('twitter:image', image);
  }

  updateMetaTag('twitter:card', 'summary_large_image');
  updateMetaTag('twitter:title', title);
  if (description) updateMetaTag('twitter:description', description);
}

/**
 * Aktif vitrin sayfaları için client-side meta yönetimi (SPA).
 */
export function useStorefrontSeo(opts: UseStorefrontSeoOptions): void {
  useEffect(() => {
    applyStorefrontSeo(opts);
  }, [
    opts.title,
    opts.description,
    opts.canonicalPath,
    opts.canonicalUrl,
    opts.image,
    opts.type,
    opts.noindex,
    opts.tenant?.slug,
    opts.tenant?.customDomain,
    opts.tenant?.domainVerified,
  ]);
}

/** Declarative kullanım için ince sarmalayıcı. */
export function StorefrontSeoHead(props: UseStorefrontSeoOptions): null {
  useStorefrontSeo(props);
  return null;
}

/** Sepet, ödeme, hesap vb. transactional sayfalar. */
export function useStorefrontNoIndex(title: string, tenant?: StorefrontSeoTenantRef | null): void {
  useStorefrontSeo({
    title,
    description: '',
    noindex: true,
    tenant,
  });
}
