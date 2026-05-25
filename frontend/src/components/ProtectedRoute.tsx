import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth.service';
import type { UserRole } from '../types/auth';
import { hasRole, hasPermission, ROLES } from '../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: {
    resource: string;
    action: 'create' | 'read' | 'update' | 'delete';
  };
  fallbackPath?: string;
  requireOnboarding?: boolean;
  /** Platform `/admin` — yalnızca `SUPER_ADMIN` (backend `requireSuperAdmin` ile uyumlu). */
  requireSuperAdmin?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole,
  requiredPermission,
  fallbackPath = '/unauthorized',
  requireOnboarding = true,
  requireSuperAdmin: requireSuperAdminOnly = false,
}: ProtectedRouteProps) {
  const location = useLocation();
  
  // Check authentication
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const user = authService.getCurrentUser();
  const userRole = user?.role;

  if (requireSuperAdminOnly) {
    if (userRole !== ROLES.SUPER_ADMIN) {
      return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
  }

  const isDemoSession = localStorage.getItem('isDemo') === 'true';

  // Onboarding tamamlanmadan ürün ekleme / içe aktarma yollarına izin ver (dashboard geri kalanı kapalı)
  if (requireOnboarding && user?.onboardingCompleted !== true && !isDemoSession) {
    const path = location.pathname;
    const onboardingProductFlow =
      path.startsWith('/onboarding') ||
      path === '/dashboard/products' ||
      path.startsWith('/dashboard/products/') ||
      path.startsWith('/dashboard/import-export') ||
      // Allow setting up persistent XML sources before onboarding is completed
      path.startsWith('/dashboard/xml-sources');
    if (!onboardingProductFlow) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // Check role requirement
  if (requiredRole && !hasRole(userRole, requiredRole)) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(
    userRole,
    requiredPermission.resource,
    requiredPermission.action
  )) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
