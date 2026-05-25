import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { storePublicClient } from '../services/storePublicApi';

export type StorefrontTenantInfo = {
  id:      string;
  name:    string;
  slug:    string;
  theme:   string;
  logoUrl: string | null;
};

export type StorefrontCategory = {
  id:          string;
  name:        string;
  slug:        string;
  description: string | null;
  imageUrl:    string | null;
  parentId:    string | null;
  order:       number;
  level:       number;
};

type Ctx = {
  loading:     boolean;
  error:       string | null;
  tenant:      StorefrontTenantInfo | null;
  categories:  StorefrontCategory[];
  refetch:     () => Promise<void>;
  /** Tüm store içi linklere tenant= ekler (dev / çok origin). */
  storeLink:   (path: string) => string;
};

const StorefrontTenantContext = createContext<Ctx | null>(null);

export function StorefrontTenantProvider({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams();
  const tenantParam    = searchParams.get('tenant');

  const [tenant, setTenant]         = useState<StorefrontTenantInfo | null>(null);
  const [categories, setCategories] = useState<StorefrontCategory[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await storePublicClient.get('/store/categories', {
        params: tenantParam ? { tenant: tenantParam } : {},
      });
      const body = r.data as {
        tenant?: StorefrontTenantInfo;
        data?:   StorefrontCategory[];
        error?:  string;
      };
      if (!body.tenant) {
        throw new Error(body.error || 'Mağaza bilgisi alınamadı');
      }
      setTenant(body.tenant);
      setCategories(Array.isArray(body.data) ? body.data : []);
    } catch (e: unknown) {
      setTenant(null);
      setCategories([]);
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (e as Error)?.message ??
        'Mağaza yüklenemedi';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [tenantParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const storeLink = useCallback(
    (path: string) => {
      const slug = tenant?.slug ?? tenantParam ?? '';
      if (!slug) return path;
      const qMark = path.indexOf('?');
      const pathname = qMark >= 0 ? path.slice(0, qMark) : path;
      const oldQs    = qMark >= 0 ? path.slice(qMark + 1) : '';
      const sp       = new URLSearchParams(oldQs);
      sp.set('tenant', slug);
      return `${pathname}?${sp.toString()}`;
    },
    [tenant?.slug, tenantParam],
  );

  const value = useMemo(
    () => ({
      loading,
      error,
      tenant,
      categories,
      refetch: load,
      storeLink,
    }),
    [loading, error, tenant, categories, load, storeLink],
  );

  return (
    <StorefrontTenantContext.Provider value={value}>{children}</StorefrontTenantContext.Provider>
  );
}

export function useStorefrontTenant(): Ctx {
  const c = useContext(StorefrontTenantContext);
  if (!c) throw new Error('useStorefrontTenant: provider eksik');
  return c;
}
