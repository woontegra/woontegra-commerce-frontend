export type UserRole = 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'STAFF' | 'USER';

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
}

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN' as UserRole,
  OWNER: 'OWNER' as UserRole,
  ADMIN: 'ADMIN' as UserRole,
  STAFF: 'STAFF' as UserRole,
  USER: 'USER' as UserRole,
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 5,
  OWNER: 4,
  ADMIN: 3,
  STAFF: 2,
  USER: 1,
};

export const PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [],
  OWNER: [
    { resource: 'products', action: 'create' },
    { resource: 'products', action: 'read' },
    { resource: 'products', action: 'update' },
    { resource: 'products', action: 'delete' },
    { resource: 'orders', action: 'create' },
    { resource: 'orders', action: 'read' },
    { resource: 'orders', action: 'update' },
    { resource: 'orders', action: 'delete' },
    { resource: 'customers', action: 'create' },
    { resource: 'customers', action: 'read' },
    { resource: 'customers', action: 'update' },
    { resource: 'customers', action: 'delete' },
    { resource: 'settings', action: 'read' },
    { resource: 'settings', action: 'update' },
    { resource: 'reports', action: 'read' },
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'delete' },
    { resource: 'billing', action: 'read' },
    { resource: 'billing', action: 'update' },
  ],
  ADMIN: [
    { resource: 'products', action: 'create' },
    { resource: 'products', action: 'read' },
    { resource: 'products', action: 'update' },
    { resource: 'products', action: 'delete' },
    { resource: 'orders', action: 'create' },
    { resource: 'orders', action: 'read' },
    { resource: 'orders', action: 'update' },
    { resource: 'orders', action: 'delete' },
    { resource: 'customers', action: 'create' },
    { resource: 'customers', action: 'read' },
    { resource: 'customers', action: 'update' },
    { resource: 'customers', action: 'delete' },
    { resource: 'settings', action: 'read' },
    { resource: 'settings', action: 'update' },
    { resource: 'reports', action: 'read' },
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update' },
  ],
  STAFF: [
    { resource: 'products', action: 'create' },
    { resource: 'products', action: 'read' },
    { resource: 'products', action: 'update' },
    { resource: 'orders', action: 'create' },
    { resource: 'orders', action: 'read' },
    { resource: 'orders', action: 'update' },
    { resource: 'customers', action: 'create' },
    { resource: 'customers', action: 'read' },
    { resource: 'customers', action: 'update' },
    { resource: 'settings', action: 'read' },
  ],
  USER: [
    { resource: 'products', action: 'read' },
    { resource: 'orders', action: 'read' },
    { resource: 'orders', action: 'create' },
  ],
};

export function hasPermission(
  userRole: UserRole | undefined,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete'
): boolean {
  if (!userRole) return false;
  if (userRole === ROLES.SUPER_ADMIN) return true;

  const rolePermissions = PERMISSIONS[userRole];
  return rolePermissions.some(
    (p) => p.resource === resource && p.action === action
  );
}

export function hasRole(userRole: UserRole | undefined, requiredRole: UserRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function isOwner(userRole: UserRole | undefined): boolean {
  return userRole === ROLES.OWNER;
}

export function isAdmin(userRole: UserRole | undefined): boolean {
  return userRole === ROLES.ADMIN || userRole === ROLES.OWNER;
}

/** Woontegra platform `/admin` — backend `requireSuperAdmin` ile aynı: yalnızca SUPER_ADMIN */
export function canAccessPlatformAdmin(userRole: UserRole | undefined): boolean {
  return userRole === ROLES.SUPER_ADMIN;
}

export function isStaff(userRole: UserRole | undefined): boolean {
  return hasRole(userRole, ROLES.STAFF);
}
