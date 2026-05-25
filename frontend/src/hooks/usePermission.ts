import { usePermissionContext } from '../context/PermissionContext';
import type { PermissionKey } from '../context/PermissionContext';

/**
 * usePermission('product.create')         → boolean
 * usePermission('order.view', 'order.manage')  → true if ANY match
 */
export function usePermission(...keys: PermissionKey[]): boolean {
  const { can, canAny } = usePermissionContext();
  if (keys.length === 0) return false;
  if (keys.length === 1) return can(keys[0]);
  return canAny(...keys);
}

/**
 * usePermissions() → { can, canAny, canAll, permissions, loading }
 */
export function usePermissions() {
  return usePermissionContext();
}
