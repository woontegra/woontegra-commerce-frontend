/**
 * TrendyolGeneral — "Genel" tab içeriği
 *
 * Bölümler:
 *  1. Bağlantı durumu bandı
 *  2. 4 istatistik kartı (toplam / aktif / eksik / hatalı)
 *  3. Akıllı analiz + büyük gönder butonu
 *  4. Uyarılar listesi (marka, kategori, özellik eksiklikleri)
 *
 * Kullanıcı bu sayfadan çıkmadan işlem yapabilir.
 */

import { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import apiClient from '../../services/apiClient';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** Üst tab sistemine sinyal gönderir ("Ayarlar" veya "Ürünler" tabına geç) */
  onSwitchTab?: (tab: 'ayarlar' | 'urunler' | 'siparisler') => void;
}

// ─── Local types ──────────────────────────────────────────────────────────────

interface Stats {
  connected:     boolean;
  supplierId?:   string;
  lastSync?:     string | null;
  totalProducts?: number;
  sent?:         number;
  unmapped?:     number;
  errors?:       number;
}

interface AnalysisResult {
  ready:    number;
  warnings: number;
  errors:   number;
  total:    number;
  issues:   { label: string; count: number; level: 'error' | 'warning' }[];
}

interface Warning {
  id:    string;
  icon:  string;
  color: 'amber' | 'red' | 'blue';
  text:  string;
  cta:   string;
  tab:   'ayarlar' | 'urunler';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(d?: string | null) {
  if (!d) return null;
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60_000);
  if (m < 1)  return 'Az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

const fmt = (n: number) => n.toLocaleString('tr-TR');

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, colorClass = 'text-slate-900', loading,
}: {
  label: string; value: string | number; sub?: string;
  colorClass?: string; loading?: boolean;
}) {
  return (
    <div className="wn-card p-5">
      {loading ? (
        <div className="space-y-2.5">
          <div className="h-3 w-20 bg-slate-100 rounded animate-pulse"/>
          <div className="h-7 w-14 bg-slate-100 rounded animate-pulse"/>
        </div>
      ) : (
        <>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
          <p className={`text-2xl font-black mt-1.5 ${colorClass}`}>{value}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
}

// ─── Analysis modal ───────────────────────────────────────────────────────────

function AnalysisModal({
  onClose, onGoSend,
}: {
  onClose: () => void;
  onGoSend: () => void;
}) {
  const [phase, setPhase]   = useState<'loading' | 'done' | 'error'>('loading');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch all product IDs (quick)
        const idsRes = await apiClient.get('/trendyol/products/category-ids', { timeout: 15_000 });
        const ids: string[] = idsRes.data?.ids ?? [];

        if (ids.length === 0) {
          if (!cancelled) {
            setResult({ ready: 0, warnings: 0, errors: 0, total: 0, issues: [] });
            setPhase('done');
          }
          return;
        }

        // Validate (first 50 for speed — full validation is in Ürünler tab)
        const sample = ids.slice(0, 50);
        const valRes = await apiClient.post(
          '/trendyol/products/validate',
          { productIds: sample },
          { timeout: 60_000 },
        );
        const reports: any[] = valRes.data?.data ?? [];

        if (cancelled) return;

        const ready    = reports.filter(r => r.canSend && r.issues.length === 0).length;
        const warnings = reports.filter(r => r.canSend && r.issues.length > 0).length;
        const errors   = reports.filter(r => !r.canSend).length;

        // Aggregate issue types
        const countMap: Record<string, number> = {};
        for (const r of reports) {
          for (const iss of r.issues) {
            const key = iss.message ?? iss.code;
            countMap[key] = (countMap[key] ?? 0) + 1;
          }
        }
        const issues = Object.entries(countMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([label, count]) => ({
            label,
            count,
            level: (errors > 0 ? 'error' : 'warning') as 'error' | 'warning',
          }));

        setResult({ ready, warnings, errors, total: ids.length, issues });
        setPhase('done');
      } catch {
        if (!cancelled) setPhase('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Ürün Analizi</h2>
            <p className="text-xs text-gray-400 mt-0.5">Gönderime hazırlık durumu</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Loading */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 animate-spin text-orange-200" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">Ürünler analiz ediliyor…</p>
                <p className="text-xs text-gray-400 mt-1">İlk 50 ürün kontrol ediliyor, lütfen bekleyin.</p>
              </div>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </div>
              <p className="text-sm text-gray-600 text-center">Analiz sırasında hata oluştu.<br/>Bağlantınızı kontrol edin.</p>
              <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold transition-colors">Kapat</button>
            </div>
          )}

          {/* Results */}
          {phase === 'done' && result && (
            <div className="space-y-4">
              {/* 3 score pills */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Hazır',      count: result.ready,    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: '✔' },
                  { label: 'Uyarı',      count: result.warnings, bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-400',   icon: '⚠' },
                  { label: 'Hatalı',     count: result.errors,   bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     dot: 'bg-red-500',     icon: '✕' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl px-3 py-3 text-center`}>
                    <p className="text-lg font-black text-gray-900">{s.count}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 ${s.text}`}>{s.icon} {s.label}</p>
                  </div>
                ))}
              </div>

              {result.total > 50 && (
                <p className="text-[11px] text-gray-400 text-center">
                  İlk 50 ürün analiz edildi — toplam {fmt(result.total)} ürün.
                  Tam kontrol için <strong>Ürünler</strong> sekmesini kullanın.
                </p>
              )}

              {/* Issue list */}
              {result.issues.length > 0 && (
                <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
                  {result.issues.map((iss, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${iss.level === 'error' ? 'bg-red-400' : 'bg-amber-400'}`}/>
                      <p className="text-xs text-gray-600 flex-1 truncate" title={iss.label}>{iss.label}</p>
                      <span className="text-xs font-bold text-gray-400 flex-shrink-0">{iss.count} ürün</span>
                    </div>
                  ))}
                </div>
              )}

              {result.total === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Henüz ürün bulunmuyor.</p>
              )}

              {/* CTA */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { onClose(); onGoSend(); }}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  Ürünler Sekmesine Git →
                </button>
                <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-semibold text-gray-600 transition-colors">
                  Kapat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TrendyolGeneral({ onSwitchTab }: Props) {
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [mapping,     setMapping]     = useState<{ cats: Record<string,string>; brands: Record<string,number> } | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [syncing,     setSyncing]     = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [statsRes, catRes, brandRes] = await Promise.allSettled([
      apiClient.get('/trendyol/stats'),
      apiClient.get('/trendyol/category-mapping'),
      apiClient.get('/trendyol/brand-mapping'),
    ]);

    const rawStats = statsRes.status === 'fulfilled' ? (statsRes.value.data?.data ?? statsRes.value.data) : null;
    setStats(rawStats);

    const cats   = catRes.status === 'fulfilled'   ? (catRes.value.data?.data   ?? catRes.value.data?.mapping   ?? catRes.value.data   ?? {}) : {};
    const brands = brandRes.status === 'fulfilled' ? (brandRes.value.data?.data ?? brandRes.value.data?.mapping ?? brandRes.value.data ?? {}) : {};
    setMapping({ cats, brands });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const syncOrders = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.post('/trendyol/orders/sync');
      toast.success(res.data?.message ?? 'Siparişler çekildi');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'Sync başarısız');
    } finally { setSyncing(false); }
  };

  const connected = !!(stats?.supplierId);

  // ─── Computed warnings from mapping data ──────────────────────────────────

  const warnings: Warning[] = [];

  if (mapping) {
    const unmappedCats   = Object.values(mapping.cats).filter(v => !v).length;
    const unmappedBrands = Object.values(mapping.brands).filter(v => !v).length;

    if (unmappedCats > 0) {
      warnings.push({
        id: 'cats', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
        color: 'amber', text: `${unmappedCats} kategori Trendyol ile eşleştirilmemiş`,
        cta: 'Eşleştir', tab: 'ayarlar',
      });
    }
    if (unmappedBrands > 0) {
      warnings.push({
        id: 'brands', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
        color: 'amber', text: `${unmappedBrands} marka Trendyol ile eşleştirilmemiş`,
        cta: 'Eşleştir', tab: 'ayarlar',
      });
    }
    if (stats?.errors && stats.errors > 0) {
      warnings.push({
        id: 'errors', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        color: 'red', text: `${stats.errors} ürün gönderimde hata aldı`,
        cta: 'İncele', tab: 'urunler',
      });
    }
  }

  const colorBg  = { amber: 'bg-amber-50 border-amber-200', red: 'bg-red-50 border-red-200', blue: 'bg-blue-50 border-blue-200' };
  const colorTxt = { amber: 'text-amber-700', red: 'text-red-700', blue: 'text-blue-700' };
  const colorBtn = { amber: 'text-amber-700 bg-amber-100 hover:bg-amber-200 border-amber-300', red: 'text-red-700 bg-red-100 hover:bg-red-200 border-red-300', blue: 'text-blue-700 bg-blue-100 hover:bg-blue-200 border-blue-300' };

  return (
    <div className="space-y-6">

      {/* ── 1. Bağlantı bandı ── */}
      <div className={`rounded-2xl border p-4 flex items-center gap-4 ${
        connected ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          connected ? 'bg-emerald-100' : 'bg-amber-100'
        }`}>
          {connected ? (
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${connected ? 'text-emerald-800' : 'text-amber-800'}`}>
            {connected ? `Trendyol Bağlı — Satıcı ID: ${stats?.supplierId}` : 'Trendyol Bağlı Değil'}
          </p>
          <p className={`text-xs mt-0.5 ${connected ? 'text-emerald-600' : 'text-amber-600'}`}>
            {connected
              ? (timeAgo(stats?.lastSync) ? `Son sync: ${timeAgo(stats?.lastSync)}` : 'Henüz sync yapılmadı')
              : 'API bilgilerini Ayarlar sekmesine girin.'}
          </p>
        </div>

        {connected ? (
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-colors flex-shrink-0 disabled:opacity-50">
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Yenile
          </button>
        ) : (
          <button onClick={() => onSwitchTab?.('ayarlar')}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors flex-shrink-0">
            Bağlan →
          </button>
        )}
      </div>

      {/* ── 2. İstatistik kartları ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Ürün"
          value={fmt(stats?.totalProducts ?? 0)}
          loading={loading}
        />
        <StatCard
          label="Trendyol'da Aktif"
          value={fmt(stats?.sent ?? 0)}
          sub={stats?.totalProducts ? `${Math.round((stats.sent ?? 0) / stats.totalProducts * 100)}% gönderildi` : undefined}
          colorClass="text-emerald-600"
          loading={loading}
        />
        <StatCard
          label="Eşleştirilmemiş"
          value={fmt(stats?.unmapped ?? 0)}
          sub="Kategori/marka eksik"
          colorClass={(stats?.unmapped ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900'}
          loading={loading}
        />
        <StatCard
          label="Hatalı Gönderim"
          value={fmt(stats?.errors ?? 0)}
          sub="Trendyol reddi"
          colorClass={(stats?.errors ?? 0) > 0 ? 'text-red-600' : 'text-slate-900'}
          loading={loading}
        />
      </div>

      {/* ── 3. Akıllı Gönderim Aksiyonu ── */}
      {connected && (
        <div className="wn-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Left: big CTA */}
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900 mb-1">Ürünleri Trendyol'a Gönder</h3>
              <p className="text-xs text-gray-400 mb-4">
                Önce analiz çalıştırın — hazır, uyarılı ve hatalı ürünleri görün. Sonra tek tıkla gönderin.
              </p>
              <div className="flex flex-wrap gap-3">
                {/* Analiz butonu */}
                <button
                  onClick={() => setShowAnalysis(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                  </svg>
                  Analiz Et
                </button>

                {/* Ürünler sekmesine git */}
                <button
                  onClick={() => onSwitchTab?.('urunler')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                  Ürünleri Gönder
                </button>

                {/* Sipariş sync */}
                <button
                  onClick={syncOrders}
                  disabled={syncing}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 hover:border-orange-300 hover:text-orange-600 text-gray-600 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  {syncing ? 'Çekiliyor…' : 'Siparişleri Çek'}
                </button>
              </div>
            </div>

            {/* Right: last sync info */}
            {stats?.lastSync && (
              <div className="flex-shrink-0 flex flex-col items-center justify-center w-28 h-28 rounded-2xl bg-orange-50 border border-orange-100">
                <svg className="w-5 h-5 text-orange-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wide text-center leading-tight">Son Sync</p>
                <p className="text-sm font-black text-orange-700 text-center mt-1 leading-tight">{timeAgo(stats.lastSync)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Uyarılar ── */}
      {warnings.length > 0 && (
        <div className="wn-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <h3 className="text-sm font-bold text-gray-800">Dikkat Gerektiren Durumlar</h3>
            <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
              {warnings.length}
            </span>
          </div>
          <ul className="divide-y divide-gray-100">
            {warnings.map(w => (
              <li key={w.id} className={`flex items-center gap-4 px-5 py-3.5 ${colorBg[w.color]} border-l-4 ${
                w.color === 'amber' ? 'border-amber-400' : w.color === 'red' ? 'border-red-400' : 'border-blue-400'
              }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  w.color === 'amber' ? 'bg-amber-100' : w.color === 'red' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  <svg className={`w-4 h-4 ${colorTxt[w.color]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={w.icon}/>
                  </svg>
                </div>
                <p className={`flex-1 text-xs font-semibold ${colorTxt[w.color]}`}>{w.text}</p>
                <button
                  onClick={() => onSwitchTab?.(w.tab)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex-shrink-0 ${colorBtn[w.color]}`}
                >
                  {w.cta}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Her şey sağlıklıysa pozitif mesaj ── */}
      {!loading && connected && warnings.length === 0 && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-sm text-emerald-700 font-semibold">
            Tüm ayarlar tamam — ürünlerinizi göndermeye hazırsınız.
          </p>
        </div>
      )}

      {/* ── Bağlı değilse yönlendirme ── */}
      {!loading && !connected && (
        <div className="wn-card p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-gray-800">Trendyol Bağlantısı Bulunamadı</p>
            <p className="text-sm text-gray-400 mt-1">API bilgilerini girerek Trendyol ile entegrasyona başlayın.</p>
          </div>
          <button
            onClick={() => onSwitchTab?.('ayarlar')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors"
          >
            Ayarlara Git
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      )}

      {/* ── Analysis Modal ── */}
      {showAnalysis && (
        <AnalysisModal
          onClose={() => setShowAnalysis(false)}
          onGoSend={() => { setShowAnalysis(false); onSwitchTab?.('urunler'); }}
        />
      )}

    </div>
  );
}
