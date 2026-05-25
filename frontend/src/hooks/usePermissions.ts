import { useAppStore } from '../store/useAppStore';
import { hasPermission, isAdmin, canAccessPlatformAdmin } from '../types/auth';

export function usePermissions() {
  const user = useAppStore((state) => state.user);

  const can = (resource: string, action: 'create' | 'read' | 'update' | 'delete') => {
    return hasPermission(user?.role, resource, action);
  };

  const canCreate = (resource: string) => can(resource, 'create');
  const canRead = (resource: string) => can(resource, 'read');
  const canUpdate = (resource: string) => can(resource, 'update');
  const canDelete = (resource: string) => can(resource, 'delete');

  return {
    can,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    isAdmin: isAdmin(user?.role),
    canAccessPlatformAdmin: canAccessPlatformAdmin(user?.role),
    role: user?.role,
  };
}
