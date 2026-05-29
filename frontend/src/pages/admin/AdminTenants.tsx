import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Filter, CheckCircle, XCircle, Eye, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, Building2, RefreshCw, MoreVertical,
  Crown, CalendarPlus, ShieldOff, ShieldCheck, Trash2,
  Users, Package, ShoppingCart, Clock, Plus, LogIn,
} from 'lucide-react';
import { api } from '../../services/apiClient';
import toast from 'react-hot-toast';
import { unwrapAdmin } from '../../utils/adminApi';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Subscription {
  plan: string; status: string; startDate: string; endDate: string;
}
interface Tenant {
  id: string; name: string; slug: string; isActive: boolean;
  status: string; createdAt: string; subdomain: string | null;
  _count: { users: number; products: number; orders: number };
  subscriptions: Subscription[];
  users: Array<{ email: string; firstName: string; lastName: string; plan: string }>;
}
interface Page {
  tenants: Tenant[]; total: number; page: number; limit: number; totalPages: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PLANS = ['STARTER', 'PRO', 'ENTERPRISE'] as const;
type Plan = typeof PLANS[number];

/** Tenant oluşturma modalında seçilebilir paketler */
const CREATE_PLAN_OPTIONS = [
  { value: 'TRIAL',       label: 'Trial / Demo', hint: '14 gün deneme, abonelik oluşturulmaz' },
  { value: 'STARTER',     label: 'Starter',      hint: 'Aktif abonelik — aylık varsayılan' },
  { value: 'PRO',         label: 'Professional', hint: 'Pro plan — aktif abonelik' },
  { value: 'ENTERPRISE',  label: 'Enterprise',   hint: 'Kurumsal plan — aktif abonelik' },
] as const;
type CreatePlanValue = typeof CREATE_PLAN_OPTIONS[number]['value'];

const BILLING_CYCLES = ['MONTHLY', 'YEARLY'] as const;

const PLAN_BADGE: Record<string, string> = {
  STARTER:    'bg-blue-900/40 text-blue-300 border-blue-700/50',
  PRO:        'bg-purple-900/40 text-purple-300 border-purple-700/50',
  ENTERPRISE: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
};
const PLAN_ICON: Record<string, string> = {
  STARTER: '🚀', PRO: '⚡', ENTERPRISE: '👑',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    'bg-green-900/30 text-green-400 border-green-700/40',
  TRIAL:     'bg-blue-900/30  text-blue-400  border-blue-700/40',
  PAST_DUE:  'bg-amber-900/30 text-amber-400 border-amber-700/40',
  SUSPENDED: 'bg-red-900/30   text-red-400   border-red-700/40',
  CANCELED:  'bg-gray-800     text-gray-500  border-gray-700',
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Aktif', TRIAL: 'Trial', PAST_DUE: 'Gecikmiş',
  SUSPENDED: 'Askıda', CANCELED: 'İptal',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function isExpired(d: string | null | undefined) {
  if (!d) return false;
  return new Date(d) < new Date();
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Dropdown action menu per row — rendered in a portal to avoid overflow/scroll issues */
const IMPERSONATION_BACKUP_KEY = 'adminTokenPriorImpersonation';

const ActionMenu: React.FC<{
  tenant: Tenant;
  onPlan:    () => void;
  onExtend:  () => void;
  onSuspend: () => void;
  onDelete:  () => void;
  onPanel:   () => void;
  disabled:  boolean;
}> = ({ tenant, onPlan, onExtend, onSuspend, onDelete, onPanel, disabled }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, right: 0 });
  const btnRef          = useRef<HTMLButtonElement>(null);
  const menuRef         = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top:   rect.bottom + window.scrollY + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isSuspended = tenant.status === 'SUSPENDED';

  const items = [
    { icon: Eye,          label: 'Detay',          onClick: undefined, to: `/admin/tenants/${tenant.id}`, color: 'text-gray-300' },
    { icon: LogIn,        label: 'Panele Gir',     onClick: onPanel,   to: undefined, color: 'text-violet-400' },
    { icon: Crown,        label: 'Plan Değiştir',   onClick: onPlan,    to: undefined, color: 'text-purple-400' },
    { icon: CalendarPlus, label: 'Abonelik Uzat',   onClick: onExtend,  to: undefined, color: 'text-blue-400' },
    {
      icon: isSuspended ? ShieldCheck : ShieldOff,
      label: isSuspended ? 'Aktifleştir' : 'Askıya Al',
      onClick: onSuspend, to: undefined,
      color: isSuspended ? 'text-green-400' : 'text-amber-400',
    },
    { icon: Trash2, label: 'Sil', onClick: onDelete, to: undefined, color: 'text-red-400', divider: true },
  ];

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={disabled}
        className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-40"
        title="Aksiyonlar"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
          style={{ top: pos.top, right: pos.right }}
        >
          {items.map((item) => (
            <React.Fragment key={item.label}>
              {item.divider && <div className="border-t border-gray-800 my-1" />}
              {item.to ? (
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-gray-800 transition-colors ${item.color}`}
                >
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {item.label}
                </Link>
              ) : (
                <button
                  onClick={() => { setOpen(false); item.onClick?.(); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-gray-800 transition-colors ${item.color}`}
                >
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {item.label}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
};

// ── Plan Change Modal ─────────────────────────────────────────────────────────

const PlanModal: React.FC<{
  tenant: Tenant; onClose: () => void; onDone: () => void;
}> = ({ tenant, onClose, onDone }) => {
  const sub = tenant.subscriptions[0];
  const [plan, setPlan]       = useState<Plan>((sub?.plan as Plan) || 'STARTER');
  const [cycle, setCycle]     = useState('MONTHLY');
  const [endDate, setEndDate] = useState(() => {
    const d = sub?.endDate ? new Date(sub.endDate) : new Date();
    if (d < new Date()) d.setFullYear(new Date().getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!endDate) return toast.error('Bitiş tarihi zorunlu.');
    setLoading(true);
    try {
      await api.post('/admin/subscription/change', {
        tenantId: tenant.id, plan, billingCycle: cycle,
        endDate: new Date(endDate).toISOString(),
      });
      toast.success(`Plan ${plan} olarak güncellendi.`);
      onDone();
    } catch (e: any) {
      toast.error(e?.message || 'Plan değiştirilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Plan Değiştir" onClose={onClose}>
      <p className="text-gray-400 text-sm mb-4">
        <strong className="text-white">{tenant.name}</strong> için plan değiştiriliyor.
      </p>

      {/* Plan cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {PLANS.map(p => (
          <button
            key={p}
            onClick={() => setPlan(p)}
            className={`rounded-xl border p-3 text-center transition-all ${
              plan === p
                ? 'border-indigo-500 bg-indigo-900/30'
                : 'border-gray-700 bg-gray-800/40 hover:border-gray-600'
            }`}
          >
            <div className="text-lg mb-1">{PLAN_ICON[p]}</div>
            <div className={`text-xs font-semibold ${plan === p ? 'text-indigo-300' : 'text-gray-400'}`}>
              {p}
            </div>
          </button>
        ))}
      </div>

      {/* Billing cycle */}
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1.5">Fatura Dönemi</label>
        <div className="grid grid-cols-2 gap-2">
          {BILLING_CYCLES.map(c => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`py-2 rounded-xl border text-xs font-medium transition-all ${
                cycle === c
                  ? 'border-indigo-500 bg-indigo-900/30 text-indigo-300'
                  : 'border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-600'
              }`}
            >
              {c === 'MONTHLY' ? 'Aylık' : 'Yıllık'}
            </button>
          ))}
        </div>
      </div>

      {/* End date */}
      <div className="mb-6">
        <label className="block text-xs text-gray-500 mb-1.5">Abonelik Bitiş Tarihi</label>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500"
        />
      </div>

      <ModalActions
        onConfirm={submit} onClose={onClose}
        loading={loading} confirmLabel="Planı Güncelle" confirmColor="bg-indigo-600 hover:bg-indigo-700"
      />
    </Modal>
  );
};

// ── Extend Subscription Modal ─────────────────────────────────────────────────

const ExtendModal: React.FC<{
  tenant: Tenant; onClose: () => void; onDone: () => void;
}> = ({ tenant, onClose, onDone }) => {
  const [days, setDays]       = useState(30);
  const [loading, setLoading] = useState(false);
  const sub = tenant.subscriptions[0];

  const presets = [7, 14, 30, 90, 180, 365];

  const submit = async () => {
    if (!days || days < 1) return toast.error('Geçerli bir gün sayısı girin.');
    setLoading(true);
    try {
      await api.post('/admin/tenant/extend-subscription', { tenantId: tenant.id, days });
      toast.success(`Abonelik ${days} gün uzatıldı.`);
      onDone();
    } catch (e: any) {
      toast.error(e?.message || 'Abonelik uzatılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Abonelik Süresini Uzat" onClose={onClose}>
      <p className="text-gray-400 text-sm mb-1">
        <strong className="text-white">{tenant.name}</strong>
      </p>
      {sub && (
        <p className="text-xs text-gray-500 mb-4">
          Mevcut bitiş:{' '}
          <span className={isExpired(sub.endDate) ? 'text-red-400' : 'text-gray-300'}>
            {fmtDate(sub.endDate)}
            {isExpired(sub.endDate) && ' (süresi dolmuş)'}
          </span>
        </p>
      )}

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map(p => (
          <button
            key={p}
            onClick={() => setDays(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              days === p
                ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
            }`}
          >
            {p} gün
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="mb-6">
        <label className="block text-xs text-gray-500 mb-1.5">Özel Gün Sayısı</label>
        <input
          type="number" min={1} max={3650}
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
        />
        {days > 0 && (
          <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Yeni bitiş tarihi:{' '}
            {(() => {
              const base = sub?.endDate && !isExpired(sub.endDate)
                ? new Date(sub.endDate)
                : new Date();
              base.setDate(base.getDate() + days);
              return base.toLocaleDateString('tr-TR');
            })()}
          </p>
        )}
      </div>

      <ModalActions
        onConfirm={submit} onClose={onClose}
        loading={loading} confirmLabel="Uzat" confirmColor="bg-blue-600 hover:bg-blue-700"
      />
    </Modal>
  );
};

// ── Confirm Modal ─────────────────────────────────────────────────────────────

const ConfirmModal: React.FC<{
  tenant: Tenant; type: 'suspend' | 'activate' | 'delete';
  onClose: () => void; onDone: () => void;
}> = ({ tenant, type, onClose, onDone }) => {
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);

  const META = {
    suspend:  { title: 'Tenant Askıya Al',    color: 'bg-amber-600 hover:bg-amber-700', label: 'Askıya Al' },
    activate: { title: 'Tenant Aktifleştir',  color: 'bg-green-600 hover:bg-green-700', label: 'Aktifleştir' },
    delete:   { title: 'Tenant Kalıcı Sil',   color: 'bg-red-600 hover:bg-red-700',     label: 'Kalıcı Sil' },
  }[type];

  const submit = async () => {
    setLoading(true);
    try {
      if (type === 'suspend') {
        await api.post('/admin/tenant/suspend', { tenantId: tenant.id, reason });
        toast.success('Tenant askıya alındı.');
      } else if (type === 'activate') {
        await api.post('/admin/tenant/activate', { tenantId: tenant.id });
        toast.success('Tenant aktifleştirildi.');
      } else {
        await api.delete(`/admin/tenant/${tenant.id}`);
        toast.success('Tenant silindi.');
      }
      onDone();
    } catch (e: any) {
      toast.error(e?.message || 'İşlem başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={META.title} onClose={onClose}>
      <p className="text-gray-400 text-sm mb-4">
        <strong className="text-white">{tenant.name}</strong>{' '}
        {type === 'suspend'  && 'adlı tenant askıya alınacak. Kullanıcıları erişemez hale gelecek.'}
        {type === 'activate' && 'adlı tenant yeniden aktifleştirilecek.'}
        {type === 'delete'   && 'adlı tenant TÜM VERİSİYLE kalıcı olarak silinecek. Bu işlem GERİ ALINAMAZ!'}
      </p>

      {type === 'delete' && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-3 mb-4 text-xs text-red-400">
          ⚠ Tüm ürünler, siparişler, müşteriler ve kullanıcılar silinecek.
        </div>
      )}

      {(type === 'suspend' || type === 'delete') && (
        <div className="mb-5">
          <label className="block text-xs text-gray-500 mb-1.5">
            Neden? {type === 'delete' ? '(zorunlu)' : '(opsiyonel)'}
          </label>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Sebebi yazın..."
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500"
          />
        </div>
      )}

      <ModalActions
        onConfirm={submit} onClose={onClose}
        loading={loading}
        disabled={type === 'delete' && !reason.trim()}
        confirmLabel={META.label}
        confirmColor={META.color}
      />
    </Modal>
  );
};

// ── Shared Modal Shell ────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h3 className="text-white font-bold text-base">{title}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
          <XCircle className="w-5 h-5" />
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  </div>
);

const ModalActions: React.FC<{
  onConfirm: () => void; onClose: () => void;
  loading?: boolean; disabled?: boolean;
  confirmLabel?: string; confirmColor?: string;
}> = ({ onConfirm, onClose, loading, disabled, confirmLabel = 'Onayla', confirmColor = 'bg-indigo-600 hover:bg-indigo-700' }) => (
  <div className="flex gap-3">
    <button
      onClick={onConfirm}
      disabled={loading || disabled}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm text-white transition-colors ${confirmColor} disabled:opacity-50`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {confirmLabel}
    </button>
    <button
      onClick={onClose}
      className="flex-1 border border-gray-700 text-gray-400 hover:text-white py-2.5 rounded-xl text-sm transition-colors"
    >
      İptal
    </button>
  </div>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────

const StatPill: React.FC<{ icon: React.ElementType; label: string; value: number; color: string }> = ({
  icon: Icon, label, value, color,
}) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 border border-gray-800`}>
    <Icon className={`w-4 h-4 ${color}`} />
    <div>
      <p className="text-white text-sm font-semibold">{value}</p>
      <p className="text-gray-500 text-[10px]">{label}</p>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'plan' | 'extend' | 'suspend' | 'activate' | 'delete'; tenant: Tenant }
  | null;

const AdminTenants: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData]       = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('all');
  const [page, setPage]       = useState(1);
  const [actingId, setActingId] = useState<string | null>(null);
  const [modal, setModal]     = useState<ModalState>(null);

  const [createOpen, setCreateOpen]     = useState(false);
  const [createBusy, setCreateBusy]     = useState(false);
  const [cName, setCName]               = useState('');
  const [cSlug, setCSlug]               = useState('');
  const [cSub, setCSub]                 = useState('');
  const [cDomain, setCDomain]           = useState('');
  const [cOwnerEmail, setCOwnerEmail]   = useState('');
  const [cOwnerPass, setCOwnerPass]   = useState('');
  const [cOwnerFn, setCOwnerFn]       = useState('');
  const [cOwnerLn, setCOwnerLn]       = useState('');
  const [cPlan, setCPlan]             = useState<CreatePlanValue>('TRIAL');

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: '20',
        ...(search && { search }),
        ...(status !== 'all' && { status }),
      });
      const res = await api.get(`/admin/tenants?${params}`);
      setData(unwrapAdmin<Page>(res));
    } catch (e: any) {
      toast.error(e?.message || 'Yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  const closeModal = () => setModal(null);
  const doneModal  = () => { closeModal(); fetchTenants(); };

  const goTenantPanel = async (tenant: Tenant) => {
    if (!tenant.isActive) {
      toast.error('Askıdaki tenant için panele girilemez.');
      return;
    }
    setActingId(tenant.id);
    try {
      const prev = localStorage.getItem('token');
      if (prev) sessionStorage.setItem(IMPERSONATION_BACKUP_KEY, prev);
      const res = await api.post('/admin/impersonate', { tenantId: tenant.id });
      const out = unwrapAdmin<{
        token: string;
        refreshToken: string;
        tenantId: string;
        impersonating: boolean;
        tenantName?: string;
        user: Record<string, unknown>;
      }>(res);
      localStorage.setItem('token', out.token);
      if (out.refreshToken) localStorage.setItem('refreshToken', out.refreshToken);
      if (out.user) localStorage.setItem('user', JSON.stringify(out.user));
      if (out.tenantName) sessionStorage.setItem('impersonationTenantName', out.tenantName);
      toast.success('Panele yönlendiriliyorsunuz…');
      navigate('/panel');
    } catch (e: any) {
      sessionStorage.removeItem(IMPERSONATION_BACKUP_KEY);
      toast.error(e?.message || 'Panele giriş başarısız.');
    } finally {
      setActingId(null);
    }
  };

  // Quick summary from loaded data
  const statusCounts = data?.tenants?.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {}) ?? {};

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Tenant Yönetimi</h2>
          <p className="text-gray-500 text-sm mt-0.5">{data ? `${data.total} tenant` : '…'}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Tenant
          </button>
          <button
            onClick={fetchTenants}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>
      </div>

      {/* Status summary pills */}
      {data && (
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'ACTIVE',    label: 'Aktif',    Icon: CheckCircle, color: 'text-green-400' },
            { key: 'TRIAL',     label: 'Trial',    Icon: Clock,       color: 'text-blue-400' },
            { key: 'PAST_DUE',  label: 'Gecikmiş', Icon: AlertCircle, color: 'text-amber-400' },
            { key: 'SUSPENDED', label: 'Askıda',   Icon: ShieldOff,   color: 'text-red-400' },
          ].map(({ key, label, Icon, color }) => (
            <StatPill key={key} icon={Icon} label={label} value={statusCounts[key] ?? 0} color={color} />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="İsim, slug veya subdomain ara..."
            className="w-full bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-600 text-sm pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500" />
          {[
            { value: 'all',       label: 'Tümü'     },
            { value: 'active',    label: 'Aktif'    },
            { value: 'trial',     label: 'Trial'    },
            { value: 'past_due',  label: 'Gecikmiş' },
            { value: 'suspended', label: 'Askıda'   },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setStatus(value); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                status === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : !data?.tenants?.length ? (
          <div className="py-20 text-center">
            <Building2 className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Tenant bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {[
                    { label: 'Tenant',         icon: Building2 },
                    { label: 'Admin',          icon: null },
                    { label: 'Plan',           icon: Crown },
                    { label: 'Durum',          icon: null },
                    { label: 'Kullanıcı',      icon: Users },
                    { label: 'Ürün / Sipariş', icon: Package },
                    { label: 'Kayıt',          icon: null },
                    { label: '',               icon: null },
                  ].map(({ label, icon: Icon }, i) => (
                    <th
                      key={i}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      <span className="flex items-center gap-1.5">
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        {label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {data?.tenants?.map((t) => {
                  const sub  = t.subscriptions?.[0];
                  const adm  = t.users?.[0];
                  const busy = actingId === t.id;
                  const subExpired = sub ? isExpired(sub.endDate) : false;

                  return (
                    <tr key={t.id} className="hover:bg-gray-800/40 transition-colors group">

                      {/* Tenant name */}
                      <td className="px-4 py-3">
                        <Link to={`/admin/tenants/${t.id}`} className="group/link">
                          <p className="text-white font-medium group-hover/link:text-blue-400 transition-colors leading-tight">
                            {t.name}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{t.subdomain || t.slug}</p>
                        </Link>
                      </td>

                      {/* Admin user */}
                      <td className="px-4 py-3">
                        {adm ? (
                          <div>
                            <p className="text-gray-300 text-xs leading-tight">
                              {adm.firstName} {adm.lastName}
                            </p>
                            <p className="text-gray-600 text-[11px] mt-0.5">{adm.email}</p>
                          </div>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>

                      {/* Plan + dates */}
                      <td className="px-4 py-3">
                        {sub ? (
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${PLAN_BADGE[sub.plan] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                              {PLAN_ICON[sub.plan]} {sub.plan}
                            </span>
                            <p className={`text-[10px] leading-tight ${subExpired ? 'text-red-400' : 'text-gray-500'}`}>
                              {subExpired ? '⚠ ' : ''}
                              {fmtDate(sub.startDate)} → {fmtDate(sub.endDate)}
                            </p>
                          </div>
                        ) : t.status === 'TRIAL' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-blue-900/30 text-blue-300 border-blue-700/40">
                            Trial / Demo
                          </span>
                        ) : (
                          <span className="text-gray-600 text-xs">Abonelik yok</span>
                        )}
                      </td>

                      {/* Lifecycle status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${STATUS_BADGE[t.status] || STATUS_BADGE.ACTIVE}`}>
                          {['ACTIVE', 'TRIAL'].includes(t.status)
                            ? <CheckCircle className="w-3 h-3" />
                            : <XCircle className="w-3 h-3" />}
                          {STATUS_LABEL[t.status] ?? t.status}
                        </span>
                      </td>

                      {/* User count */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <Users className="w-3 h-3" />
                          {t._count?.users ?? 0}
                        </span>
                      </td>

                      {/* Product / order stats */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                            <Package className="w-3 h-3" /> {t._count?.products ?? 0} ürün
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                            <ShoppingCart className="w-3 h-3" /> {t._count?.orders ?? 0} sipariş
                          </span>
                        </div>
                      </td>

                      {/* Created date */}
                      <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap">
                        {fmtDate(t.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <ActionMenu
                          tenant={t}
                          disabled={busy}
                          onPlan    ={() => setModal({ type: 'plan',    tenant: t })}
                          onExtend  ={() => setModal({ type: 'extend',  tenant: t })}
                          onSuspend ={() => setModal({ type: t.status === 'SUSPENDED' ? 'activate' : 'suspend', tenant: t })}
                          onDelete  ={() => setModal({ type: 'delete',  tenant: t })}
                          onPanel   ={() => { void goTenantPanel(t); }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} / {data.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-gray-800 disabled:opacity-40 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="flex items-center text-xs text-gray-500 px-2">
                {page} / {data.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="p-1.5 rounded-lg bg-gray-800 disabled:opacity-40 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create tenant modal ────────────────────────────────────────────── */}
      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">Yeni tenant</h3>
            <p className="text-xs text-gray-500">Slug otomatik üretilir; subdomain ve özel domain isteğe bağlıdır.</p>
            <div className="space-y-3">
              <label className="block text-xs text-gray-400">Mağaza adı *</label>
              <input value={cName} onChange={e => setCName(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" placeholder="Örn. Acme Mağaza" />
              <label className="block text-xs text-gray-400">Slug (opsiyonel)</label>
              <input value={cSlug} onChange={e => setCSlug(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" placeholder="Boş bırakılırsa addan türetilir" />
              <label className="block text-xs text-gray-400">Subdomain</label>
              <input value={cSub} onChange={e => setCSub(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" placeholder="acme" />
              <label className="block text-xs text-gray-400">Özel domain</label>
              <input value={cDomain} onChange={e => setCDomain(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" placeholder="shop.ornek.com" />
              <label className="block text-xs text-gray-400">Paket / Plan</label>
              <select
                value={cPlan}
                onChange={e => setCPlan(e.target.value as CreatePlanValue)}
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
              >
                {CREATE_PLAN_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 -mt-1">
                {CREATE_PLAN_OPTIONS.find(o => o.value === cPlan)?.hint}
              </p>
              {cPlan !== 'TRIAL' && (
                <p className="text-[11px] text-amber-400/90">
                  Ücretli plan için aşağıdaki ilk kullanıcı alanları zorunludur.
                </p>
              )}
              <div className="border-t border-gray-800 pt-3 mt-2 space-y-2">
                <p className="text-xs font-semibold text-gray-400">İlk kullanıcı (opsiyonel)</p>
                <input value={cOwnerEmail} onChange={e => setCOwnerEmail(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" placeholder="owner@email.com" />
                <input type="password" value={cOwnerPass} onChange={e => setCOwnerPass(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" placeholder="Şifre (en az 8)" />
                <div className="flex gap-2">
                  <input value={cOwnerFn} onChange={e => setCOwnerFn(e.target.value)} className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" placeholder="Ad" />
                  <input value={cOwnerLn} onChange={e => setCOwnerLn(e.target.value)} className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" placeholder="Soyad" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-800">İptal</button>
              <button
                type="button"
                disabled={createBusy || !cName.trim()}
                onClick={async () => {
                  if (cOwnerEmail && cOwnerPass.length < 8) {
                    toast.error('Sahip kullanıcı için şifre en az 8 karakter olmalı.');
                    return;
                  }
                  if (cPlan !== 'TRIAL' && (!cOwnerEmail.trim() || !cOwnerPass)) {
                    toast.error('Ücretli plan için ilk kullanıcı e-posta ve şifre zorunludur.');
                    return;
                  }
                  setCreateBusy(true);
                  try {
                    const body: Record<string, unknown> = {
                      name: cName.trim(),
                      initialPlan: cPlan,
                      ...(cPlan !== 'TRIAL' && { billingCycle: 'MONTHLY' }),
                      ...(cSlug.trim() && { slug: cSlug.trim() }),
                      ...(cSub.trim() && { subdomain: cSub.trim() }),
                      ...(cDomain.trim() && { customDomain: cDomain.trim() }),
                    };
                    if (cOwnerEmail.trim() && cOwnerPass) {
                      body.owner = {
                        email: cOwnerEmail.trim(),
                        password: cOwnerPass,
                        firstName: cOwnerFn.trim() || 'Admin',
                        lastName: cOwnerLn.trim() || 'User',
                        role: 'ADMIN',
                      };
                    }
                    const res = await api.post('/admin/tenants', body);
                    unwrapAdmin(res);
                    toast.success(
                      cPlan === 'TRIAL'
                        ? 'Tenant oluşturuldu (14 gün trial).'
                        : `Tenant oluşturuldu (${cPlan} plan).`,
                    );
                    setCreateOpen(false);
                    setCName(''); setCSlug(''); setCSub(''); setCDomain('');
                    setCOwnerEmail(''); setCOwnerPass(''); setCOwnerFn(''); setCOwnerLn('');
                    setCPlan('TRIAL');
                    fetchTenants();
                  } catch (e: any) {
                    toast.error(e?.message || 'Oluşturulamadı.');
                  } finally {
                    setCreateBusy(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {createBusy ? 'Kaydediliyor…' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {modal?.type === 'plan' && (
        <PlanModal    tenant={modal.tenant} onClose={closeModal} onDone={doneModal} />
      )}
      {modal?.type === 'extend' && (
        <ExtendModal  tenant={modal.tenant} onClose={closeModal} onDone={doneModal} />
      )}
      {(modal?.type === 'suspend' || modal?.type === 'activate' || modal?.type === 'delete') && (
        <ConfirmModal tenant={modal.tenant} type={modal.type} onClose={closeModal} onDone={doneModal} />
      )}
    </div>
  );
};

export default AdminTenants;
