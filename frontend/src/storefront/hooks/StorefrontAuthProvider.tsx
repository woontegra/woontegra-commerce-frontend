import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  bindStoreCustomerToken,
  fetchCustomerMe,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
  type StoreCustomer,
} from '../services/storefrontAuthApi';
import { useStorefrontTenant } from './useStorefrontTenant';

function tokenKey(tenantId: string) {
  return `woontegra_customer_token_${tenantId}`;
}

type Ctx = {
  customer: StoreCustomer | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const StorefrontAuthContext = createContext<Ctx | null>(null);

export function StorefrontAuthProvider({ children }: { children: ReactNode }) {
  const { tenant, loading: tenantLoading } = useStorefrontTenant();
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  const readToken = useCallback(() => {
    if (!tenant?.id) return null;
    return localStorage.getItem(tokenKey(tenant.id));
  }, [tenant?.id]);

  const saveToken = useCallback(
    (token: string | null) => {
      if (!tenant?.id) return;
      if (token) localStorage.setItem(tokenKey(tenant.id), token);
      else localStorage.removeItem(tokenKey(tenant.id));
    },
    [tenant?.id],
  );

  useEffect(() => {
    bindStoreCustomerToken(readToken);
  }, [readToken]);

  useEffect(() => {
    let cancelled = false;

    if (tenantLoading) {
      setLoading(true);
      return () => { cancelled = true; };
    }

    if (!tenant?.slug || !tenant?.id) {
      setCustomer(null);
      setLoading(false);
      return () => { cancelled = true; };
    }

    (async () => {
      setLoading(true);
      const token = readToken();
      if (!token) {
        if (!cancelled) {
          setCustomer(null);
          setLoading(false);
        }
        return;
      }
      try {
        const me = await fetchCustomerMe(tenant.slug);
        if (!cancelled) setCustomer(me);
      } catch {
        saveToken(null);
        if (!cancelled) setCustomer(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [tenantLoading, tenant?.slug, tenant?.id, readToken, saveToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!tenant?.slug) throw new Error('Mağaza yüklenmedi.');
      const res = await loginCustomer(tenant.slug, email, password);
      if (!res.success || !res.token || !res.customer) {
        throw new Error(res.error || 'Giriş yapılamadı.');
      }
      saveToken(res.token);
      setCustomer(res.customer);
    },
    [tenant?.slug, saveToken],
  );

  const register = useCallback(
    async (data: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      password: string;
    }) => {
      if (!tenant?.slug) throw new Error('Mağaza yüklenmedi.');
      const res = await registerCustomer(tenant.slug, data);
      if (!res.success || !res.token || !res.customer) {
        throw new Error(res.error || 'Kayıt olunamadı.');
      }
      saveToken(res.token);
      setCustomer(res.customer);
    },
    [tenant?.slug, saveToken],
  );

  const logout = useCallback(async () => {
    if (tenant?.slug) {
      try {
        await logoutCustomer(tenant.slug);
      } catch {
        /* ignore */
      }
    }
    saveToken(null);
    setCustomer(null);
  }, [tenant?.slug, saveToken]);

  const refreshMe = useCallback(async () => {
    if (!tenant?.slug || !readToken()) return;
    const me = await fetchCustomerMe(tenant.slug);
    setCustomer(me);
  }, [tenant?.slug, readToken]);

  const value = useMemo(
    () => ({
      customer,
      loading,
      isAuthenticated: Boolean(customer),
      login,
      register,
      logout,
      refreshMe,
    }),
    [customer, loading, login, register, logout, refreshMe],
  );

  return (
    <StorefrontAuthContext.Provider value={value}>{children}</StorefrontAuthContext.Provider>
  );
}

export function useStorefrontAuth(): Ctx {
  const c = useContext(StorefrontAuthContext);
  if (!c) throw new Error('useStorefrontAuth: StorefrontAuthProvider eksik');
  return c;
}
