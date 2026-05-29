import {
  createContext, useContext, useState,
  useEffect, useCallback,
} from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/apiClient';
import { AUTH_LOGIN_EVENT, AUTH_LOGOUT_EVENT } from '../services/authEvents';
import { resolveStoreNameFromSettings } from '../utils/displayStoreName';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Branding {
  siteName:      string;
  logoUrl:       string | null;
  logo:          string | null;  // legacy
  faviconUrl:    string | null;
  primaryColor:  string;
  secondaryColor: string;
  accentColor:   string;
  fontFamily:    string;
  borderRadius:  string;
  customCss:     string | null;
  currency:      string;
  language:      string;
  customDomain:  string | null;
  domainVerified: boolean;
  /** Kiracı slug (DB). */
  slug:             string | null;
  subdomain:        string | null;
  /** Vitrin ?tenant= değeri: slug, yoksa subdomain. */
  storefrontSlug:   string | null;
}

const DEFAULTS: Branding = {
  siteName:       'Woontegra',
  logoUrl:        null,
  logo:           null,
  faviconUrl:     null,
  primaryColor:   '#3B82F6',
  secondaryColor: '#10B981',
  accentColor:    '#F59E0B',
  fontFamily:     'Inter',
  borderRadius:   '0.5rem',
  customCss:      null,
  currency:       'TRY',
  language:       'tr',
  customDomain:   null,
  domainVerified: false,
  slug:             null,
  subdomain:        null,
  storefrontSlug:   null,
};

interface BrandingContextType {
  branding:    Branding;
  loading:     boolean;
  refresh:     () => Promise<void>;
  applyBranding: (b: Partial<Branding>) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const BrandingContext = createContext<BrandingContextType>({
  branding:     DEFAULTS,
  loading:      false,
  refresh:      async () => {},
  applyBranding: () => {},
});

// ─── CSS variable injection ───────────────────────────────────────────────────

function hexToHsl(hex: string): string {
  // Convert hex to HSL for CSS variable use
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function injectCssVars(b: Branding) {
  const root = document.documentElement;

  root.style.setProperty('--color-primary',   b.primaryColor);
  root.style.setProperty('--color-secondary', b.secondaryColor);
  root.style.setProperty('--color-accent',    b.accentColor);
  root.style.setProperty('--font-family',     `'${b.fontFamily}', system-ui, sans-serif`);
  root.style.setProperty('--border-radius',   b.borderRadius);

  // HSL variants for Tailwind utility compatibility
  root.style.setProperty('--brand-h-s-l',     hexToHsl(b.primaryColor));
  root.style.setProperty('--accent-h-s-l',    hexToHsl(b.accentColor));

  // Favicon
  if (b.faviconUrl) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = b.faviconUrl;
  }

  // Page title
  if (b.siteName) document.title = b.siteName;

  // Custom CSS injection
  const styleId = 'tenant-custom-css';
  let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
  if (b.customCss) {
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = b.customCss;
  } else if (styleTag) {
    styleTag.textContent = '';
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULTS);
  const [loading,  setLoading]  = useState(true);

  const resetBranding = useCallback(() => {
    setBranding(DEFAULTS);
    injectCssVars(DEFAULTS);
    setLoading(false);
  }, []);

  const applyBranding = useCallback((b: Partial<Branding>) => {
    setBranding(prev => {
      const next = { ...prev, ...b };
      injectCssVars(next);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      resetBranding();
      return;
    }

    setLoading(true);

    try {
      const res  = await api.get('/settings');
      const data = (res.data as any).data ?? {};

      const resolvedName = resolveStoreNameFromSettings(data);

      const next: Branding = {
        siteName:       resolvedName || DEFAULTS.siteName,
        logoUrl:        data.tenantLogoUrl ?? data.logoUrl ?? data.logo ?? null,
        logo:           data.logo           ?? null,
        faviconUrl:     data.faviconUrl     ?? null,
        primaryColor:   data.primaryColor   ?? DEFAULTS.primaryColor,
        secondaryColor: data.secondaryColor ?? DEFAULTS.secondaryColor,
        accentColor:    data.accentColor    ?? DEFAULTS.accentColor,
        fontFamily:     data.fontFamily     ?? DEFAULTS.fontFamily,
        borderRadius:   data.borderRadius   ?? DEFAULTS.borderRadius,
        customCss:      data.customCss      ?? null,
        currency:       data.currency       ?? DEFAULTS.currency,
        language:       data.language       ?? DEFAULTS.language,
        customDomain:   data.customDomain   ?? null,
        domainVerified: data.domainVerified ?? false,
        slug:             data.slug             ?? null,
        subdomain:        data.subdomain        ?? null,
        storefrontSlug:   data.storefrontSlug   ?? data.slug ?? data.subdomain ?? null,
      };

      setBranding(next);
      injectCssVars(next);
    } catch {
      // Silently fail — use defaults
    } finally {
      setLoading(false);
    }
  }, [resetBranding]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onLogin = () => {
      resetBranding();
      void refresh();
    };
    const onLogout = () => resetBranding();

    window.addEventListener(AUTH_LOGIN_EVENT, onLogin);
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout);
    return () => {
      window.removeEventListener(AUTH_LOGIN_EVENT, onLogin);
      window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout);
    };
  }, [refresh, resetBranding]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refresh, applyBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
