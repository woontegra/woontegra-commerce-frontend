import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useStorefrontTenant } from './useStorefrontTenant';
import { getStorefrontHomeLayout } from '../services/storefrontHomeLayoutApi';
import {
  extractAnnouncementBarFromTheme,
  mergeAnnouncementBarSettings,
  type AnnouncementBarSettings,
} from '../../utils/announcementBarHelpers';
import {
  extractHeaderSettingsFromTheme,
  mergeHeaderSettings,
  type HeaderSettings,
} from '../../utils/headerSettingsHelpers';
import {
  extractFooterSettingsFromTheme,
  mergeFooterSettings,
  type FooterSettings,
} from '../../utils/footerSettingsHelpers';

type StorefrontGlobalThemeContextValue = {
  loading: boolean;
  announcementBar: AnnouncementBarSettings;
  headerSettings: HeaderSettings;
  footerSettings: FooterSettings;
};

const StorefrontGlobalThemeContext = createContext<StorefrontGlobalThemeContextValue | null>(null);

export function StorefrontGlobalThemeProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useStorefrontTenant();
  const [loading, setLoading] = useState(true);
  const [announcementBar, setAnnouncementBar] = useState<AnnouncementBarSettings>(() =>
    mergeAnnouncementBarSettings(undefined),
  );
  const [headerSettings, setHeaderSettings] = useState<HeaderSettings>(() => mergeHeaderSettings(undefined));
  const [footerSettings, setFooterSettings] = useState<FooterSettings>(() => mergeFooterSettings(undefined));

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
          setHeaderSettings(extractHeaderSettingsFromTheme(layout?.theme));
          setFooterSettings(extractFooterSettingsFromTheme(layout?.theme));
        }
      } catch {
        if (!cancelled) {
          setAnnouncementBar(mergeAnnouncementBarSettings(undefined));
          setHeaderSettings(mergeHeaderSettings(undefined));
          setFooterSettings(mergeFooterSettings(undefined));
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
    () => ({ loading, announcementBar, headerSettings, footerSettings }),
    [loading, announcementBar, headerSettings, footerSettings],
  );

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
      headerSettings: mergeHeaderSettings(undefined),
      footerSettings: mergeFooterSettings(undefined),
    };
  }
  return ctx;
}
