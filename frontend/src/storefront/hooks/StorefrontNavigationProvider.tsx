import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useStorefrontTenant } from './useStorefrontTenant';
import { fetchStoreNavigationMenus } from '../services/storefrontNavigationApi';
import type { ResolvedNavItem } from '../../types/navigationMenu';

type Ctx = {
  loading: boolean;
  headerItems: ResolvedNavItem[];
  footerItems: ResolvedNavItem[];
};

const StorefrontNavigationContext = createContext<Ctx>({
  loading: false,
  headerItems: [],
  footerItems: [],
});

export function StorefrontNavigationProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useStorefrontTenant();
  const [loading, setLoading] = useState(true);
  const [headerItems, setHeaderItems] = useState<ResolvedNavItem[]>([]);
  const [footerItems, setFooterItems] = useState<ResolvedNavItem[]>([]);

  useEffect(() => {
    if (!tenant?.slug) {
      setHeaderItems([]);
      setFooterItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchStoreNavigationMenus(tenant.slug);
        if (!cancelled) {
          setHeaderItems(data.header);
          setFooterItems(data.footer);
        }
      } catch {
        if (!cancelled) {
          setHeaderItems([]);
          setFooterItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant?.slug]);

  const value = useMemo(
    () => ({ loading, headerItems, footerItems }),
    [loading, headerItems, footerItems],
  );

  return (
    <StorefrontNavigationContext.Provider value={value}>{children}</StorefrontNavigationContext.Provider>
  );
}

export function useStorefrontNavigation(): Ctx {
  return useContext(StorefrontNavigationContext);
}
