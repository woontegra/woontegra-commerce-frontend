import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import apiClient from '../services/apiClient';
import { useAppStore } from '../store/useAppStore';
import PaymentSummarySection from '../components/dashboard/PaymentSummarySection';
import type { PaymentSummary } from '../utils/orderPaymentLabels';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayBucket {
  date:    string;   // "YYYY-MM-DD"
  success: number;
  error:   number;
}

interface RecentSend {
  productId:   string | null;
  productName: string | null;
  createdAt:   string;
  batchId:     string | null;
}

interface TopError {
  productId:   string | null;
  productName: string | null;
  errorCount:  number;
}

interface OverviewData {
  totalProducts:    number;
  sentProducts:     number;
  failedProducts:   number;
  skippedProducts:  number;
  successRate:      number;
  last7Days:        DayBucket[];
  recentSent:       RecentSend[];
  topErrors:        TopError[];
  paymentSummary?:  PaymentSummary;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | undefined): string {
  if (n === undefined) return '—';
  return n.toLocaleString('tr-TR');
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString('tr-TR', { month: 'short' })}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:      string;
  value:      string | number;
  sub?:       string;
  icon:       React.ReactNode;
  iconBg:     string;
  loading:    boolean;
}

function StatCard({ label, value, sub, icon, iconBg, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="wn-card p-5 flex flex-col gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} animate-pulse`}/>
        <div className="space-y-2">
          <div className="h-7 w-20 bg-slate-100 rounded animate-pulse"/>
          <div className="h-3 w-24 bg-slate-100 rounded animate-pulse"/>
        </div>
      </div>
    );
  }
  return (
    <div className="wn-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-lg text-xs">
      <p className="text-slate-500 mb-2 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }}/>
          <span className="text-slate-600">
            {p.name === 'success' ? 'Başarılı' : 'Hatalı'}:
          </span>
          <span className="font-bold text-slate-900">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state (no sends yet) ───────────────────────────────────────────────

function NoSendsYet() {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
        </svg>
      </div>
      <p className="text-sm font-bold text-slate-700">Henüz gönderim yapılmamış</p>
      <p className="text-xs text-slate-400 mt-1 mb-5 max-w-xs">
        Ürünler sayfasından Trendyol'a ürün göndererek başlayın.
      </p>
      <a href="/dashboard/products"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors shadow-sm">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
        </svg>
        Ürünlere Git
      </a>
    </div>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useAppStore(s => s.user);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [days,     setDays]     = useState<7 | 30>(7);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // ── Fetch overview ───────────────────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/reports/overview?days=${days}`, { skipErrorToast: true });
      const d   = res.data?.data ?? res.data;
      setOverview(d);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err?.message ?? 'Rapor yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const hasAnySend = !loading && overview && (overview.sentProducts + overview.failedProducts) > 0;
  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';

  // Chart data — format "Apr 1" for X axis
  const chartData = (overview?.last7Days ?? []).map(d => ({
    date:    shortDate(d.date),
    success: d.success,
    error:   d.error,
  }));

  return (
    <div className="w-full space-y-8 page-enter">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            {greeting}, {user?.firstName} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Trendyol entegrasyon özeti
            {lastRefresh && (
              <span className="ml-2 text-slate-400 text-xs">
                · {timeAgo(lastRefresh.toISOString())} güncellendi
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1 gap-1">
            {([7, 30] as const).map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  days === d ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}>
                {d} gün
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchOverview}
            disabled={loading}
            title="Yenile"
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:border-orange-300 hover:text-orange-500 transition-colors disabled:opacity-40"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : 'text-slate-500'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Error state ─────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="wn-card p-5 flex items-center gap-3 border-red-200 bg-red-50">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={fetchOverview}
            className="ml-auto text-xs font-semibold text-red-600 hover:text-red-800 underline">
            Tekrar dene
          </button>
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      {!loading && (overview?.totalProducts ?? 0) === 0 && (
        <div className="wn-card p-6 border-indigo-200 bg-indigo-50/40">
          <h2 className="text-base font-bold text-slate-900">Hızlı Başlangıç</h2>
          <p className="text-sm text-slate-600 mt-1">Boş dashboard yerine ilk satışa hazır kurulum adımlarını tamamlayın.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <a href="/dashboard/products/new" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 transition-colors">
              <p className="font-semibold text-slate-800">İlk ürününü ekle</p>
              <p className="text-xs text-slate-500 mt-1">Tek ürünle başlayıp mağazanı hemen yayına al.</p>
            </a>
            <a href="/dashboard/products/import/xml" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 transition-colors">
              <p className="font-semibold text-slate-800">XML ile yükle</p>
              <p className="text-xs text-slate-500 mt-1">Toplu ürün aktarımı için XML import sihirbazını kullan.</p>
            </a>
            <a href="/dashboard/settings" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 transition-colors">
              <p className="font-semibold text-slate-800">Tema seç</p>
              <p className="text-xs text-slate-500 mt-1">Markana uygun görünümü ayarlayıp satışa hazırlan.</p>
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          loading={loading}
          label="Toplam Ürün"
          value={fmt(overview?.totalProducts)}
          sub="Sistemdeki tüm ürünler"
          iconBg="bg-slate-100"
          icon={
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          }
        />
        <StatCard
          loading={loading}
          label="Trendyol'a Gönderilen"
          value={fmt(overview?.sentProducts)}
          sub="Başarılı gönderim sayısı"
          iconBg="bg-emerald-100"
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
        <StatCard
          loading={loading}
          label="Hatalı Gönderim"
          value={fmt(overview?.failedProducts)}
          sub="Başarısız olan gönderiler"
          iconBg="bg-red-100"
          icon={
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
        <StatCard
          loading={loading}
          label="Başarı Oranı"
          value={overview ? `%${overview.successRate}` : '—'}
          sub={
            overview && overview.sentProducts + overview.failedProducts > 0
              ? `${overview.sentProducts + overview.failedProducts} toplam denemeden`
              : 'Henüz gönderim yok'
          }
          iconBg={
            !overview ? 'bg-slate-100'
            : overview.successRate >= 80 ? 'bg-emerald-100'
            : overview.successRate >= 50 ? 'bg-amber-100'
            : 'bg-red-100'
          }
          icon={
            <svg className={`w-5 h-5 ${
              !overview ? 'text-slate-500'
              : overview.successRate >= 80 ? 'text-emerald-600'
              : overview.successRate >= 50 ? 'text-amber-600'
              : 'text-red-500'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          }
        />
      </div>

      {/* ── Ödeme özeti (vitrin siparişleri) ─────────────────────────────────── */}
      <PaymentSummarySection
        summary={overview?.paymentSummary}
        loading={loading}
        days={days}
      />

      {/* ── Chart + recent sends ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Line chart */}
        <div className="xl:col-span-2 wn-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Son {days} Gün — Gönderim Durumu</h2>
              <p className="text-xs text-slate-400 mt-0.5">Günlük başarılı / hatalı gönderim sayısı</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full bg-emerald-500 inline-block"/>Başarılı
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full bg-red-400 inline-block"/>Hatalı
              </span>
            </div>
          </div>

          {loading ? (
            <div className="h-52 bg-slate-50 rounded-xl animate-pulse"/>
          ) : !hasAnySend ? (
            <NoSendsYet />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9"/>
                <XAxis
                  dataKey="date"
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip content={<ChartTooltip />}/>
                <Line
                  type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2.5}
                  dot={false} activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                />
                <Line
                  type="monotone" dataKey="error" stroke="#f87171" strokeWidth={2.5}
                  dot={false} activeDot={{ r: 4, fill: '#f87171', strokeWidth: 0 }}
                  strokeDasharray="5 3"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent successful sends */}
        <div className="wn-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-900">Son Gönderilenler</h2>
            <a href="/dashboard/marketplaces/trendyol"
              className="text-xs text-orange-500 hover:text-orange-600 font-semibold transition-colors">
              Tümünü gör →
            </a>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse flex-shrink-0"/>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 bg-slate-100 rounded animate-pulse"/>
                    <div className="h-2.5 w-20 bg-slate-100 rounded animate-pulse"/>
                  </div>
                </div>
              ))}
            </div>
          ) : !overview?.recentSent?.length ? (
            <div className="py-8 text-center">
              <p className="text-xs text-slate-400">Henüz başarılı gönderim yok</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {overview.recentSent.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {s.productName ?? s.productId ?? '—'}
                    </p>
                    <p className="text-[11px] text-slate-400">{timeAgo(s.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Top errors (bonus) ───────────────────────────────────────────────── */}
      {!loading && (overview?.topErrors?.length ?? 0) > 0 && (
        <div className="wn-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">En Çok Hata Veren Ürünler</h2>
              <p className="text-xs text-slate-400 mt-0.5">Dikkat gerektiren ürünler — düzeltip yeniden gönderin</p>
            </div>
            <a href="/dashboard/products"
              className="text-xs text-orange-500 hover:text-orange-600 font-semibold transition-colors">
              Ürünlere Git →
            </a>
          </div>
          <div className="divide-y divide-slate-100">
            {overview!.topErrors.map((t, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {t.productName ?? t.productId ?? 'Bilinmeyen ürün'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                    {t.errorCount} hata
                  </span>
                  {t.productId && (
                    <a href={`/dashboard/products/${t.productId}/edit`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                      Düzelt →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick links ──────────────────────────────────────────────────────── */}
      <div className="wn-card p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Hızlı Erişim</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Ürünler',              href: '/dashboard/products',             bg: 'bg-indigo-50  text-indigo-600',  emoji: '📦' },
            { label: 'Trendyol',             href: '/dashboard/marketplaces/trendyol', bg: 'bg-orange-50  text-orange-600',  emoji: '🔗' },
            { label: 'Siparişler',           href: '/dashboard/orders',               bg: 'bg-emerald-50 text-emerald-700', emoji: '🛍️' },
            { label: 'Trendyol Siparişleri', href: '/dashboard/trendyol-orders',      bg: 'bg-amber-50   text-amber-700',   emoji: '📬' },
            { label: 'Kategoriler',          href: '/dashboard/categories',           bg: 'bg-cyan-50    text-cyan-700',    emoji: '🗂️' },
            { label: 'Raporlar',             href: '/dashboard/reports',              bg: 'bg-purple-50  text-purple-700',  emoji: '📊' },
          ].map(item => (
            <a key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-sm font-semibold ${item.bg}`}>
              <span>{item.emoji}</span>
              {item.label}
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}
