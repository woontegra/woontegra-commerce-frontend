import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useStorefrontTenant } from './useStorefrontTenant';
import { getStorefrontHomeLayout } from '../services/storefrontHomeLayoutApi';
import {
  extractAnnouncementBarFromTheme,
  mergeAnnouncementBarSettings,
  type AnnouncementBarSettings,
} from '../../utils/announcementBarHelpers';

type StorefrontGlobalThemeContextValue = {
  loading: boolean;
  announcementBar: AnnouncementBarSettings;
};

const StorefrontGlobalThemeContext = createContext<StorefrontGlobalThemeContextValue | null>(null);

export function StorefrontGlobalThemeProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useStorefrontTenant();
  const [loading, setLoading] = useState(true);
  const [announcementBar, setAnnouncementBar] = useState<AnnouncementBarSettings>(() =>
    mergeAnnouncementBarSettings(undefined),
  );

  useEffect(() => {
    if (!tenant?.slug) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { layout } = await getStorefrontHomeLayout(tenant.slug);
        if (!cancelled) {
          setAnnouncementBar(extractAnnouncementBarFromTheme(layout?.theme));
        }
      } catch {
        if (!cancelled) setAnnouncementBar(mergeAnnouncementBarSettings(undefined));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant?.slug]);

  const value = useMemo(() => ({ loading, announcementBar }), [loading, announcementBar]);

  return (
    <StorefrontGlobalThemeContext.Provider value={value}>{children}</StorefrontGlobalThemeContext.Provider>
  );
}

export function useStorefrontGlobalTheme(): StorefrontGlobalThemeContextValue {
  const ctx = useContext(StorefrontGlobalThemeContext);
  if (!ctx) {
    return {
      loading: false,
      announcementBar: mergeAnnouncementBarSettings(undefined),
    };
  }
  return ctx;
}
