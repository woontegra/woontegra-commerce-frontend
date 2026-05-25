import type { ReactNode } from 'react';
import { usePermission } from '../hooks/usePermission';
import type { PermissionKey } from '../context/PermissionContext';

interface CanProps {
  /** Permission key(s) — any match grants access */
  do: PermissionKey | PermissionKey[];
  /** Rendered when permission is granted */
  children: ReactNode;
  /** Rendered when permission is denied (optional) */
  fallback?: ReactNode;
}

/**
 * Declarative permission guard.
 *
 * Usage:
 *   <Can do="product.create">
 *     <button>Ürün Ekle</button>
 *   </Can>
 *
 *   <Can do={['order.view', 'order.manage']} fallback={<p>Yetki yok</p>}>
 *     <OrderTable />
 *   </Can>
 */
export function Can({ do: keys, children, fallback = null }: CanProps) {
  const keyArr = Array.isArray(keys) ? keys : [keys];
  const allowed = usePermission(...keyArr);
  return <>{allowed ? children : fallback}</>;
}

export default Can;
