import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard, Search, Loader2, CheckCircle, AlertCircle, Crown, LayoutList,
  Plus, X,
} from 'lucide-react';
import { api } from '../../services/apiClient';
import toast from 'react-hot-toast';
import { unwrapAdmin } from '../../utils/adminApi';

const PLANS    = ['STARTER', 'PRO', 'ENTERPRISE'] as const;
const CYCLES   = ['MONTHLY', 'YEARLY'] as const;

interface TenantOption { id: string; name: string; slug: string }

interface BillingOverview {
  payments: Array<{
    id: string; amount: number; currency: string; status: string; provider: string;
    createdAt: string;
    tenant: { id: string; name: string; slug: string } | null;
    user: { email: string } | null;
    subscription: { plan: string; status: string; endDate: string } | null;
  }>;
  pagination: { total: number; page: number; limit: number; totalPages: number };
  summary: {
    successfulRevenueTotal: number;
    activeSubscriptions: number;
    pendingPayments: number;
    failedPaymentsLast30Days: number;
  };
}

const AdminBilling: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<'overview' | 'override'>('overview');

  const [tenantSearch,  setTenantSearch]  = useState('');
  const [tenants,       setTenants]       = useState<TenantOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedTenant, setSelected]     = useState<TenantOption | null>(null);

  const [plan,         setPlan]         = useState<string>('PRO');
  const [cycle,        setCycle]        = useState<string>('MONTHLY');
  const [endDate,      setEndDate]      = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });

  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState<string | null>(null);

  const [ov, setOv]       = useState<BillingOverview | null>(null);
  const [ovLoading, setOvLoading] = useState(false);
  const [ovPage, setOvPage] = useState(1);
  const [payFilter, setPayFilter] = useState<string>('');

  const [manualOpen, setManualOpen]     = useState(false);
  const [mpSearch, setMpSearch]         = useState('');
  const [mpTenants, setMpTenants]       = useState<TenantOption[]>([]);
  const [mpSearchLoading, setMpSearchLoading] = useState(false);
  const [mpTenant, setMpTenant]         = useState<TenantOption | null>(null);
  const [mpAmount, setMpAmount]         = useState('');
  const [mpCurrency, setMpCurrency]     = useState('TRY');
  const [mpDescription, setMpDescription] = useState('');
  const [mpSubmitting, setMpSubmitting] = useState(false);

  const [subStatus, setSubStatus]       = useState<'ACTIVE' | 'PAUSED' | 'CANCELLED'>('ACTIVE');
  const [subBusy, setSubBusy]           = useState(false);

  const loadOverview = useCallback(async () => {
    setOvLoading(true);
    try {
      const q = new URLSearchParams({ page: String(ovPage), limit: '25' });
      if (payFilter) q.set('status', payFilter);
      const res = await api.get(`/admin/billing/overview?${q}`);
      setOv(unwrapAdmin<BillingOverview>(res));
    } catch {
      toast.error('Ödeme özeti yüklenemedi.');
    } finally {
      setOvLoading(false);
    }
  }, [ovPage, payFilter]);

  useEffect(() => {
    if (tab === 'overview') loadOverview();
  }, [tab, loadOverview]);

  // Pre-fill tenantId from query param
  useEffect(() => {
    const tid = searchParams.get('tenantId');
    if (!tid) return;
    (async () => {
      try {
        const res = await api.get(`/admin/tenants/${tid}`);
        const t = unwrapAdmin<{ id: string; name: string; slug: string }>(res);
        setSelected({ id: t.id, name: t.name, slug: t.slug });
        setTab('override');
      } catch { /* ignore */ }
    })();
  }, []);

  // Tenant search
  useEffect(() => {
    if (!tenantSearch.trim()) { setTenants([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(`/admin/tenants?search=${encodeURIComponent(tenantSearch)}&limit=10`);
        const page = unwrapAdmin<{ tenants: TenantOption[] }>(res);
        setTenants(page.tenants?.map(t => ({ id: t.id, name: t.name, slug: t.slug })) || []);
      } catch { /* ignore */ } finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [tenantSearch]);

  useEffect(() => {
    if (!manualOpen || !mpSearch.trim()) {
      if (!manualOpen) setMpTenants([]);
      return;
    }
    const t = setTimeout(async () => {
      setMpSearchLoading(true);
      try {
        const res = await api.get(`/admin/tenants?search=${encodeURIComponent(mpSearch)}&limit=10`);
        const page = unwrapAdmin<{ tenants: TenantOption[] }>(res);
        setMpTenants(page.tenants?.map(x => ({ id: x.id, name: x.name, slug: x.slug })) || []);
      } catch {
        setMpTenants([]);
      } finally {
        setMpSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [mpSearch, manualOpen]);

  const submitManualPayment = async () => {
    if (!mpTenant) {
      toast.error('Tenant seçin.');
      return;
    }
    const amt = parseFloat(String(mpAmount).replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Geçerli tutar girin.');
      return;
    }
    setMpSubmitting(true);
    try {
      await api.post('/admin/billing/manual-payment', {
        tenantId: mpTenant.id,
        amount: amt,
        currency: mpCurrency || 'TRY',
        description: mpDescription.trim() || undefined,
      });
      toast.success('Manuel ödeme kaydedildi.');
      setManualOpen(false);
      setMpTenant(null);
      setMpSearch('');
      setMpAmount('');
      setMpDescription('');
      await loadOverview();
    } catch (e: any) {
      toast.error(e?.message || 'Kayıt oluşturulamadı.');
    } finally {
      setMpSubmitting(false);
    }
  };

  const submitSubscriptionStatus = async () => {
    if (!selectedTenant) {
      toast.error('Önce tenant seçin.');
      return;
    }
    setSubBusy(true);
    try {
      await api.patch(`/admin/subscription/${selectedTenant.id}`, { status: subStatus });
      toast.success('Abonelik durumu güncellendi.');
      await loadOverview();
    } catch (e: any) {
      toast.error(e?.message || 'Güncellenemedi.');
    } finally {
      setSubBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) { toast.error('Bir tenant seçin.'); return; }

    setSubmitting(true);
    setSuccess(null);
    try {
      await api.post('/admin/subscription/change', {
        tenantId:    selectedTenant.id,
        plan,
        billingCycle: cycle,
        endDate,
      });
      setSuccess(`${selectedTenant.name} için ${plan} planı aktifleştirildi.`);
      toast.success('Abonelik güncellendi!');
      await loadOverview();
    } catch (e: any) {
      toast.error(e?.message || 'İşlem başarısız.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            Faturalama
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Platform ödemeleri ve manuel plan / lisans ataması.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end items-center">
          <button
            type="button"
            onClick={() => { setManualOpen(true); setMpTenant(null); setMpSearch(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500/40"
          >
            <Plus className="w-4 h-4" />
            Manuel ödeme ekle
          </button>
        <div className="flex rounded-xl border border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setTab('overview')}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
              tab === 'overview' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            <LayoutList className="w-4 h-4" /> Özet
          </button>
          <button
            type="button"
            onClick={() => setTab('override')}
            className={`px-4 py-2 text-sm font-medium ${
              tab === 'override' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            Plan override
          </button>
        </div>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {ovLoading && !ov ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
          ) : ov && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Başarılı gelir (toplam)</p>
                  <p className="text-lg font-bold text-white">₺{ov.summary.successfulRevenueTotal.toLocaleString('tr-TR')}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Aktif abonelik</p>
                  <p className="text-lg font-bold text-emerald-400">{ov.summary.activeSubscriptions}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Bekleyen ödeme</p>
                  <p className="text-lg font-bold text-amber-400">{ov.summary.pendingPayments}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Başarısız (30 gün)</p>
                  <p className="text-lg font-bold text-red-400">{ov.summary.failedPaymentsLast30Days}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Durum:</span>
                <select
                  value={payFilter}
                  onChange={e => { setPayFilter(e.target.value); setOvPage(1); }}
                  className="bg-gray-900 border border-gray-700 rounded-lg text-sm text-white px-2 py-1"
                >
                  <option value="">Tümü</option>
                  <option value="SUCCESS">Başarılı</option>
                  <option value="FAILED">Başarısız</option>
                  <option value="PENDING">Bekleyen</option>
                </select>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-950 text-gray-500 text-left text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Tarih</th>
                      <th className="px-4 py-3">Tenant</th>
                      <th className="px-4 py-3">Tutar</th>
                      <th className="px-4 py-3">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {ov.payments.map(p => (
                      <tr key={p.id} className="text-gray-300">
                        <td className="px-4 py-2 whitespace-nowrap">{new Date(p.createdAt).toLocaleString('tr-TR')}</td>
                        <td className="px-4 py-2">{p.tenant?.name ?? '—'}</td>
                        <td className="px-4 py-2">₺{p.amount.toLocaleString('tr-TR')} {p.currency}</td>
                        <td className="px-4 py-2">
                          <span className={
                            p.status === 'SUCCESS' ? 'text-emerald-400' :
                            p.status === 'FAILED' ? 'text-red-400' : 'text-amber-400'
                          }>{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {ov.pagination.totalPages > 1 && (
                  <div className="px-4 py-2 flex justify-between text-xs text-gray-500 border-t border-gray-800">
                    <span>Sayfa {ov.pagination.page} / {ov.pagination.totalPages}</span>
                    <div className="flex gap-2">
                      <button type="button" disabled={ovPage <= 1} onClick={() => setOvPage(p => p - 1)} className="text-blue-400 disabled:opacity-30">Önceki</button>
                      <button type="button" disabled={ovPage >= ov.pagination.totalPages} onClick={() => setOvPage(p => p + 1)} className="text-blue-400 disabled:opacity-30">Sonraki</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'override' && (
      <>
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Manuel plan &amp; bitiş tarihi</h3>
        <p className="text-gray-500 text-xs mb-4">
          Starter / Pro / Enterprise ve bitiş tarihi; mevcut aktif aboneliği iptal edip yenisini oluşturur.
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-3 bg-green-900/20 border border-green-800/40 rounded-xl p-4 text-green-400">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">

        {/* Tenant selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Tenant Seç
          </label>
          {selectedTenant ? (
            <div className="flex items-center justify-between bg-blue-900/20 border border-blue-700/40 rounded-xl px-4 py-3">
              <div>
                <p className="text-white font-medium text-sm">{selectedTenant.name}</p>
                <p className="text-gray-500 text-xs">{selectedTenant.slug}</p>
              </div>
              <button type="button" onClick={() => { setSelected(null); setTenantSearch(''); }}
                className="text-xs text-blue-400 hover:text-white transition-colors">
                Değiştir
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={tenantSearch} onChange={e => setTenantSearch(e.target.value)}
                placeholder="Tenant adı veya slug ara..."
                className="w-full bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 text-sm pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-500" />
              )}
              {tenants.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden z-10 shadow-2xl">
                  {tenants.map(t => (
                    <button
                      key={t.id} type="button"
                      onClick={() => { setSelected(t); setTenantSearch(''); setTenants([]); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-700 transition-colors"
                    >
                      <p className="text-white text-sm">{t.name}</p>
                      <p className="text-gray-500 text-xs">{t.slug}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Abonelik durumu (tenant bazlı) */}
        <div className="border border-gray-800 rounded-xl p-4 space-y-3 bg-gray-950/40">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Abonelik durumu
          </label>
          <p className="text-xs text-gray-500">
            Son abonelik kaydı güncellenir. <strong className="text-gray-400">Durdur</strong> → sistemde{' '}
            <code className="text-gray-500">PAST_DUE</code>; <strong className="text-gray-400">İptal</strong> →{' '}
            <code className="text-gray-500">CANCELED</code>.
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <select
              value={subStatus}
              onChange={e => setSubStatus(e.target.value as typeof subStatus)}
              disabled={!selectedTenant || subBusy}
              className="flex-1 min-w-[200px] bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              <option value="ACTIVE">Aktif</option>
              <option value="PAUSED">Durdur (beklemede)</option>
              <option value="CANCELLED">İptal</option>
            </select>
            <button
              type="button"
              disabled={!selectedTenant || subBusy}
              onClick={() => { void submitSubscriptionStatus(); }}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-700 hover:bg-amber-600 text-white disabled:opacity-50 flex items-center gap-2"
            >
              {subBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Durumu uygula
            </button>
          </div>
        </div>

        {/* Plan */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Plan</label>
          <div className="flex gap-2">
            {PLANS.map(p => (
              <button
                key={p} type="button" onClick={() => setPlan(p)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  plan === p
                    ? p === 'ENTERPRISE' ? 'bg-amber-600 border-amber-500 text-white'
                    : p === 'PRO'        ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >{p}</button>
            ))}
          </div>
        </div>

        {/* Billing cycle */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Döngü</label>
          <div className="flex gap-2">
            {CYCLES.map(c => (
              <button
                key={c} type="button" onClick={() => setCycle(c)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  cycle === c ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {c === 'MONTHLY' ? 'Aylık' : 'Yıllık'}
              </button>
            ))}
          </div>
        </div>

        {/* End date */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Abonelik Bitiş Tarihi
          </label>
          <input
            type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required
            min={new Date().toISOString().split('T')[0]}
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 [color-scheme:dark]"
          />
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700/40 rounded-xl p-4">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            Bu işlem, seçili tenant'ın mevcut aktif aboneliğini iptal edip yeni bir abonelik oluşturur.
            İşlem audit log'a kaydedilir.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit" disabled={submitting || !selectedTenant}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
          {submitting ? 'Uygulanıyor...' : 'Aboneliği Uygula'}
        </button>
      </form>
      </>
      )}

      {manualOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Manuel ödeme ekle</h3>
              <button
                type="button"
                onClick={() => !mpSubmitting && setManualOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Başarılı ödeme olarak kaydedilir (provider: manual). Tenant son aboneliğine bağlanır; yoksa oluşturulur.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Tenant</label>
              {mpTenant ? (
                <div className="flex items-center justify-between bg-blue-900/20 border border-blue-700/40 rounded-xl px-3 py-2">
                  <div>
                    <p className="text-white text-sm font-medium">{mpTenant.name}</p>
                    <p className="text-gray-500 text-xs">{mpTenant.slug}</p>
                  </div>
                  <button type="button" className="text-xs text-blue-400" onClick={() => { setMpTenant(null); setMpSearch(''); }}>
                    Değiştir
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    value={mpSearch}
                    onChange={e => setMpSearch(e.target.value)}
                    placeholder="Tenant ara…"
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white"
                  />
                  {mpSearchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-500" />
                  )}
                  {mpTenants.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-gray-950 border border-gray-700 rounded-xl shadow-xl">
                      {mpTenants.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm"
                          onClick={() => { setMpTenant(t); setMpSearch(''); setMpTenants([]); }}
                        >
                          <span className="text-white">{t.name}</span>
                          <span className="text-gray-500 text-xs ml-2">{t.slug}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tutar</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={mpAmount}
                  onChange={e => setMpAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Para birimi</label>
                <select
                  value={mpCurrency}
                  onChange={e => setMpCurrency(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Açıklama</label>
              <textarea
                value={mpDescription}
                onChange={e => setMpDescription(e.target.value)}
                rows={2}
                placeholder="Örn. Havale — Ocak faturası"
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={mpSubmitting}
                onClick={() => setManualOpen(false)}
                className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-800"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={mpSubmitting}
                onClick={() => { void submitManualPayment(); }}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 flex items-center gap-2"
              >
                {mpSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBilling;
