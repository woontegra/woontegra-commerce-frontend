import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { hasPermission, isAdmin } from '../../types/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  resource?: string;
  action?: 'create' | 'read' | 'update' | 'delete';
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  resource,
  action,
}: ProtectedRouteProps) {
  const user = useAppStore((state) => state.user);

  // Check if user is logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight leading-tight text-gray-900 dark:text-white mb-3">
            Yetkisiz Erişim
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight mb-6">
            Bu sayfaya erişim için admin yetkisine sahip olmanız gerekiyor.
          </p>
          <button
            onClick={() => window.history.back()}
            className="btn-primary"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  // Check resource permission
  if (resource && action && !hasPermission(user.role, resource, action)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight leading-tight text-gray-900 dark:text-white mb-3">
            Yetki Gerekli
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight mb-6">
            Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor.
          </p>
          <button
            onClick={() => window.history.back()}
            className="btn-primary"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
