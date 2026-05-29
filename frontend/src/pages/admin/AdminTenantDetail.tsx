import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Users, Package,
  CreditCard, CheckCircle, XCircle, Loader2,
  Crown, Calendar, DollarSign, LogIn, Ban, UserCheck, Activity,
  Globe, AlertTriangle, UserPlus,
} from 'lucide-react';
import { api } from '../../services/apiClient';
import toast from 'react-hot-toast';
import { unwrapAdmin } from '../../utils/adminApi';
import AdminUsageProgressBar from '../../components/admin/AdminUsageProgressBar';

interface ProductQuota {
  plan: string;
  current: number;
  max: number;
  unlimited: boolean;
  usagePercent: number;
}

/** GET /admin/tenants/:id/detail — unwrapAdmin ile */
export interface TenantOverviewDetail {
  tenant: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    createdAt: string;
    subdomain: string | null;
    customDomain: string | null;
    domainVerified: boolean;
    status: string;
    trialEndsAt: string | null;
  };
  stats: {
    productCount: number;
    productLimit: number | null;
    activeUsers: number;
    lastLoginAt: string | null;
    createdAt: string;
  };
  plan: {
    name: string;
    expiresAt: string | null;
  };
}

/** GET /admin/tenants/:id/usage — tenant_usage_logs özeti */
interface TenantUsageSummary {
  lastLoginAt: string | null;
  totalLogins: number;
  productCreatedCount: number;
}

interface TenantDetail {
  id: string; name: string; slug: string; isActive: boolean;
  createdAt: string; customDomain: string | null; subdomain: string | null;
  domainVerified?: boolean;
  totalRevenue: number;
  settings: { siteName: string; currency: string } | null;
  _count: { products: number; orders: number; customers: number; coupons: number; posts: number };
  effectivePlan?: string;
  productQuota?: ProductQuota;
  activeUserCount?: number;
  lastUserLoginAt?: string | null;
  usage?: {
    loginsLast30Days: number;
    productsCreatedLast30d: number;
    lastActivityAt: string | null;
  };
  users: Array<{
    id: string; email: string; firstName: string; lastName: string;
    role: string; isActive: boolean; plan: string; createdAt: string;
    lastLoginAt?: string | null;
  }>;
  subscriptions: Array<{
    id: string; plan: string; billingCycle: string; status: string;
    startDate: string; endDate: string; canceledAt: string | null;
    payments: Array<{ id: string; amount: number; status: string; createdAt: string }>;
  }>;
  tenantDomains?: Array<{
    id: string;
    domain: string;
    type: 'subdomain' | 'custom';
    isVerified: boolean;
    createdAt: string;
  }>;
}

const DOMAIN_CNAME_TARGET = import.meta.env.VITE_DOMAIN_CNAME_TARGET || 'app.woontegra.com';
const DOMAIN_A_IPS_HINT = import.meta.env.VITE_DOMAIN_A_IPS || '';

const IMPERSONATION_BACKUP_KEY = 'adminTokenPriorImpersonation';
const PLANS = ['STARTER', 'PRO', 'ENTERPRISE'] as const;

const PLAN_BADGE: Record<string, string> = {
  STARTER:    'bg-blue-900/40 text-blue-300',
  PRO:        'bg-purple-900/40 text-purple-300',
  ENTERPRISE: 'bg-amber-900/40 text-amber-300',
};

const SUB_STATUS: Record<string, string> = {
  ACTIVE:   'text-green-400',
  CANCELED: 'text-orange-400',
  EXPIRED:  'text-red-400',
  PENDING:  'text-yellow-400',
};

const AdminTenantDetail: React.FC = () => {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [overview, setOverview] = useState<TenantOverviewDetail | null>(null);
  const [usageSummary, setUsageSummary] = useState<TenantUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantStatusBusy, setTenantStatusBusy] = useState(false);
  const [dSub, setDSub]       = useState('');
  const [dDom, setDDom]       = useState('');
  const [dVer, setDVer]       = useState(false);
  const [dSaving, setDSaving] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [userActionId, setUserActionId]   = useState<string | null>(null);
  const [quickPlan, setQuickPlan]         = useState<string>('PRO');
  const [quickCycle, setQuickCycle]       = useState<string>('MONTHLY');
  const [quickEnd, setQuickEnd]           = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [quickSaving, setQuickSaving]     = useState(false);
  const [manualAmount, setManualAmount]   = useState('');
  const [manualNote, setManualNote]       = useState('');
  const [manualSaving, setManualSaving]   = useState(false);
  const [subBusyId, setSubBusyId]         = useState<string | null>(null);
  const [verifyDomainId, setVerifyDomainId] = useState<string | null>(null);
  const [addUserOpen, setAddUserOpen]     = useState(false);
  const [addUserBusy, setAddUserBusy]     = useState(false);
  const [auFirstName, setAuFirstName]     = useState('');
  const [auLastName, setAuLastName]       = useState('');
  const [auEmail, setAuEmail]             = useState('');
  const [auPassword, setAuPassword]       = useState('');
  const [auRole, setAuRole]               = useState('OWNER');

  const resetAddUserForm = () => {
    setAuFirstName('');
    setAuLastName('');
    setAuEmail('');
    setAuPassword('');
    setAuRole('OWNER');
  };

  const createTenantUser = async () => {
    if (!tenant) return;
    const email = auEmail.trim();
    if (!email || auPassword.length < 8) {
      toast.error('E-posta ve en az 8 karakterlik şifre gerekli.');
      return;
    }
    setAddUserBusy(true);
    try {
      await api.post(
        '/admin/users',
        {
          email,
          password: auPassword,
          firstName: auFirstName.trim() || 'User',
          lastName: auLastName.trim() || '',
          tenantId: tenant.id,
          role: auRole,
        },
        { skipErrorToast: true },
      );
      toast.success(`${auRole === 'OWNER' ? 'Satıcı (Owner)' : 'Kullanıcı'} oluşturuldu. Mağaza slug ile panele giriş yapabilir.`);
      resetAddUserForm();
      setAddUserOpen(false);
      await loadTenant();
    } catch (e: any) {
      const msg = e?.message || 'Kullanıcı oluşturulamadı.';
      toast.error(msg);
    } finally {
      setAddUserBusy(false);
    }
  };

  const loadTenant = useCallback(async () => {
    if (!id) return;
    try {
      setUsageSummary(null);
      const [fullRes, detailRes] = await Promise.all([
        api.get(`/admin/tenants/${id}`),
        api.get(`/admin/tenants/${id}/detail`),
      ]);
      const t = unwrapAdmin<TenantDetail>(fullRes);
      setTenant(t);
      setOverview(unwrapAdmin<TenantOverviewDetail>(detailRes));
      try {
        const usageRes = await api.get(`/admin/tenants/${id}/usage`);
        setUsageSummary(unwrapAdmin<TenantUsageSummary>(usageRes));
      } catch {
        setUsageSummary(null);
      }
      setDSub(t.subdomain ?? '');
      setDDom(t.customDomain ?? '');
      setDVer(!!t.domainVerified);
    } catch (e: any) {
      toast.error(e?.message || 'Tenant yüklenemedi.');
      navigate('/admin/tenants');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    setLoading(true);
    loadTenant();
  }, [loadTenant]);

  const setTenantActive = async (isActive: boolean) => {
    if (!tenant) return;
    setTenantStatusBusy(true);
    try {
      await api.patch(`/admin/tenants/${tenant.id}/status`, { isActive });
      toast.success(isActive ? 'Mağaza aktifleştirildi.' : 'Mağaza askıya alındı.');
      await loadTenant();
    } catch (e: any) {
      toast.error(e?.message || 'Durum güncellenemedi.');
    } finally {
      setTenantStatusBusy(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
    </div>
  );

  if (!tenant) return null;

  const activeSub = tenant.subscriptions.find(s => s.status === 'ACTIVE');
  const pq = tenant.productQuota;
  const ov = overview;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/admin/tenants')}
          className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">{tenant.name}</h2>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
              tenant.isActive
                ? 'bg-green-900/40 text-green-400'
                : 'bg-red-900/40 text-red-400'
            }`}>
              {tenant.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {tenant.isActive ? 'Aktif' : 'Askıda'}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            {tenant.subdomain || tenant.slug} · {tenant.customDomain || 'Özel domain yok'} · Oluşturulma: {new Date(tenant.createdAt).toLocaleDateString('tr-TR')}
          </p>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500">Hızlı aksiyon</span>
            <span className="text-sm text-gray-300">Mağaza aktif</span>
            <button
              type="button"
              role="switch"
              aria-checked={tenant.isActive}
              aria-busy={tenantStatusBusy}
              disabled={tenantStatusBusy}
              onClick={() => { void setTenantActive(!tenant.isActive); }}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 disabled:opacity-50 ${
                tenant.isActive ? 'bg-emerald-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  tenant.isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            {tenantStatusBusy ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" aria-hidden /> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            disabled={impersonating || !tenant.isActive}
            onClick={async () => {
              if (!tenant) return;
              setImpersonating(true);
              try {
                const cur = localStorage.getItem('token');
                if (cur) sessionStorage.setItem(IMPERSONATION_BACKUP_KEY, cur);
                const res = await api.post('/admin/impersonate', { tenantId: tenant.id });
                const data = unwrapAdmin<{
                  token: string; refreshToken: string; tenantName?: string;
                  user: Record<string, string>;
                }>(res);
                localStorage.setItem('token', data.token);
                if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
                if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
                if (data.tenantName) sessionStorage.setItem('impersonationTenantName', data.tenantName);
                toast.success('Tenant oturumu açılıyor…');
                navigate('/panel');
              } catch (e: any) {
                sessionStorage.removeItem(IMPERSONATION_BACKUP_KEY);
                toast.error(e?.message || 'Kimliğe bürünme başarısız.');
              } finally {
                setImpersonating(false);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50"
          >
            {impersonating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Bu tenant olarak giriş
          </button>
          <Link
            to={`/admin/billing?tenantId=${tenant.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <Crown className="w-4 h-4" />
            Plan Override
          </Link>
        </div>
      </div>

      {/* Domain — tenant_domains + DNS doğrulama */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-sky-400" aria-hidden />
          <h3 className="text-sm font-semibold text-gray-300">Domain &amp; hostname</h3>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2">Kayıtlı hostname&apos;ler</p>
          {!tenant.tenantDomains?.length ? (
            <p className="text-sm text-gray-500">Kayıt yok — aşağıdan kaydedince oluşturulur.</p>
          ) : (
            <ul className="divide-y divide-gray-800 rounded-xl border border-gray-800 overflow-hidden">
              {tenant.tenantDomains.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-950/50"
                >
                  <div>
                    <p className="text-sm font-medium text-white font-mono">{d.domain}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {d.type === 'custom' ? 'Özel domain' : 'Subdomain'} ·{' '}
                      {new Date(d.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded-lg">
                        <CheckCircle className="w-3.5 h-3.5" aria-hidden />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-950/40 px-2 py-1 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
                        Doğrulanmadı
                      </span>
                    )}
                    {d.type === 'custom' && !d.isVerified && (
                      <button
                        type="button"
                        disabled={verifyDomainId === d.id}
                        onClick={async () => {
                          if (!tenant) return;
                          setVerifyDomainId(d.id);
                          try {
                            await api.post(`/admin/tenants/${tenant.id}/domains/verify`, { domainId: d.id });
                            toast.success('DNS doğrulandı.');
                            await loadTenant();
                          } catch (e: any) {
                            toast.error(e?.message || 'Doğrulama başarısız.');
                          } finally {
                            setVerifyDomainId(null);
                          }
                        }}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {verifyDomainId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        Doğrula
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-amber-900/35 bg-amber-950/15 p-4 space-y-3">
          <h4 className="text-sm font-medium text-amber-200/95">Domain nasıl bağlanır?</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            DNS panelinde mağaza hostname&apos;inizi platforma yönlendirin. Ardından <strong className="text-gray-300">Doğrula</strong> ile kontrol edilir
            (backend <code className="text-gray-500">DOMAIN_VERIFY_*</code> değişkenleri ile uyumlu olmalı).
          </p>
          <div className="font-mono text-[11px] sm:text-xs bg-black/35 rounded-lg p-3 text-gray-300 space-y-2 border border-gray-800/80">
            <p>
              <span className="text-gray-500">CNAME</span>{' '}
              <span className="text-sky-300">shop</span>
              <span className="text-gray-600"> → </span>
              <span className="text-emerald-300">{DOMAIN_CNAME_TARGET}</span>
            </p>
            <p className="text-gray-600">veya kök (apex) için</p>
            <p>
              <span className="text-gray-500">A</span>
              <span className="text-gray-600"> @ → </span>
              <span className="text-emerald-300/90">
                {DOMAIN_A_IPS_HINT || 'Sunucu IPv4 (VITE_DOMAIN_A_IPS)'}
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-gray-800">
          <p className="text-xs text-gray-500">Tenant alanlarını düzenle (kayıtlar senkronlanır)</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">Subdomain</label>
              <input
                value={dSub}
                onChange={e => setDSub(e.target.value)}
                className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Özel domain</label>
              <input
                value={dDom}
                onChange={e => setDDom(e.target.value)}
                className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={dVer} onChange={e => setDVer(e.target.checked)} className="rounded border-gray-600" />
            Domain doğrulandı (manuel — acil durum; üretimde DNS doğrulaması önerilir)
          </label>
          <button
            type="button"
            disabled={dSaving}
            onClick={async () => {
              if (!tenant) return;
              setDSaving(true);
              try {
                await api.patch(`/admin/tenants/${tenant.id}/domains`, {
                  subdomain: dSub.trim() || null,
                  customDomain: dDom.trim() || null,
                  domainVerified: dVer,
                });
                toast.success('Domain bilgileri güncellendi.');
                await loadTenant();
              } catch (e: any) {
                toast.error(e?.message || 'Kaydedilemedi.');
              } finally {
                setDSaving(false);
              }
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {dSaving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* Özet kartları — GET /admin/tenants/:id/detail */}
      {ov && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 flex flex-col min-h-[140px]">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <Package className="w-4 h-4" />
              Ürün kotası
            </div>
            <p className="mt-3 text-2xl font-bold text-white tabular-nums">
              {ov.stats.productLimit == null
                ? <><span className="text-emerald-400">{ov.stats.productCount}</span><span className="text-gray-500 text-lg font-normal"> / ∞</span></>
                : <><span>{ov.stats.productCount}</span><span className="text-gray-500 text-lg font-normal"> / {ov.stats.productLimit}</span></>}
            </p>
            {ov.stats.productLimit != null && ov.stats.productLimit > 0 && (
              <AdminUsageProgressBar
                className="mt-auto pt-4"
                current={ov.stats.productCount}
                max={ov.stats.productLimit}
              />
            )}
            {ov.stats.productLimit == null && (
              <p className="mt-auto pt-2 text-xs text-gray-500">Enterprise — sınırsız ürün</p>
            )}
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <Users className="w-4 h-4" />
              Aktif kullanıcı
            </div>
            <p className="mt-3 text-3xl font-bold text-white tabular-nums">{ov.stats.activeUsers}</p>
            <p className="mt-2 text-xs text-gray-500">
              Toplam kayıtlı: {tenant.users.length}
            </p>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <Calendar className="w-4 h-4" />
              Son giriş
            </div>
            <p className="mt-3 text-lg font-semibold text-white leading-snug">
              {ov.stats.lastLoginAt
                ? new Date(ov.stats.lastLoginAt).toLocaleString('tr-TR')
                : '—'}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Mağaza: {new Date(ov.stats.createdAt).toLocaleDateString('tr-TR')}
            </p>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <Crown className="w-4 h-4 text-amber-400/90" />
              Plan
            </div>
            <p className="mt-3 text-xl font-bold text-white">{ov.plan.name}</p>
            <p className="mt-2 text-sm text-gray-400">
              {ov.plan.expiresAt
                ? <>Bitiş: <span className="text-gray-200">{new Date(ov.plan.expiresAt).toLocaleDateString('tr-TR')}</span></>
                : <span className="text-gray-500">Aktif abonelik bitiş tarihi yok</span>}
            </p>
          </div>
        </div>
      )}

      {/* Aktivite — tenant_usage_logs (LOGIN / PRODUCT_CREATE) */}
      {usageSummary != null && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" aria-hidden />
            Aktivite
          </h3>
          <p className="text-xs text-gray-500 -mt-2">
            Giriş ve ürün oluşturma olaylarından türetilen özet (kayıt bazlı).
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-gray-950/80 border border-gray-800/80 p-4">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Son giriş</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {usageSummary.lastLoginAt
                  ? new Date(usageSummary.lastLoginAt).toLocaleString('tr-TR')
                  : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-gray-950/80 border border-gray-800/80 p-4">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Toplam giriş</p>
              <p className="mt-2 text-2xl font-bold text-white tabular-nums">{usageSummary.totalLogins}</p>
            </div>
            <div className="rounded-xl bg-gray-950/80 border border-gray-800/80 p-4">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Eklenen ürün</p>
              <p className="mt-2 text-2xl font-bold text-white tabular-nums">{usageSummary.productCreatedCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Ek metrikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
          <p className="text-[11px] text-gray-500 uppercase">Siparişler</p>
          <p className="text-xl font-bold text-white mt-1">{tenant._count.orders}</p>
        </div>
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
          <p className="text-[11px] text-gray-500 uppercase">Müşteriler</p>
          <p className="text-xl font-bold text-white mt-1">{tenant._count.customers}</p>
        </div>
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
          <p className="text-[11px] text-gray-500 uppercase">Toplam gelir</p>
          <p className="text-xl font-bold text-white mt-1">₺{Number(tenant.totalRevenue).toLocaleString('tr-TR')}</p>
        </div>
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
          <p className="text-[11px] text-gray-500 uppercase">Efektif plan (raw)</p>
          <p className="text-lg font-semibold text-white mt-1">{tenant.effectivePlan ?? pq?.plan ?? '—'}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-1 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm">
          <p className="text-xs text-gray-500 mb-2">Kullanım (son 30 gün)</p>
          <ul className="text-gray-300 space-y-1">
            <li>Giriş kayıtları: <span className="text-white font-medium">{tenant.usage?.loginsLast30Days ?? '—'}</span></li>
            <li>Ürün oluşturma: <span className="text-white font-medium">{tenant.usage?.productsCreatedLast30d ?? '—'}</span></li>
            <li>Son aktivite: <span className="text-white font-medium">
              {tenant.usage?.lastActivityAt
                ? new Date(tenant.usage.lastActivityAt).toLocaleString('tr-TR')
                : '—'}
            </span></li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300">Hızlı plan değişikliği</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500">Plan</label>
            <select
              value={quickPlan}
              onChange={e => setQuickPlan(e.target.value)}
              className="mt-1 block bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
            >
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Döngü</label>
            <select
              value={quickCycle}
              onChange={e => setQuickCycle(e.target.value)}
              className="mt-1 block bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
            >
              <option value="MONTHLY">MONTHLY</option>
              <option value="YEARLY">YEARLY</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Bitiş</label>
            <input
              type="date"
              value={quickEnd}
              onChange={e => setQuickEnd(e.target.value)}
              className="mt-1 block bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            type="button"
            disabled={quickSaving}
            onClick={async () => {
              if (!tenant) return;
              setQuickSaving(true);
              try {
                await api.post('/admin/subscription/change', {
                  tenantId: tenant.id,
                  plan: quickPlan,
                  billingCycle: quickCycle,
                  endDate: quickEnd,
                });
                toast.success('Plan güncellendi.');
                await loadTenant();
              } catch (e: any) {
                toast.error(e?.message || 'Plan güncellenemedi.');
              } finally {
                setQuickSaving(false);
              }
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {quickSaving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : null} Uygula
          </button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" /> Manuel ödeme
        </h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-gray-500">Tutar (TRY)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={manualAmount}
              onChange={e => setManualAmount(e.target.value)}
              className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="flex-[2] min-w-[160px]">
            <label className="text-xs text-gray-500">Not</label>
            <input
              value={manualNote}
              onChange={e => setManualNote(e.target.value)}
              className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
              placeholder="Örn. Havale — Aralık"
            />
          </div>
          <button
            type="button"
            disabled={manualSaving}
            onClick={async () => {
              if (!tenant) return;
              const amt = parseFloat(manualAmount.replace(',', '.'));
              if (!Number.isFinite(amt) || amt <= 0) {
                toast.error('Geçerli tutar girin.');
                return;
              }
              setManualSaving(true);
              try {
                await api.post('/admin/billing/manual-payment', {
                  tenantId: tenant.id,
                  amount: amt,
                  currency: 'TRY',
                  note: manualNote.trim() || undefined,
                });
                toast.success('Ödeme kaydı oluşturuldu.');
                setManualAmount('');
                setManualNote('');
                await loadTenant();
              } catch (e: any) {
                toast.error(e?.message || 'Kayıt oluşturulamadı.');
              } finally {
                setManualSaving(false);
              }
            }}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {manualSaving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : null} Kaydet
          </button>
        </div>
      </div>

      {/* Active subscription */}
      {activeSub && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-400" /> Aktif Abonelik
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Plan</p>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${PLAN_BADGE[activeSub.plan]}`}>
                {activeSub.plan}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Döngü</p>
              <p className="text-sm text-white">{activeSub.billingCycle === 'MONTHLY' ? 'Aylık' : 'Yıllık'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Başlangıç</p>
              <p className="text-sm text-white">{new Date(activeSub.startDate).toLocaleDateString('tr-TR')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Bitiş</p>
              <p className="text-sm text-white">{new Date(activeSub.endDate).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Users className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-300">Kullanıcılar ({tenant.users.length})</h3>
          </div>
          <button
            type="button"
            onClick={() => setAddUserOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-violet-700/80 hover:bg-violet-600 text-white transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {addUserOpen ? 'Formu Gizle' : 'Satıcı / Owner Ekle'}
          </button>
        </div>

        {addUserOpen && (
          <div className="px-6 py-5 border-b border-gray-800 bg-gray-950/40 space-y-4">
            <div>
              <p className="text-sm font-semibold text-white">Satıcı / Owner Ekle</p>
              <p className="text-xs text-gray-500 mt-1">
                Kullanıcı <span className="text-gray-400 font-medium">{tenant.name}</span> mağazasına atanır
                (slug: <span className="font-mono text-gray-400">{tenant.slug}</span>).
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ad</label>
                <input
                  value={auFirstName}
                  onChange={e => setAuFirstName(e.target.value)}
                  placeholder="Ad"
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Soyad</label>
                <input
                  value={auLastName}
                  onChange={e => setAuLastName(e.target.value)}
                  placeholder="Soyad"
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">E-posta *</label>
                <input
                  type="email"
                  value={auEmail}
                  onChange={e => setAuEmail(e.target.value)}
                  placeholder="satici@ornek.com"
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Şifre * (min 8)</label>
                <input
                  type="password"
                  value={auPassword}
                  onChange={e => setAuPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Rol</label>
                <select
                  value={auRole}
                  onChange={e => setAuRole(e.target.value)}
                  className="w-full sm:max-w-xs bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="OWNER">OWNER (Satıcı / mağaza sahibi)</option>
                  <option value="ADMIN">ADMIN (panel yöneticisi)</option>
                  <option value="STAFF">STAFF (personel)</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setAddUserOpen(false); resetAddUserForm(); }}
                className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-800"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={addUserBusy}
                onClick={() => void createTenantUser()}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 flex items-center gap-2"
              >
                {addUserBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Kullanıcı Oluştur
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-800/60">
          {tenant.users.map((u) => (
            <div key={u.id} className="px-6 py-3 flex flex-wrap items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
                {(u.firstName?.[0] ?? '?')}{(u.lastName?.[0] ?? '')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{u.firstName} {u.lastName}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Son giriş: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('tr-TR') : '—'}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                u.role === 'OWNER'    ? 'bg-amber-900/40 text-amber-300' :
                u.role === 'ADMIN'    ? 'bg-blue-900/40 text-blue-300' :
                u.role === 'MANAGER'  ? 'bg-purple-900/40 text-purple-300' :
                u.role === 'STAFF'    ? 'bg-teal-900/40 text-teal-300' :
                'bg-gray-800 text-gray-400'
              }`}>{u.role}</span>
              <span className={`text-xs ${u.isActive ? 'text-green-400' : 'text-red-400'}`}>
                {u.isActive ? 'Aktif' : 'Pasif'}
              </span>
              <div className="flex gap-2 ml-auto">
                {u.isActive ? (
                  <button
                    type="button"
                    disabled={userActionId === u.id}
                    onClick={async () => {
                      setUserActionId(u.id);
                      try {
                        await api.post('/admin/user/ban', { userId: u.id, reason: 'admin_tenant_detail' });
                        toast.success('Kullanıcı pasif yapıldı.');
                        await loadTenant();
                      } catch (e: any) {
                        toast.error(e?.message || 'İşlem başarısız.');
                      } finally {
                        setUserActionId(null);
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-red-900/40 text-red-300 hover:bg-red-900/60 disabled:opacity-50"
                  >
                    {userActionId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                    Pasif
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={userActionId === u.id}
                    onClick={async () => {
                      setUserActionId(u.id);
                      try {
                        await api.post('/admin/user/unban', { userId: u.id });
                        toast.success('Kullanıcı aktifleştirildi.');
                        await loadTenant();
                      } catch (e: any) {
                        toast.error(e?.message || 'İşlem başarısız.');
                      } finally {
                        setUserActionId(null);
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-green-900/40 text-green-300 hover:bg-green-900/60 disabled:opacity-50"
                  >
                    {userActionId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                    Aktif
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription history */}
      {tenant.subscriptions.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-300">Abonelik Geçmişi</h3>
          </div>
          <div className="divide-y divide-gray-800/60">
            {tenant.subscriptions.map((s) => (
              <div key={s.id} className="px-6 py-3 flex flex-wrap items-center gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PLAN_BADGE[s.plan]}`}>
                  {s.plan}
                </span>
                <span className={`text-xs ${SUB_STATUS[s.status] || 'text-gray-400'}`}>{s.status}</span>
                <span className="text-xs text-gray-500">
                  {new Date(s.startDate).toLocaleDateString('tr-TR')} — {new Date(s.endDate).toLocaleDateString('tr-TR')}
                </span>
                <div className="flex gap-2 ml-auto">
                  {s.status === 'ACTIVE' ? (
                    <button
                      type="button"
                      disabled={subBusyId === s.id}
                      onClick={async () => {
                        setSubBusyId(s.id);
                        try {
                          await api.patch(`/admin/billing/subscriptions/${s.id}/status`, { status: 'CANCELED' });
                          toast.success('Abonelik durduruldu.');
                          await loadTenant();
                        } catch (e: any) {
                          toast.error(e?.message || 'İşlem başarısız.');
                        } finally {
                          setSubBusyId(null);
                        }
                      }}
                      className="text-xs px-2 py-1 rounded-lg bg-orange-900/40 text-orange-200 hover:bg-orange-900/60 disabled:opacity-50"
                    >
                      {subBusyId === s.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : null} Durdur
                    </button>
                  ) : s.status === 'CANCELED' ? (
                    <button
                      type="button"
                      disabled={subBusyId === s.id}
                      onClick={async () => {
                        setSubBusyId(s.id);
                        try {
                          await api.patch(`/admin/billing/subscriptions/${s.id}/status`, { status: 'ACTIVE' });
                          toast.success('Abonelik yeniden aktif.');
                          await loadTenant();
                        } catch (e: any) {
                          toast.error(e?.message || 'İşlem başarısız.');
                        } finally {
                          setSubBusyId(null);
                        }
                      }}
                      className="text-xs px-2 py-1 rounded-lg bg-green-900/40 text-green-200 hover:bg-green-900/60 disabled:opacity-50"
                    >
                      {subBusyId === s.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : null} Başlat
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTenantDetail;
