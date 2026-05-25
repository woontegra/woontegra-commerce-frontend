/**
 * MarketplaceHub
 * Tüm pazaryeri entegrasyonlarının merkezi yönetim sayfası.
 * Her kart bağlantı durumu + temel istatistikleri gösterir.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

// ─── Marketplace tanımları ────────────────────────────────────────────────────

export interface MarketplaceDef {
  slug:        string;
  name:        string;
  description: string;
  logo:        React.ReactNode;
  accentColor: string;  // Tailwind ring/bg color
  available:   boolean; // false = "Yakında"
}

const LOGO_TRENDYOL = (
  <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none">
    <circle cx="32" cy="32" r="32" fill="#F27A1A"/>
    <path d="M20 44 L32 20 L44 44 L32 38 Z" fill="white"/>
  </svg>
);

const LOGO_GENERIC = (color: string) => (
  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
    </svg>
  </div>
);

export const MARKETPLACES: MarketplaceDef[] = [
  {
    slug:        'trendyol',
    name:        'Trendyol',
    description: 'Türkiye\'nin en büyük e-ticaret platformu',
    logo:        LOGO_TRENDYOL,
    accentColor: 'orange',
    available:   true,
  },
  {
    slug:        'n11',
    name:        'N11',
    description: 'Büyük indirimler, büyük fırsatlar',
    logo:        LOGO_GENERIC('bg-purple-500'),
    accentColor: 'purple',
    available:   false,
  },
  {
    slug:        'hepsiburada',
    name:        'Hepsiburada',
    description: 'Teknoloji ve yaşam tarzı ürünleri',
    logo:        LOGO_GENERIC('bg-blue-500'),
    accentColor: 'blue',
    available:   false,
  },
  {
    slug:        'amazon',
    name:        'Amazon',
    description: 'Küresel e-ticaret devi',
    logo:        LOGO_GENERIC('bg-amber-500'),
    accentColor: 'amber',
    available:   false,
  },
  {
    slug:        'etsy',
    name:        'Etsy',
    description: 'El yapımı ve vintage ürünler',
    logo:        LOGO_GENERIC('bg-rose-500'),
    accentColor: 'rose',
    available:   false,
  },
  {
    slug:        'ciceksepeti',
    name:        'ÇiçekSepeti',
    description: 'Hediye ve çiçek platformu',
    logo:        LOGO_GENERIC('bg-pink-500'),
    accentColor: 'pink',
    available:   false,
  },
];

// ─── Stats for Trendyol ───────────────────────────────────────────────────────

interface TrendyolStatus {
  connected:      boolean;
  supplierId?:    string;
  lastSync?:      string;
  sentProducts?:  number;
  failedProducts?: number;
  totalOrders?:   number;
}

// ─── Accent map ───────────────────────────────────────────────────────────────

const ACCENT: Record<string, { ring: string; badge: string; btn: string; glow: string }> = {
  orange: { ring: 'ring-orange-200 hover:ring-orange-400', badge: 'bg-orange-100 text-orange-700', btn: 'bg-orange-500 hover:bg-orange-600 text-white', glow: 'from-orange-50 to-white' },
  purple: { ring: 'ring-purple-200 hover:ring-purple-400', badge: 'bg-purple-100 text-purple-700', btn: 'bg-purple-500 hover:bg-purple-600 text-white', glow: 'from-purple-50 to-white' },
  blue:   { ring: 'ring-blue-200   hover:ring-blue-400',   badge: 'bg-blue-100   text-blue-700',   btn: 'bg-blue-500   hover:bg-blue-600   text-white', glow: 'from-blue-50   to-white' },
  amber:  { ring: 'ring-amber-200  hover:ring-amber-400',  badge: 'bg-amber-100  text-amber-700',  btn: 'bg-amber-500  hover:bg-amber-600  text-white', glow: 'from-amber-50  to-white' },
  rose:   { ring: 'ring-rose-200   hover:ring-rose-400',   badge: 'bg-rose-100   text-rose-700',   btn: 'bg-rose-500   hover:bg-rose-600   text-white', glow: 'from-rose-50   to-white' },
  pink:   { ring: 'ring-pink-200   hover:ring-pink-400',   badge: 'bg-pink-100   text-pink-700',   btn: 'bg-pink-500   hover:bg-pink-600   text-white', glow: 'from-pink-50   to-white' },
};

// ─── Card ────────────────────────────────────────────────────────────────────

function MarketplaceCard({
  mp, status, loading,
}: {
  mp:      MarketplaceDef;
  status?: TrendyolStatus | null;
  loading: boolean;
}) {
  const navigate = useNavigate();
  const ac = ACCENT[mp.accentColor] ?? ACCENT.orange;

  const connected = mp.slug === 'trendyol' ? (status?.connected ?? false) : false;

  const handleClick = () => {
    if (!mp.available) return;
    if (mp.slug === 'trendyol') {
      navigate('/dashboard/marketplaces/trendyol');
      return;
    }
    navigate(`/dashboard/marketplaces/${mp.slug}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative bg-white rounded-2xl ring-2 transition-all duration-200 overflow-hidden
        ${mp.available ? `cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${ac.ring}` : 'ring-slate-100 opacity-60 cursor-default'}
      `}
    >
      {/* Gradient top strip */}
      <div className={`h-1 w-full bg-gradient-to-r ${
        mp.accentColor === 'orange' ? 'from-orange-400 to-orange-500' :
        mp.accentColor === 'purple' ? 'from-purple-400 to-purple-500' :
        mp.accentColor === 'blue'   ? 'from-blue-400   to-blue-500'   :
        mp.accentColor === 'amber'  ? 'from-amber-400  to-amber-500'  :
        mp.accentColor === 'rose'   ? 'from-rose-400   to-rose-500'   :
                                      'from-pink-400   to-pink-500'
      }`}/>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {mp.logo}
            <div>
              <h3 className="text-sm font-bold text-slate-900">{mp.name}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{mp.description}</p>
            </div>
          </div>

          {mp.available ? (
            loading ? (
              <div className="w-16 h-5 bg-slate-100 rounded-full animate-pulse"/>
            ) : connected ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                Bağlı
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"/>
                Bağlı Değil
              </span>
            )
          ) : (
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
              Yakında
            </span>
          )}
        </div>

        {/* Stats (Trendyol only when connected) */}
        {mp.slug === 'trendyol' && connected && !loading && status && (
          <div className="grid grid-cols-3 gap-2 mt-3 pt-4 border-t border-slate-100">
            <div className="text-center">
              <p className="text-base font-bold text-slate-900">{status.sentProducts ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Gönderilen</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-red-600">{status.failedProducts ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Hatalı</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-900">{status.totalOrders ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Sipariş</p>
            </div>
          </div>
        )}

        {/* Trendyol not connected nudge */}
        {mp.slug === 'trendyol' && !connected && !loading && mp.available && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[11px] text-slate-400">Trendyol hesabınızı bağlamak için tıklayın.</p>
          </div>
        )}

        {/* Upcoming placeholder */}
        {!mp.available && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[11px] text-slate-400">Bu entegrasyon çok yakında kullanıma açılacak.</p>
          </div>
        )}

        {/* CTA */}
        {mp.available && (
          <div className="mt-4">
            <div className={`w-full py-2 rounded-xl text-center text-xs font-semibold transition-colors ${ac.btn}`}>
              {connected ? 'Yönet →' : 'Bağla →'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Hub page ─────────────────────────────────────────────────────────────────

export default function MarketplaceHub() {
  const [trendyolStatus, setTrendyolStatus] = useState<TrendyolStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      try {
        const [intRes, reportRes, ordersRes] = await Promise.allSettled([
          apiClient.get('/trendyol/integration'),
          apiClient.get('/reports/overview?days=30'),
          apiClient.get('/trendyol/orders?limit=1'),
        ]);

        const integration = intRes.status === 'fulfilled'
          ? (intRes.value.data?.data ?? intRes.value.data) : null;

        const report = reportRes.status === 'fulfilled'
          ? (reportRes.value.data?.data ?? reportRes.value.data) : null;

        const orders = ordersRes.status === 'fulfilled'
          ? (ordersRes.value.data?.data ?? ordersRes.value.data) : null;

        setTrendyolStatus({
          connected:      !!(integration?.supplierId),
          supplierId:     integration?.supplierId,
          lastSync:       integration?.lastSync,
          sentProducts:   report?.sentProducts ?? 0,
          failedProducts: report?.failedProducts ?? 0,
          totalOrders:    orders?.total ?? 0,
        });
      } catch {
        setTrendyolStatus({ connected: false });
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const connectedCount = trendyolStatus?.connected ? 1 : 0;

  return (
    <div className="w-full space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pazaryerleri</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading
              ? 'Bağlantılar kontrol ediliyor...'
              : `${connectedCount} aktif entegrasyon · ${MARKETPLACES.filter(m => m.available).length} kullanılabilir`}
          </p>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"/>
            <span className="text-xs font-semibold text-emerald-700">{connectedCount} Bağlı</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-400"/>
            <span className="text-xs font-semibold text-slate-600">
              {MARKETPLACES.filter(m => m.available).length - connectedCount} Bağlanabilir
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {MARKETPLACES.map(mp => (
          <MarketplaceCard
            key={mp.slug}
            mp={mp}
            status={mp.slug === 'trendyol' ? trendyolStatus : null}
            loading={loading && mp.slug === 'trendyol'}
          />
        ))}
      </div>

      {/* Info banner */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
        <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p className="text-xs text-slate-500">
          Her pazaryeri entegrasyonu ürünlerinizi otomatik senkronize eder, siparişlerinizi çeker ve stokları günceller.
          Yeni entegrasyonlar düzenli olarak eklenmektedir.
        </p>
      </div>

    </div>
  );
}
