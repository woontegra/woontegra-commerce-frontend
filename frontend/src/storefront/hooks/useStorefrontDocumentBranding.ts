import { useEffect } from 'react';
import type { StorefrontTenantInfo } from '../../contexts/StorefrontTenantContext';
import { DEFAULT_FAVICON, injectDocumentFavicon, resetDocumentFavicon } from '../../utils/brandingHead';

/**
 * Vitrin açıldığında kiracı favicon'unu document head'e yazar.
 * Unmount'ta varsayılan favicon'a döner.
 */
export function useStorefrontDocumentBranding(tenant: StorefrontTenantInfo | null): void {
  useEffect(() => {
    if (!tenant?.faviconUrl) return;

    injectDocumentFavicon(tenant.faviconUrl);

    return () => {
      resetDocumentFavicon(DEFAULT_FAVICON);
    };
  }, [tenant?.faviconUrl]);
}
