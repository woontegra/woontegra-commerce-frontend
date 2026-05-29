import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useBranding } from '../context/BrandingContext';
import { authService } from '../services/auth.service';
import {
  useFeatureContext,
  getMinPlanForFeature,
  PLAN_META,
} from '../context/FeatureContext';
import type { FeatureKey, PlanTier } from '../context/FeatureContext';
import { getPlanDisplayLabel } from '../utils/planDisplay';
import { displayStoreName } from '../utils/displayStoreName';
import { useAppStore } from '../store/useAppStore';
import { usePermissions } from '../hooks/usePermissions';
import NotificationDropdown from '../components/NotificationDropdown';
import TenantLifecycleBanner from '../components/lifecycle/TenantLifecycleBanner';
import DemoBanner, { useIsDemo } from '../components/DemoBanner';
import { api } from '../services/apiClient';
import { unwrapAdmin } from '../utils/adminApi';

// ─── SVG icon helper ──────────────────────────────────────────────────────────

const Icon = ({ d, className = 'w-4 h-4' }: { d: string | string[]; className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {(Array.isArray(d) ? d : [d]).map((path, i) => (
      <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={path} />
    ))}
  </svg>
);

// ─── Nav config ───────────────────────────────────────────────────────────────

interface NavItem {
  label:       string;
  to:          string;
  icon:        string | string[];
  featureKey?: FeatureKey;
  adminOnly?:  boolean;
}

interface NavGroup {
  id:      string;
  label:   string;
  items:   NavItem[];
  /** Groups open by default */
  defaultOpen?: boolean;
}

// Icons: all are single-path SVG d strings (keep consistent with existing design)
const IC = {
  dashboard:    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  orders:       'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  customers:    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0',
  cart:         'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
  products:     'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  categories:   'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  attributes:   'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  stock:        'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
  brands:       'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  campaigns:    'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  discount:     'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
  coupons:      'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
  shipping:     'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  import:       'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  reports:      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  integrations: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  trendyol:     'M13 10V3L4 14h7v7l9-11h-7z',
  marketplace:  'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  developer:    'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  blog:         'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
  seo:          ['M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'],
  billing:      'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  storeSettings:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  domain:       'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
  users:        'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  support:      'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z',
  bell:         'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  settings:     'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
  admin:        'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
};

const NAV: NavGroup[] = [
  {
    id: 'sales', label: 'Satış', defaultOpen: true,
    items: [
      { label: 'Siparişler',        to: '/dashboard/orders',         icon: IC.orders,    featureKey: 'order' },
      { label: 'İade / İptal Talepleri', to: '/dashboard/returns',  icon: IC.orders,    featureKey: 'order' },
      { label: 'Müşteriler',        to: '/dashboard/customers',      icon: IC.customers, featureKey: 'customer' },
      { label: 'Terk Edilen Sepet', to: '/dashboard/abandoned-carts',icon: IC.cart,      featureKey: 'abandoned_cart' },
    ],
  },
  {
    id: 'products', label: 'Ürünler', defaultOpen: true,
    items: [
      { label: 'Ürünler',     to: '/dashboard/products',    icon: IC.products    },
      { label: 'Kategoriler', to: '/dashboard/categories',  icon: IC.categories  },
      { label: 'Markalar',    to: '/dashboard/brands',      icon: IC.brands      },
      { label: 'Özellikler',  to: '/dashboard/attributes',  icon: IC.attributes  },
      { label: 'Stok',        to: '/dashboard/stock',       icon: IC.stock,       featureKey: 'stock_management' },
    ],
  },
  {
    id: 'marketing', label: 'Pazarlama', defaultOpen: true,
    items: [
      { label: 'Kampanyalar',       to: '/dashboard/campaigns',      icon: IC.campaigns                               },
      { label: 'İndirim Kuralları', to: '/dashboard/discount-rules', icon: IC.discount,  featureKey: 'discount_rules' },
      { label: 'Kuponlar',          to: '/dashboard/coupons',        icon: IC.coupons                                 },
    ],
  },
  {
    id: 'operations', label: 'Operasyon', defaultOpen: false,
    items: [
      { label: 'Kargo',         to: '/dashboard/shipping-management', icon: IC.shipping },
      { label: 'İçe/Dışa Aktar',to: '/dashboard/import-export',       icon: IC.import   },
      { label: 'XML kaynakları', to: '/dashboard/xml-sources',        icon: IC.integrations },
      { label: 'Raporlar',      to: '/dashboard/reports',             icon: IC.reports  },
      { label: 'Gözlem & Loglar', to: '/dashboard/observability',     icon: IC.admin    },
    ],
  },
  {
    id: 'integrations', label: 'Entegrasyon', defaultOpen: false,
    items: [
      { label: 'Entegrasyonlar', to: '/dashboard/integrations', icon: IC.integrations                           },
      { label: 'Pazaryerleri',   to: '/dashboard/marketplaces', icon: IC.marketplace                            },
      { label: 'Geliştirici',   to: '/dashboard/developer',    icon: IC.developer,   featureKey: 'api_access'  },
    ],
  },
  {
    id: 'content', label: 'İçerik', defaultOpen: false,
    items: [
      { label: 'Blog', to: '/dashboard/blog-management', icon: IC.blog },
      { label: 'SEO',  to: '/dashboard/seo',             icon: IC.seo  },
    ],
  },
  {
    id: 'settings', label: 'Ayarlar', defaultOpen: false,
    items: [
      { label: 'Faturalama',     to: '/dashboard/billing',       icon: IC.billing       },
      { label: 'Mağaza Ayarları',to: '/dashboard/store-settings',icon: IC.storeSettings },
      { label: 'Ödeme Ayarları', to: '/dashboard/settings/payments', icon: IC.billing  },
      { label: 'Kargo Ayarları', to: '/dashboard/settings/shipping', icon: IC.shipping },
      { label: 'Domain',         to: '/dashboard/domain',        icon: IC.domain        },
      { label: 'Genel Ayarlar',  to: '/dashboard/settings',      icon: IC.settings      },
    ],
  },
  {
    id: 'support', label: 'Destek', defaultOpen: false,
    items: [
      { label: 'Destek',     to: '/dashboard/support',       icon: IC.support },
      { label: 'Bildirimler',to: '/dashboard/notifications', icon: IC.bell    },
    ],
  },
];

// ─── Plan lock badge ──────────────────────────────────────────────────────────

const PLAN_LOCK_COLORS: Record<PlanTier, string> = {
  STARTER: 'bg-slate-700/50 text-slate-400 border-slate-600',
  PRO: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  ENTERPRISE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

function SidebarLockBadge({ requiredPlan }: { requiredPlan: PlanTier }) {
  return (
    <span
      title={`${PLAN_META[requiredPlan].label} planı gerekli`}
      className={`ml-auto flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${PLAN_LOCK_COLORS[requiredPlan]}`}
    >
      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
      {PLAN_META[requiredPlan].label}
    </span>
  );
}

// ─── Single sidebar link ──────────────────────────────────────────────────────

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation();
  const { isEnabled } = useFeatureContext();

  const isActive = item.to === '/dashboard'
    ? location.pathname === '/dashboard'
    : location.pathname === item.to || location.pathname.startsWith(item.to + '/');

  const featureLocked = item.featureKey ? !isEnabled(item.featureKey) : false;
  const requiredPlan  = item.featureKey ? getMinPlanForFeature(item.featureKey) : null;

  return (
    <Link
      to={item.to}
      title={collapsed
        ? featureLocked && requiredPlan
          ? `${item.label} — ${PLAN_META[requiredPlan].label} planı gerekli`
          : item.label
        : undefined
      }
      className={[
        'group flex items-center rounded-xl transition-all duration-200 ease-out',
        collapsed ? 'justify-center p-3 w-full' : 'gap-3 px-3 py-2.5',
        'hover:bg-white/[0.08] hover:translate-x-0.5',
        isActive
          ? 'bg-gradient-to-r from-brand-500/20 to-brand-500/5 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)] border-l-2 border-brand-400'
          : 'text-slate-400 hover:text-slate-200',
        featureLocked ? 'opacity-60' : '',
      ].filter(Boolean).join(' ')}
    >
      <Icon
        d={item.icon}
        className={`flex-shrink-0 transition-colors duration-200 ${
          collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'
        } ${
          isActive
            ? 'text-brand-400'
            : featureLocked
              ? 'text-slate-500 group-hover:text-slate-400'
              : 'text-slate-500 group-hover:text-brand-300'
        }`}
      />
      {!collapsed && (
        <>
          <span className={`truncate flex-1 text-[13px] font-medium ${
            isActive ? 'text-white' : ''
          }`}>
            {item.label}
          </span>
          {featureLocked && requiredPlan && (
            <SidebarLockBadge requiredPlan={requiredPlan} />
          )}
        </>
      )}
    </Link>
  );
}

// ─── Collapsible group ────────────────────────────────────────────────────────

function NavSection({
  group, collapsed, open, onToggle,
}: {
  group:    NavGroup;
  collapsed: boolean;
  open:     boolean;
  onToggle: () => void;
}) {
  const location    = useLocation();

  // Auto-open group when a child route is active
  const hasActiveChild = group.items.some(item =>
    item.to === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname === item.to || location.pathname.startsWith(item.to + '/'),
  );

  // Show group if at least 1 item is accessible (or locked but visible)
  const visibleItems = group.items; // locked items show with badge, not hidden

  if (visibleItems.length === 0) return null;

  // In collapsed sidebar: show all items without the header
  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {visibleItems.map(item => (
          <SidebarLink key={item.to} item={item} collapsed />
        ))}
      </div>
    );
  }

  const effectiveOpen = open || hasActiveChild;

  return (
    <div className={collapsed ? 'space-y-2' : 'mb-3'}>
      {/* Group header - hidden in collapsed mode */}
      {!collapsed && (
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.06] transition-all duration-200 group"
        >
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase group-hover:text-slate-300 transition-colors">
            {group.label}
          </span>
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 group-hover:text-slate-400 ${effectiveOpen ? '' : '-rotate-90'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* Items */}
      {effectiveOpen && (
        <div className={collapsed ? 'space-y-1' : 'mt-1.5 space-y-1 pl-1'}>
          {visibleItems.map(item => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Plan sidebar badge ───────────────────────────────────────────────────────

const PLAN_PILL: Record<PlanTier, { bg: string; text: string; icon: string; glow: string }> = {
  STARTER: {
    bg: 'bg-slate-700/80',
    text: 'text-slate-200',
    icon: 'text-slate-400',
    glow: 'shadow-none',
  },
  PRO: {
    bg: 'bg-gradient-to-r from-indigo-600 to-indigo-500',
    text: 'text-white',
    icon: 'text-indigo-200',
    glow: 'shadow-lg shadow-indigo-500/25',
  },
  ENTERPRISE: {
    bg: 'bg-gradient-to-r from-amber-500 to-amber-400',
    text: 'text-amber-950',
    icon: 'text-amber-100',
    glow: 'shadow-lg shadow-amber-500/25',
  },
};

function PlanSidebarBadge() {
  const { plan, tenantStatus } = useFeatureContext();
  const navigate  = useNavigate();
  const upgradeTo = PLAN_META[plan].upgradeTo;
  const pill = PLAN_PILL[plan];
  const planLabel = getPlanDisplayLabel(plan, tenantStatus);

  return (
    <div className="mx-2 mb-2 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.1] p-4 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className={`w-4 h-4 ${pill.icon}`} viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Aktif Plan</span>
        </div>
        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${pill.bg} ${pill.text} ${pill.glow}`}>
          {planLabel}
        </span>
      </div>

      {/* Upgrade button */}
      {upgradeTo && (
        <button
          onClick={() => navigate('/dashboard/billing')}
          className="w-full text-[12px] font-semibold text-white bg-brand-500 hover:bg-brand-400 active:scale-[0.98] flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
          </svg>
          {PLAN_META[upgradeTo].label}'e Yükselt
        </button>
      )}

      {/* Enterprise users - no upgrade needed */}
      {!upgradeTo && (
        <div className="flex items-center justify-center gap-2 py-2 text-[12px] font-medium text-emerald-400">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Tam Erişim
        </div>
      )}
    </div>
  );
}

// ─── Dashboard layout ─────────────────────────────────────────────────────────

export default function DashboardLayout() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user, logout } = useAppStore();
  const { canAccessPlatformAdmin } = usePermissions();
  const { branding }     = useBranding();

  const [collapsed,         setCollapsed]         = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen,      setUserMenuOpen]      = useState(false);
  const [searchQuery,       setSearchQuery]       = useState('');

  // Collapsible group state (keyed by group id)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV.map(g => [g.id, g.defaultOpen ?? false])),
  );

  const toggleGroup = (id: string) =>
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const handleLogout = async () => {
    authService.logout();
    logout();
    navigate('/login');
  };

  const impersonationBanner = (() => {
    const t = localStorage.getItem('token');
    if (!t) return null;
    try {
      const b64 = t.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/') ?? '';
      const p = JSON.parse(atob(b64)) as {
        isImpersonation?: boolean;
        adminId?: string;
        impersonatedBy?: string;
      };
      const isImp = p.isImpersonation === true || Boolean(p.impersonatedBy);
      if (!isImp) return null;
      const tenantLabel = sessionStorage.getItem('impersonationTenantName') || 'Tenant';
      return { tenantLabel };
    } catch {
      return null;
    }
  })();

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const sidebarW = collapsed ? 'w-20' : 'w-64';

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">

      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 flex flex-col
        bg-[#0b1120] border-r border-white/[0.05]
        transition-all duration-300 ease-in-out
        ${sidebarW}
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo + collapse toggle */}
        <div className={`flex items-center h-16 border-b border-white/[0.08] flex-shrink-0 ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          {!collapsed && (
            <div className="flex items-center gap-3 min-w-0">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={displayStoreName(branding.siteName)} className="h-7 max-w-[140px] object-contain" />
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg shadow-brand-500/20">W</div>
                  <span className="text-sm font-bold text-white tracking-tight truncate">{displayStoreName(branding.siteName)}</span>
                </div>
              )}
            </div>
          )}
          {collapsed && (
            <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-brand-500/20">W</div>
          )}

          {/* Collapse button (desktop) */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(c => !c)}
              className="hidden lg:flex w-8 h-8 rounded-lg items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Close button (mobile) */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Navigation ─────────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto no-scrollbar py-4 px-3">
          {/* Dashboard home — highlighted */}
          <div className="mb-4">
            <SidebarLink
              item={{ label: 'Panel', to: '/dashboard', icon: IC.dashboard }}
              collapsed={collapsed}
            />
          </div>

          {/* Grouped sections with visual separator */}
          <div className={collapsed ? 'space-y-3' : 'space-y-4'}>
            {NAV.map((group, index) => (
              <div key={group.id} className={index > 0 ? 'pt-2 border-t border-white/[0.04]' : ''}>
                <NavSection
                  group={group}
                  collapsed={collapsed}
                  open={openGroups[group.id] ?? false}
                  onToggle={() => toggleGroup(group.id)}
                />
              </div>
            ))}
          </div>

          {/* Platform admin (/admin) — yalnızca SUPER_ADMIN */}
          {canAccessPlatformAdmin && (
            <div className={`mt-4 ${!collapsed ? 'pt-3 border-t border-white/[0.05]' : ''}`}>
              {!collapsed && (
                <p className="px-3 py-2 text-[11px] font-bold tracking-wider text-brand-400/80 uppercase">
                  Yönetim
                </p>
              )}
              <SidebarLink
                item={{ label: 'Admin Panel', to: '/admin', icon: IC.admin }}
                collapsed={collapsed}
              />
            </div>
          )}
        </nav>

        {/* Plan badge */}
        {!collapsed && <PlanSidebarBadge />}

        {/* Logout — modern button style */}
        <div className="border-t border-white/[0.08] p-3 flex-shrink-0">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Çıkış Yap' : undefined}
          >
            <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && (
              <span className="text-[13px] font-medium">Çıkış Yap</span>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>

        {/* ── Topbar ──────────────────────────────────────────────────────────── */}
        <header className="h-14 flex-shrink-0 flex items-center gap-4 px-6 bg-white border-b border-slate-200 relative z-10">

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="topbar-btn lg:hidden"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Search */}
          <div className="flex-1 max-w-sm hidden sm:block">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ara..."
                className="wn-input pl-9 py-2 text-sm h-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <NotificationDropdown />
            <div className="w-px h-6 bg-slate-200" />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2.5 h-9 pl-2 pr-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
              >
                <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {user?.firstName?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium text-slate-800 leading-tight">{user?.firstName} {user?.lastName}</p>
                  <p className="text-[10px] text-slate-400 leading-tight capitalize">{user?.role?.toLowerCase()}</p>
                </div>
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 z-20 animate-scale-in">
                    <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-200">
                      <div className="p-3 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-800">{user?.firstName} {user?.lastName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{user?.email}</p>
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        {[
                          { label: 'Profil',            to: '/dashboard/settings'       },
                          { label: 'Mağaza Ayarları',   to: '/dashboard/store-settings' },
                          { label: 'Mağaza kurulumu',   to: '/onboarding?resume=1'      },
                          { label: 'Geliştirici',       to: '/dashboard/developer'       },
                        ].map(item => (
                          <Link
                            key={item.to + item.label}
                            to={item.to}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                          >
                            {item.label}
                          </Link>
                        ))}
                        <div className="border-t border-slate-100 my-1" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Çıkış Yap
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Demo banner — gösterildiğinde lifecycle banner gizlenir */}
        {useIsDemo() ? <DemoBanner /> : <TenantLifecycleBanner />}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {impersonationBanner && (
            <div className="px-6 pt-4 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p>
                  <span className="font-semibold">Taklit oturumu:</span>{' '}
                  Şu an <span className="font-medium">{impersonationBanner.tenantLabel}</span> tenant olarak giriş yaptınız.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await api.post('/admin/impersonate/stop');
                      const d = unwrapAdmin<{
                        token: string; refreshToken: string; user?: Record<string, unknown>;
                      }>(res);
                      localStorage.setItem('token', d.token);
                      if (d.refreshToken) localStorage.setItem('refreshToken', d.refreshToken);
                      if (d.user) localStorage.setItem('user', JSON.stringify(d.user));
                      sessionStorage.removeItem('impersonationTenantName');
                      sessionStorage.removeItem('adminTokenPriorImpersonation');
                      window.location.assign('/admin');
                    } catch {
                      const prev = sessionStorage.getItem('adminTokenPriorImpersonation');
                      if (prev) {
                        localStorage.setItem('token', prev);
                        sessionStorage.removeItem('adminTokenPriorImpersonation');
                        sessionStorage.removeItem('impersonationTenantName');
                        window.location.assign('/admin');
                      }
                    }
                  }}
                  className="shrink-0 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
                >
                  Çık
                </button>
              </div>
            </div>
          )}
          <div className="p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
