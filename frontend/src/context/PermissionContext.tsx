import {
  createContext, useContext, useState,
  useEffect, useCallback,
} from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/apiClient';
import { useAppStore } from '../store/useAppStore';

// ─── All permission keys (mirrors backend) ────────────────────────────────────

export const ALL_PERMISSIONS = [
  'product.view',   'product.create',  'product.update',  'product.delete',
  'product.import', 'product.export',
  'order.view',     'order.create',    'order.update',    'order.delete',    'order.export',
  'customer.view',  'customer.create', 'customer.update', 'customer.delete', 'customer.export',
  'category.view',  'category.create', 'category.update', 'category.delete',
  'report.view',
  'settings.view',  'settings.update',
  'billing.view',   'billing.manage',
  'team.view',      'team.invite',     'team.manage',
  'campaign.view',  'campaign.create', 'campaign.update', 'campaign.delete',
  'support.view',   'support.manage',
  'csv.import',     'csv.export',
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number] | (string & {});

interface PermissionContextType {
  permissions: Set<string>;
  loading:     boolean;
  can:         (key: PermissionKey) => boolean;
  canAny:      (...keys: PermissionKey[]) => boolean;
  canAll:      (...keys: PermissionKey[]) => boolean;
  refresh:     () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: new Set(),
  loading:     true,
  can:         () => false,
  canAny:      () => false,
  canAll:      () => false,
  refresh:     async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PermissionProvider({ children }: { children: ReactNode }) {
  const user = useAppStore(s => s.user);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading,     setLoading]     = useState(false);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || !user) { setPermissions(new Set()); return; }

    setLoading(true);
    try {
      const res  = await api.get('/permissions/me');
      const keys = (res.data as any).data as string[];
      setPermissions(new Set(keys));
    } catch {
      setPermissions(new Set());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const can    = useCallback((key: PermissionKey) => permissions.has(key as string), [permissions]);
  const canAny = useCallback((...keys: PermissionKey[]) => keys.some(k => permissions.has(k as string)), [permissions]);
  const canAll = useCallback((...keys: PermissionKey[]) => keys.every(k => permissions.has(k as string)), [permissions]);

  return (
    <PermissionContext.Provider value={{ permissions, loading, can, canAny, canAll, refresh }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissionContext() {
  return useContext(PermissionContext);
}
