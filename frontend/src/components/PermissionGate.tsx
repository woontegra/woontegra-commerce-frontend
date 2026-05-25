import React from 'react';
import { authService } from '../services/auth.service';
import type { UserRole } from '../types/auth';
import { hasRole, hasPermission } from '../types/auth';

interface PermissionGateProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: {
    resource: string;
    action: 'create' | 'read' | 'update' | 'delete';
  };
  fallback?: React.ReactNode;
}

/**
 * Component to conditionally render UI based on user permissions
 * 
 * @example
 * // Require ADMIN role
 * <PermissionGate requiredRole="ADMIN">
 *   <button>Delete</button>
 * </PermissionGate>
 * 
 * @example
 * // Require specific permission
 * <PermissionGate requiredPermission={{ resource: 'products', action: 'delete' }}>
 *   <button>Delete Product</button>
 * </PermissionGate>
 */
const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  requiredRole,
  requiredPermission,
  fallback = null,
}) => {
  const user = authService.getCurrentUser();
  const userRole = user?.role;

  // Check role requirement
  if (requiredRole && !hasRole(userRole, requiredRole)) {
    return <>{fallback}</>;
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(
    userRole,
    requiredPermission.resource,
    requiredPermission.action
  )) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;
