import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Users, TrendingUp, CreditCard, Package,
  ArrowUpRight, Loader2, AlertCircle,
  Activity, BarChart3,
} from 'lucide-react';
import { api } from '../../services/apiClient';
import { unwrapAdmin } from '../../utils/adminApi';

interface Metrics {
  tenants: {
    total: number; active: number; trial: number; pastDue: number;
    suspended: number; canceled: number; newThisMonth: number; newThisWeek: number;
  };
  users:         { total: number; active?: number };
  products?:    { total: number };
  revenue: {
    total: number; monthly: number; lastMonth: number;
    momGrowth: number | null; fromInvoices: number; fromPayments: number;
  };
  subscriptions: {
    active: number; expired: number; trial: number; pastDue: number;
    pending: number; byPlan: Record<string, number>;
  };
  recentInvoices: Array<{
    id: string; number: string; amount: number; currency: string;
    paidAt: string | null; type: string; plan: string | null; tenantName: string | null;
  }>;
}

const PLAN_COLORS: Record<string, string> = {
  STARTER:    'bg-blue-500/20 text-blue-300 border-blue-700/40',
  PRO:        'bg-purple-500/20 text-purple-300 border-purple-700/40',
  ENTERPRISE: 'bg-amber-500/20 text-amber-300 border-amber-700/40',
};

function StatCard({
  icon: Icon, label, value, sub, color = 'blue', to,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color?: string; to?: string;
}) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-600/20 text-blue-400',
    green:  'bg-green-600/20 text-green-400',
    purple: 'bg-purple-600/20 text-purple-400',
    amber:  'bg-amber-600/20 text-amber-400',
  };

  const content = (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {to && <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/admin/metrics');
        setMetrics(unwrapAdmin<Metrics>(res));
      } catch (e: any) {
        setError(e?.message || 'Metrikler yüklenemedi.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex items-center gap-3 bg-red-900/20 border border-red-800/40 rounded-xl p-6 text-red-400">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  const m = metrics;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Sistem Özeti</h2>
        <p className="text-gray-500 text-sm mt-1">Platform genelindeki anlık metrikler</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          icon={Building2} label="Toplam Tenant" color="blue"
          value={m.tenants?.total || 0}
          sub={`+${m.tenants?.newThisMonth || 0} bu ay`}
          to="/admin/tenants"
        />
        <StatCard
          icon={Users} label="Kullanıcılar" color="purple"
          value={m.users?.total || 0}
          sub={m.users?.active != null ? `${m.users.active} aktif hesap` : undefined}
          to="/admin/users"
        />
        <StatCard
          icon={Package} label="Toplam Ürün" color="amber"
          value={m.products?.total ?? 0}
          sub="Tüm tenantlar"
          to="/admin/tenants"
        />
        <StatCard
          icon={TrendingUp} label="Toplam Gelir" color="green"
          value={`₺${(m.revenue?.total || 0).toLocaleString('tr-TR')}`}
          sub={
            (m.revenue?.fromInvoices || 0) > 0
              ? `Faturalardan: ₺${(m.revenue?.fromInvoices || 0).toLocaleString('tr-TR')}`
              : `Ödemelerden: ₺${(m.revenue?.fromPayments || 0).toLocaleString('tr-TR')}`
          }
        />
        <StatCard
          icon={CreditCard} label="Aktif Abonelik" color="amber"
          value={m.subscriptions?.active || 0}
          sub={`${m.subscriptions?.trial || 0} trial · ${m.subscriptions?.expired || 0} süresi dolmuş`}
          to="/admin/billing"
        />
      </div>

      {/* Revenue breakdown row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Bu ay */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 mb-1">Bu Ay Gelir</p>
          <p className="text-2xl font-bold text-white">
            ₺{(m.revenue?.monthly || 0).toLocaleString('tr-TR')}
          </p>
          {m.revenue?.momGrowth !== null && m.revenue?.momGrowth !== undefined && (
            <p className={`text-xs mt-1 ${m.revenue.momGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {m.revenue.momGrowth >= 0 ? '↑' : '↓'} %{Math.abs(m.revenue.momGrowth).toFixed(1)}
            </p>
          )}
        </div>
        {/* Geçen ay */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 mb-1">Geçen Ay</p>
          <p className="text-2xl font-bold text-white">
            ₺{(m.revenue?.lastMonth || 0).toLocaleString('tr-TR')}
          </p>
          <p className="text-xs text-gray-600 mt-1">Karşılaştırma bazı</p>
        </div>
        {/* Kaynak dağılımı */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 mb-3">Gelir Kaynağı</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                Faturalar
              </span>
              <span className="text-white font-medium">₺{(m.revenue?.fromInvoices || 0).toLocaleString('tr-TR')}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                Ödemeler
              </span>
              <span className="text-white font-medium">₺{(m.revenue?.fromPayments || 0).toLocaleString('tr-TR')}</span>
            </div>
            {/* Mini progress bar */}
            {((m.revenue?.fromInvoices || 0) + (m.revenue?.fromPayments || 0)) > 0 && (
              <div className="w-full h-1.5 bg-gray-800 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{
                    width: `${Math.round(
                      ((m.revenue?.fromInvoices || 0) / ((m.revenue?.fromInvoices || 0) + (m.revenue?.fromPayments || 0))) * 100,
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subscription status row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Aktif Abonelik',     value: m.subscriptions?.active || 0,  color: 'text-green-400', bg: 'bg-green-500/10 border-green-800/40' },
          { label: 'Trial',              value: m.subscriptions?.trial || 0,   color: 'text-blue-400',  bg: 'bg-blue-500/10  border-blue-800/40'  },
          { label: 'Süresi Dolmuş',      value: m.subscriptions?.expired || 0, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-800/40' },
          { label: 'Gecikmiş Ödeme',     value: m.subscriptions?.pastDue || 0, color: 'text-red-400',   bg: 'bg-red-500/10   border-red-800/40'   },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tenant health */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Tenant Durumu
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Aktif',    value: m.tenants?.active || 0,    dot: 'bg-green-400' },
              { label: 'Trial',    value: m.tenants?.trial || 0,     dot: 'bg-blue-400'  },
              { label: 'Gecikmiş', value: m.tenants?.pastDue || 0,  dot: 'bg-amber-400' },
              { label: 'Askıda',   value: m.tenants?.suspended || 0, dot: 'bg-red-400'   },
              { label: 'İptal',    value: m.tenants?.canceled || 0,  dot: 'bg-gray-500'  },
            ].map(({ label, value, dot }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-gray-400 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                  {label}
                </span>
                <span className="text-sm font-semibold text-white">{value}</span>
              </div>
            ))}
            <div className="pt-3 border-t border-gray-800">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Bu hafta yeni</span>
                <span className="text-green-400 font-medium">+{m.tenants?.newThisWeek || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plan distribution */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            Plan Dağılımı
          </h3>
          <div className="space-y-2">
            {Object.entries(m.subscriptions?.byPlan || {}).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PLAN_COLORS[plan] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                  {plan}
                </span>
                <span className="text-sm font-semibold text-white">{count}</span>
              </div>
            ))}
            {Object.keys(m.subscriptions?.byPlan || {}).length === 0 && (
              <p className="text-xs text-gray-600">Henüz veri yok</p>
            )}
          </div>
        </div>

        {/* Recent invoices */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-400" />
            Son Faturalar
          </h3>
          <div className="space-y-2">
            {(m.recentInvoices || []).slice(0, 5).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-300 truncate">{inv.tenantName || '—'}</p>
                  <p className="text-xs text-gray-600">
                    {inv.number}
                    {inv.plan && (
                      <span className="ml-1 text-gray-700">· {inv.plan}</span>
                    )}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold text-green-400">
                    +₺{inv.amount.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-[10px] text-gray-600">
                    {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('tr-TR') : '—'}
                  </p>
                </div>
              </div>
            ))}
            {(m.recentInvoices || []).length === 0 && (
              <p className="text-xs text-gray-600">Henüz fatura yok</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/admin/tenants',    label: 'Tenant Yönet',    icon: Building2 },
          { to: '/admin/users',      label: 'Kullanıcılar',    icon: Users },
          { to: '/admin/billing',    label: 'Abonelik Override', icon: CreditCard },
          { to: '/admin/audit-logs', label: 'Audit Loglar',    icon: Activity },
        ].map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 rounded-xl px-4 py-3 transition-colors group"
          >
            <Icon className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
            <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{label}</span>
            <ArrowUpRight className="w-3 h-3 text-gray-600 group-hover:text-gray-400 ml-auto" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
