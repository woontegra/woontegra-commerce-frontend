/**
 * MarketplaceDetail
 * /dashboard/marketplaces/:slug
 *
 * Tabs:
 *   Genel      – bağlantı durumu + istatistikler + hızlı aksiyonlar
 *   Ürünler    – ürün listesi + Trendyol gönderim durumu
 *   Siparişler – Trendyol sipariş listesi (TrendyolOrders bileşeni)
 *   Ayarlar    – mevcut TrendyolIntegration sayfasına yönlendirme + özet
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/apiClient';
import toast from 'react-hot-toast';
import { MARKETPLACES } from './MarketplaceHub';

// ─── Lazy sub-tabs ────────────────────────────────────────────────────────────
const TrendyolOrders = React.lazy(() => import('./TrendyolOrders'));
// Trendyol için özel tab sistemi (mevcut TrendyolIntegration'ı bozmuyor)
const TrendyolTabs   = React.lazy(() => import('../components/trendyol/TrendyolTabs'));

// ─── Tab types ────────────────────────────────────────────────────────────────
type Tab = 'genel' | 'urunler' | 'siparisler' | 'ayarlar';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'genel',       label: 'Genel',       icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'urunler',     label: 'Ürünler',     icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'siparisler',  label: 'Siparişler',  icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { id: 'ayarlar',     label: 'Ayarlar',     icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr?: string | null) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

function StatCard({ label, value, sub, color = 'slate' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const textColor = color === 'green' ? 'text-emerald-600' : color === 'red' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="wn-card p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1.5 ${textColor}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Tab: Genel ───────────────────────────────────────────────────────────────

function TabGenel({ slug }: { slug: string }) {
  const [integration, setIntegration] = useState<any>(null);
  const [report,      setReport]      = useState<any>(null);
  const [orders,      setOrders]      = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [syncing,     setSyncing]     = useState(false);

  useEffect(() => {
    if (slug !== 'trendyol') { setLoading(false); return; }
    Promise.allSettled([
      apiClient.get('/trendyol/integration'),
      apiClient.get('/reports/overview?days=30'),
      apiClient.get('/trendyol/orders?limit=1'),
    ]).then(([intRes, repRes, ordRes]) => {
      setIntegration(intRes.status === 'fulfilled' ? (intRes.value.data?.data ?? intRes.value.data) : null);
      setReport(repRes.status === 'fulfilled'      ? (repRes.value.data?.data ?? repRes.value.data)  : null);
      setOrders(ordRes.status === 'fulfilled'      ? (ordRes.value.data?.data ?? ordRes.value.data)   : null);
    }).finally(() => setLoading(false));
  }, [slug]);

  if (slug !== 'trendyol') {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">🚧</div>
        <p className="text-sm font-semibold text-slate-700">Bu entegrasyon henüz kullanılabilir değil</p>
        <p className="text-xs text-slate-400">Yakında burada olacak.</p>
      </div>
    );
  }

  const connected = !!(integration?.supplierId);
  const successRate = report
    ? ((report.sentProducts ?? 0) / Math.max(1, (report.sentProducts ?? 0) + (report.failedProducts ?? 0)) * 100).toFixed(0)
    : '—';

  const handleSyncOrders = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.post('/trendyol/orders/sync');
      toast.success(res.data?.message ?? 'Sync tamamlandı');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Sync başarısız');
    } finally { setSyncing(false); }
  };

  return (
    <div className="space-y-6">
      {/* Connection status */}
      <div className={`p-5 rounded-2xl border flex items-center gap-4 ${
        connected ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
      }`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          connected ? 'bg-emerald-100' : 'bg-amber-100'
        }`}>
          {connected ? (
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
          ) : (
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          )}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-bold ${connected ? 'text-emerald-800' : 'text-amber-800'}`}>
            {connected ? `Trendyol Bağlı — Satıcı ID: ${integration.supplierId}` : 'Trendyol Bağlı Değil'}
          </p>
          <p className={`text-xs mt-0.5 ${connected ? 'text-emerald-600' : 'text-amber-600'}`}>
            {connected ? `Son sync: ${timeAgo(integration.lastSync ?? integration.lastOrderSync)}` : 'API bilgilerini girmek için Ayarlar sekmesine gidin.'}
          </p>
        </div>
        {!connected && (
          <Link
            to="/dashboard/marketplaces/trendyol"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors flex-shrink-0"
          >
            Bağlan →
          </Link>
        )}
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="wn-card p-5 space-y-2">
              <div className="h-3 w-20 bg-slate-100 rounded animate-pulse"/>
              <div className="h-6 w-12 bg-slate-100 rounded animate-pulse"/>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Gönderilen Ürün"  value={report?.sentProducts  ?? 0} sub="Son 30 gün" color="green"/>
          <StatCard label="Hatalı Gönderim"  value={report?.failedProducts ?? 0} sub="Son 30 gün" color={report?.failedProducts > 0 ? 'red' : 'slate'}/>
          <StatCard label="Başarı Oranı"     value={`${successRate}%`}           sub="Gönderim başarısı"/>
          <StatCard label="Toplam Sipariş"   value={orders?.total ?? 0}          sub="Trendyol siparişleri"/>
        </div>
      )}

      {/* Quick actions */}
      {connected && (
        <div className="wn-card p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Hızlı Aksiyonlar</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSyncOrders}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-60 transition-colors"
            >
              <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              {syncing ? 'Çekiliyor...' : 'Siparişleri Çek'}
            </button>
            <Link
              to="/dashboard/products"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:border-orange-300 hover:text-orange-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              Ürünlere Git
            </Link>
            <Link
              to="/dashboard/marketplaces/trendyol"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:border-orange-300 hover:text-orange-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Tam Ayarlar
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Ürünler (mini product list) ────────────────────────────────────────

function TabUrunler({ slug }: { slug: string }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (slug !== 'trendyol') { setLoading(false); return; }
    apiClient.get('/products?limit=50&sort=updatedAt:desc')
      .then(r => {
        const d = r.data?.data ?? r.data;
        const items = d?.products ?? d?.items ?? (Array.isArray(d) ? d : []);
        setProducts(items);
        setTotal(d?.total ?? items.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (slug !== 'trendyol') {
    return <div className="py-20 text-center text-sm text-slate-400">Bu pazaryeri için ürün yönetimi yakında.</div>;
  }

  const STATUS_CLS: Record<string, string> = {
    SENT:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    ERROR:   'bg-red-50    text-red-700    border-red-200',
    PENDING: 'bg-amber-50  text-amber-700  border-amber-200',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{total} ürün</p>
        <Link
          to="/dashboard/products"
          className="text-xs font-semibold text-orange-500 hover:text-orange-700 transition-colors"
        >
          Tüm ürünleri gör →
        </Link>
      </div>

      <div className="wn-card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse"/>
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-36 bg-slate-100 rounded animate-pulse"/>
                  <div className="h-2.5 w-20 bg-slate-100 rounded animate-pulse"/>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">Henüz ürün yok</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Ürün</th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Fiyat</th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Trendyol</th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-20"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.slice(0, 30).map((p: any) => {
                const tStatus = p.trendyolStatus ?? (p.trendyolMaps?.length > 0 ? p.trendyolMaps[0]?.trendyolStatus : null);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800 truncate max-w-[240px]">{p.name}</p>
                      {p.barcode && <p className="text-[11px] text-slate-400 font-mono">{p.barcode}</p>}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700 font-semibold">
                      {Number(p.price ?? 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {tStatus ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_CLS[tStatus] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {tStatus === 'SENT' ? 'Gönderildi' : tStatus === 'ERROR' ? 'Hata' : 'Bekliyor'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => navigate(`/dashboard/products/${p.id}/edit`)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                      >
                        Düzenle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Siparişler ─────────────────────────────────────────────────────────

function TabSiparisler({ slug }: { slug: string }) {
  if (slug !== 'trendyol') {
    return <div className="py-20 text-center text-sm text-slate-400">Bu pazaryeri için sipariş yönetimi yakında.</div>;
  }
  return (
    <React.Suspense fallback={
      <div className="py-20 flex items-center justify-center">
        <svg className="w-8 h-8 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    }>
      <TrendyolOrders />
    </React.Suspense>
  );
}

// ─── Tab: Ayarlar ─────────────────────────────────────────────────────────────

const SETTING_SECTIONS = [
  {
    title: 'API Bağlantısı',
    desc:  'Trendyol Satıcı ID, API Key ve Secret bilgilerini yönetin.',
    icon:  'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
    tab:   'integration',
  },
  {
    title: 'Kategori Eşleştirme',
    desc:  'Ürün kategorilerinizi Trendyol kategorileriyle eşleştirin.',
    icon:  'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
    tab:   'categories',
  },
  {
    title: 'Marka Eşleştirme',
    desc:  'Markalarınızı Trendyol marka veritabanıyla eşleştirin.',
    icon:  'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    tab:   'brands',
  },
  {
    title: 'Özellik Eşleştirme',
    desc:  'Ürün özelliklerini Trendyol özellikleriyle eşleştirin.',
    icon:  'M4 6h16M4 10h16M4 14h16M4 18h16',
    tab:   'attributes',
  },
  {
    title: 'Fiyat Stratejisi',
    desc:  'Trendyol\'da gösterilecek fiyatlar için kural belirleyin.',
    icon:  'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    tab:   'pricing',
  },
  {
    title: 'Kargo Ayarları',
    desc:  'Varsayılan kargo şirketi ve teslimat sürelerini ayarlayın.',
    icon:  'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
    tab:   'shipping',
  },
];

function TabAyarlar({ slug }: { slug: string }) {
  if (slug !== 'trendyol') {
    return <div className="py-20 text-center text-sm text-slate-400">Bu pazaryeri için ayarlar yakında.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex items-center gap-3">
        <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p className="text-xs text-orange-700">
          Tam gelişmiş ayar sayfasına gitmek için sağ üstteki{' '}
          <Link to="/dashboard/marketplaces/trendyol" className="font-bold underline">Trendyol Entegrasyon</Link>{' '}
          sayfasını kullanabilirsiniz.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {SETTING_SECTIONS.map(s => (
          <Link
            key={s.tab}
            to="/dashboard/marketplaces/trendyol"
            className="wn-card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 group-hover:bg-orange-100 flex items-center justify-center flex-shrink-0 transition-colors">
                <svg className="w-4.5 h-4.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={s.icon}/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">{s.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
              <svg className="w-4 h-4 text-slate-300 group-hover:text-orange-400 flex-shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketplaceDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate       = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('genel');

  const mp = MARKETPLACES.find(m => m.slug === slug);

  // 404 for unknown slugs
  if (!mp) {
    return (
      <div className="w-full py-32 flex flex-col items-center gap-4 text-center">
        <p className="text-4xl">🔍</p>
        <p className="text-lg font-bold text-slate-800">Pazaryeri bulunamadı</p>
        <button onClick={() => navigate('/dashboard/marketplaces')}
          className="text-sm text-orange-500 hover:underline font-semibold">
          ← Tüm Pazaryerleri
        </button>
      </div>
    );
  }

  // Coming soon
  if (!mp.available) {
    return (
      <div className="w-full py-32 flex flex-col items-center gap-4 text-center">
        <div className="text-5xl">{mp.logo}</div>
        <p className="text-lg font-bold text-slate-800">{mp.name} — Yakında</p>
        <p className="text-sm text-slate-400 max-w-xs">Bu entegrasyon üzerinde aktif olarak çalışıyoruz.</p>
        <button onClick={() => navigate('/dashboard/marketplaces')}
          className="text-sm text-orange-500 hover:underline font-semibold">
          ← Tüm Pazaryerleri
        </button>
      </div>
    );
  }

  // ── Trendyol: kendi tab sistemi var, MarketplaceDetail'in tab'larını atla ──
  if (slug === 'trendyol') {
    return (
      <div className="w-full space-y-6">
        {/* Breadcrumb + header */}
        <div>
          <button
            onClick={() => navigate('/dashboard/marketplaces')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-3"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Pazaryerleri
          </button>
          <div className="flex items-center gap-4">
            {mp.logo}
            <div>
              <h1 className="text-xl font-bold text-slate-900">{mp.name}</h1>
              <p className="text-sm text-slate-400">{mp.description}</p>
            </div>
          </div>
        </div>

        {/* TrendyolTabs — Genel / Ürünler / Siparişler / Ayarlar */}
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <svg className="w-8 h-8 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        }>
          <TrendyolTabs />
        </Suspense>
      </div>
    );
  }

  // ── Diğer pazaryerleri: genel tab sistemi ────────────────────────────────
  return (
    <div className="w-full space-y-6">

      {/* Breadcrumb + header */}
      <div>
        <button
          onClick={() => navigate('/dashboard/marketplaces')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-3"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
          Pazaryerleri
        </button>

        <div className="flex items-center gap-4">
          {mp.logo}
          <div>
            <h1 className="text-xl font-bold text-slate-900">{mp.name}</h1>
            <p className="text-sm text-slate-400">{mp.description}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={tab.icon}/>
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'genel'      && <TabGenel       slug={slug}/>}
        {activeTab === 'urunler'    && <TabUrunler     slug={slug}/>}
        {activeTab === 'siparisler' && <TabSiparisler  slug={slug}/>}
        {activeTab === 'ayarlar'    && <TabAyarlar     slug={slug}/>}
      </div>

    </div>
  );
}
