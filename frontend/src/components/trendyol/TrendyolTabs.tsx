/**
 * TrendyolTabs
 *
 * Trendyol pazaryerinin dış tab sistemi.
 * Mevcut TrendyolIntegration sayfası "Ürünler" tabına taşındı — hiçbir şeyi silinmedi.
 *
 * Tab'lar:
 *   Genel       – bağlantı durumu + istatistikler + hızlı aksiyonlar
 *   Ürünler     – mevcut TrendyolIntegration (dokunulmadı, bütünüyle burada)
 *   Siparişler  – TrendyolOrders bileşeni
 *   Ayarlar     – ileriki adımda kategori / marka / özellik buraya taşınacak
 */

import React, { useState, Suspense } from 'react';
import TrendyolGeneral from './TrendyolGeneral';

// Mevcut sayfalar — bozulmadan, olduğu gibi import edildi
const TrendyolIntegration = React.lazy(() => import('../../pages/TrendyolIntegrationPage'));
const TrendyolOrders      = React.lazy(() => import('../../pages/TrendyolOrders'));

// Ayarlar tab'ının yeni bağımsız componentleri
import TrendyolConnection      from './settings/TrendyolConnection';
import TrendyolCargoSettings   from './settings/TrendyolCargoSettings';
import TrendyolPriceSettings   from './settings/TrendyolPriceSettings';
import TrendyolCategoryMapping from './settings/TrendyolCategoryMapping';
import TrendyolBrandMapping    from './settings/TrendyolBrandMapping';
import TrendyolAttributeMapping from './settings/TrendyolAttributeMapping';

// ─── Tab tanımları ────────────────────────────────────────────────────────────

type TabId = 'genel' | 'urunler' | 'siparisler' | 'ayarlar';

interface TabDef {
  id:    TabId;
  label: string;
  icon:  string;
}

const TABS: TabDef[] = [
  {
    id:    'genel',
    label: 'Genel',
    icon:  'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    id:    'urunler',
    label: 'Ürünler',
    icon:  'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
  {
    id:    'siparisler',
    label: 'Siparişler',
    icon:  'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  },
  {
    id:    'ayarlar',
    label: 'Ayarlar',
    icon:  'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
];

// ─── Loading spinner ──────────────────────────────────────────────────────────

function TabSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <svg className="w-8 h-8 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  );
}

// ─── Tab: Genel — TrendyolGeneral component'ine delege edildi ─────────────────

// (Eski TabGenel içeriği TrendyolGeneral.tsx'e taşındı — hiçbir özellik kaybedilmedi)
function TabGenel({ onSwitchTab }: { onSwitchTab: (tab: 'ayarlar' | 'urunler' | 'siparisler') => void }) {
  return <TrendyolGeneral onSwitchTab={onSwitchTab} />;
}

// ─── Tab: Ürünler (mevcut TrendyolIntegration sayfası) ────────────────────────

function TabUrunler() {
  return (
    <Suspense fallback={<TabSpinner />}>
      {/*
       * TrendyolIntegration sayfası bütünüyle burada yaşıyor.
       * Hiçbir kodu değiştirilmedi, silınmedi; sadece bu tab'ın içine alındı.
       */}
      <TrendyolIntegration />
    </Suspense>
  );
}

// ─── Tab: Siparişler ─────────────────────────────────────────────────────────

function TabSiparisler() {
  return (
    <Suspense fallback={<TabSpinner />}>
      <TrendyolOrders />
    </Suspense>
  );
}

// ─── Tab: Ayarlar ─────────────────────────────────────────────────────────────

function TabAyarlar() {
  return (
    <div className="space-y-6">

      {/* Satır 1: API Bağlantısı (tam genişlik) */}
      <TrendyolConnection />

      {/* Satır 2: Kargo + Fiyat (yan yana) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TrendyolCargoSettings />
        <TrendyolPriceSettings />
      </div>

      {/* Satır 3: Mapping özet kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TrendyolCategoryMapping />
        <TrendyolBrandMapping />
        <TrendyolAttributeMapping />
      </div>

      {/* Satır 4: Gelişmiş — TrendyolIntegration'daki diğer tablar */}
      <div className="wn-card p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700">Gelişmiş Ayarlar</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Ürün gönderimi, fiyat hesaplayıcı, gönderim tanılama ve geçmiş logları için tam entegrasyon sayfası.
            </p>
          </div>
          <a href="/dashboard/marketplaces/trendyol"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors flex-shrink-0">
            Tam Sayfa
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      </div>

    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export default function TrendyolTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('genel');

  return (
    <div className="w-full space-y-0">

      {/* Tab bar */}
      <div className="border-b border-slate-200 mb-6">
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

      {/* Tab içerikleri */}
      {activeTab === 'genel'      && <TabGenel onSwitchTab={setActiveTab} />}
      {activeTab === 'urunler'    && <TabUrunler />}
      {activeTab === 'siparisler' && <TabSiparisler />}
      {activeTab === 'ayarlar'    && <TabAyarlar />}

    </div>
  );
}
