import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, CreditCard,
  ClipboardList, LogOut, ChevronRight, Menu, X, Shield,
  AlertTriangle, ToggleRight, ScrollText,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin',                 label: 'Dashboard',      icon: LayoutDashboard, exact: true },
  { to: '/admin/tenants',         label: 'Tenantlar',      icon: Building2 },
  { to: '/admin/users',           label: 'Kullanıcılar',   icon: Users },
  { to: '/admin/billing',         label: 'Faturalama',    icon: CreditCard },
  { to: '/admin/feature-flags',   label: 'Feature Flags',  icon: ToggleRight },
  { to: '/admin/system-logs',     label: 'Sistem Logları', icon: ScrollText },
  { to: '/admin/audit-logs',      label: 'Audit Loglar',   icon: ClipboardList },
];

// ─── Guard: only SUPER_ADMIN or OWNER ──────────────────────────────────────────
function useSuperAdminGuard() {
  try {
    const raw  = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    return user?.role === 'SUPER_ADMIN' || user?.role === 'OWNER';
  } catch {
    return false;
  }
}

// ─── AdminLayout ─────────────────────────────────────────────────────────────
const AdminLayout: React.FC = () => {
  const location   = useLocation();
  const navigate   = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isSuperAdmin = useSuperAdminGuard();

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-gray-900 border border-red-900/60 rounded-2xl p-10 max-w-md text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-900/30 rounded-full">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Erişim Reddedildi</h1>
          <p className="text-gray-400 text-sm">
            Bu alana yalnızca platform yöneticisi (Super Admin) veya mağaza sahibi (Owner) erişebilir.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    );
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 ${
          sidebarOpen ? 'w-60' : 'w-16'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight">Super Admin</p>
              <p className="text-gray-500 text-xs">Control Center</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-gray-500 hover:text-gray-300 transition-colors"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
            const active = isActive(to, exact);
            return (
              <Link
                key={to}
                to={to}
                title={!sidebarOpen ? label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{label}</span>}
                {sidebarOpen && active && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={handleLogout}
            title={!sidebarOpen ? 'Çıkış Yap' : undefined}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-all"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Çıkış Yap</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center px-6 gap-4">
          <h1 className="text-white font-semibold text-sm">
            {NAV_ITEMS.find((n) => isActive(n.to, n.exact))?.label ?? 'Admin'}
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs bg-red-900/40 text-red-400 border border-red-900/60 px-2.5 py-1 rounded-full font-medium">
              SUPER ADMIN
            </span>
            <Link
              to="/dashboard"
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              → Dashboard
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
