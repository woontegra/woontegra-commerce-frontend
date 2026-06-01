import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Heart, Search, ShoppingCart, User } from 'lucide-react';
import { useState } from 'react';
import type { StorefrontTenantInfo } from '../../contexts/StorefrontTenantContext';
import { displayStorefrontName } from '../../utils/displayStoreName';
import { useStorefrontCartOptional } from '../hooks/StorefrontCartProvider';
import { useStorefrontAuthOptional } from '../hooks/StorefrontAuthProvider';
import {
  headerLogoImageStyle,
  mergeHeaderSettings,
  type HeaderSettings,
} from '../../utils/headerSettingsHelpers';
import { normalizeStoreImageUrl } from '../services/storefrontApi';

type Props = {
  tenant: StorefrontTenantInfo;
  storeLink: (path: string) => string;
  settings?: HeaderSettings | Record<string, unknown>;
  preview?: boolean;
};

function LegacyStorefrontHeader({
  tenant,
  storeLink,
  logoSettings,
}: Omit<Props, 'settings' | 'preview'> & { logoSettings: HeaderSettings }) {
  const cart = useStorefrontCartOptional();
  const auth = useStorefrontAuthOptional();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const home = storeLink('/store');
  const products = storeLink('/store/urunler');
  const cartUrl = storeLink('/store/sepet');
  const account = storeLink('/store/hesabim');
  const login = storeLink('/store/giris');

  const itemCount = cart?.itemCount ?? 0;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const authLoading = auth?.loading ?? false;

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate(storeLink(`/store/urunler?search=${encodeURIComponent(term)}`));
  };

  const displayName = displayStorefrontName(tenant.name);
  const logoSrc = normalizeStoreImageUrl(tenant.logoUrl);
  const logoStyle = headerLogoImageStyle(logoSettings);

  return (
    <header className="store-header sticky top-0 z-40">
      <div className="store-header-inner">
        <div className="store-header-row">
          <Link
            to={home}
            className="store-header-logo store-header-logo--sized"
            style={logoSrc ? { maxWidth: logoStyle.width } : undefined}
          >
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={displayName}
                className="store-header-logo-img store-header-logo-img--configured"
                style={logoStyle}
              />
            ) : (
              <>
                <span className="store-header-logo-fallback">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className="store-header-brand-name">{displayName}</span>
              </>
            )}
          </Link>

          <nav className="store-header-nav hidden xl:flex items-center">
            <NavLink
              to={home}
              className={({ isActive }) => `store-header-nav-link ${isActive ? 'active' : ''}`}
              end
            >
              Ana sayfa
            </NavLink>
            <NavLink
              to={products}
              className={({ isActive }) => `store-header-nav-link ${isActive ? 'active' : ''}`}
            >
              Ürünler
            </NavLink>
          </nav>

          <form onSubmit={onSearch} className="store-header-search-col hidden md:block min-w-0">
            <div className="store-header-search relative w-full flex items-center">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
              <input
                type="search"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Ürün, kategori veya marka ara…"
                className="w-full pl-11 pr-4 py-2.5 text-sm bg-transparent focus:outline-none"
              />
            </div>
          </form>

          <div className="store-header-actions">
            {!authLoading && isAuthenticated ? (
              <Link to={account} className="store-header-icon-btn" aria-label="Hesabım">
                <User className="w-4 h-4" />
              </Link>
            ) : (
              <Link to={login} className="store-header-icon-btn" aria-label="Giriş">
                <User className="w-4 h-4" />
              </Link>
            )}
            <Link to={cartUrl} className="store-header-icon-btn store-header-icon-btn--cart" aria-label="Sepet">
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Sepet</span>
              {itemCount > 0 && <span className="store-header-cart-badge">{itemCount}</span>}
            </Link>
          </div>
        </div>

        <form onSubmit={onSearch} className="md:hidden pb-3">
          <div className="store-header-search flex items-center">
            <Search className="ml-4 h-4 w-4 text-stone-400 shrink-0 pointer-events-none" />
            <input
              type="search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Ürün ara…"
              className="w-full px-3 py-2.5 text-sm bg-transparent focus:outline-none"
            />
          </div>
        </form>
      </div>
    </header>
  );
}

function LogoBlock({
  tenant,
  home,
  logoWidthPx,
  logoMaxHeightPx,
  preview,
}: {
  tenant: StorefrontTenantInfo;
  home: string;
  logoWidthPx: number;
  logoMaxHeightPx: number;
  preview?: boolean;
}) {
  const displayName = displayStorefrontName(tenant.name);
  const logoStyle = headerLogoImageStyle({ logoWidthPx, logoMaxHeightPx });
  const logoSrc = normalizeStoreImageUrl(tenant.logoUrl);
  const fallbackSize = Math.min(logoMaxHeightPx, 48);

  const inner = logoSrc ? (
    <img
      src={logoSrc}
      alt={displayName}
      className="store-header-logo-img--configured shrink-0"
      style={logoStyle}
    />
  ) : (
    <>
      <span
        className="store-header-logo-fallback shrink-0"
        style={{ width: fallbackSize, height: fallbackSize }}
      >
        {displayName.slice(0, 1).toUpperCase()}
      </span>
      <span className="truncate max-w-[8rem] sm:max-w-none font-semibold text-base sm:text-lg">{displayName}</span>
    </>
  );

  if (preview) {
    return (
      <div className="flex items-center gap-2 truncate shrink-0 min-w-0 max-w-full cursor-default">
        {inner}
      </div>
    );
  }

  return (
    <Link to={home} className="flex items-center gap-2 truncate shrink-0 min-w-0 max-w-full">
      {inner}
    </Link>
  );
}

function SearchField({
  q,
  setQ,
  onSearch,
  className = '',
  compact = false,
}: {
  q: string;
  setQ: (v: string) => void;
  onSearch: (e: React.FormEvent) => void;
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <form onSubmit={onSearch} className={className}>
        <button type="submit" className="p-2 rounded-lg border border-slate-200/80 hover:bg-black/5" aria-label="Ara">
          <Search className="w-4 h-4" />
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSearch} className={className}>
      <div className="store-header-search relative w-full flex items-center">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Ürün ara…"
          className="w-full pl-11 pr-4 py-2.5 text-sm bg-transparent focus:outline-none"
        />
      </div>
    </form>
  );
}

function ConfiguredStorefrontHeader({
  tenant,
  storeLink,
  settings,
  preview = false,
}: {
  tenant: StorefrontTenantInfo;
  storeLink: (path: string) => string;
  settings: HeaderSettings;
  preview?: boolean;
}) {
  const cart = useStorefrontCartOptional();
  const auth = useStorefrontAuthOptional();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const home = storeLink('/store');
  const products = storeLink('/store/urunler');
  const cartUrl = storeLink('/store/sepet');
  const account = storeLink('/store/hesabim');
  const login = storeLink('/store/giris');
  const favorites = storeLink('/store/favoriler');

  const itemCount = preview ? 2 : (cart?.itemCount ?? 0);
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const authLoading = auth?.loading ?? false;
  const isMinimal = settings.layout === 'minimal';
  const isLogoCenterBelow = settings.layout === 'logoCenterMenuBelow';

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (preview) return;
    const term = q.trim();
    if (!term) return;
    navigate(storeLink(`/store/urunler?search=${encodeURIComponent(term)}`));
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: settings.backgroundColor,
    color: settings.textColor,
    ...(settings.borderEnabled ? { borderBottom: '1px solid rgba(148, 163, 184, 0.35)' } : {}),
  };

  const navStyle: React.CSSProperties = {
    fontSize: settings.menuFontSizePx,
    color: settings.textColor,
  };

  const linkClass = preview ? 'cursor-default' : '';
  const activeStyle = { color: settings.activeColor };

  const NavItem = ({ to, children, end }: { to: string; children: React.ReactNode; end?: boolean }) => {
    if (preview) {
      return <span className={`font-medium opacity-80 ${linkClass}`}>{children}</span>;
    }
    return (
      <NavLink
        to={to}
        end={end}
        className="font-medium hover:opacity-100 opacity-80 transition-opacity"
        style={({ isActive }) => (isActive ? activeStyle : undefined)}
      >
        {children}
      </NavLink>
    );
  };

  const PlainLink = ({ to, children, className = '' }: { to: string; children: React.ReactNode; className?: string }) => {
    if (preview) {
      return <span className={`font-medium opacity-80 ${className}`}>{children}</span>;
    }
    return (
      <Link to={to} className={`font-medium hover:opacity-100 opacity-80 transition-opacity ${className}`}>
        {children}
      </Link>
    );
  };

  const menuLinks = !isMinimal && (
    <>
      <NavItem to={home} end>
        Ana sayfa
      </NavItem>
      <NavItem to={products}>Ürünler</NavItem>
    </>
  );

  const accountLinks = settings.showAccount && (
    <>
      {!authLoading && isAuthenticated ? (
        <>
          <PlainLink to={account} className="hidden sm:inline">
            Hesabım
          </PlainLink>
          {!preview && (
            <button
              type="button"
              onClick={() => auth?.logout()}
              className="hidden sm:inline font-medium opacity-80 hover:opacity-100"
            >
              Çıkış
            </button>
          )}
          {preview && <span className="hidden sm:inline font-medium opacity-80">Çıkış</span>}
        </>
      ) : (
        <>
          <PlainLink to={account} className="hidden sm:inline">
            Hesabım
          </PlainLink>
          <PlainLink to={login} className="hidden sm:inline">
            Giriş
          </PlainLink>
        </>
      )}
    </>
  );

  const iconBtnCls =
    'relative inline-flex items-center justify-center p-2 rounded-lg border border-slate-200/70 hover:bg-black/5 transition-colors';

  const iconsRow = (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      {settings.showFavorites && (
        preview ? (
          <span className={iconBtnCls} aria-hidden>
            <Heart className="w-4 h-4" />
          </span>
        ) : (
          <Link to={favorites} className={iconBtnCls} aria-label="Favoriler">
            <Heart className="w-4 h-4" />
          </Link>
        )
      )}
      {settings.showCart && (
        preview ? (
          <span className={iconBtnCls}>
            <ShoppingCart className="w-4 h-4" />
            {itemCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[1.1rem] h-4 px-0.5 rounded-full text-[10px] flex items-center justify-center text-white"
                style={{ backgroundColor: settings.activeColor }}
              >
                {itemCount}
              </span>
            )}
          </span>
        ) : (
          <Link to={cartUrl} className={iconBtnCls} aria-label="Sepet">
            <ShoppingCart className="w-4 h-4" />
            {itemCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[1.1rem] h-4 px-0.5 rounded-full text-[10px] flex items-center justify-center text-white"
                style={{ backgroundColor: settings.activeColor }}
              >
                {itemCount}
              </span>
            )}
          </Link>
        )
      )}
      {settings.showAccount && settings.mobileLayout === 'minimal' && (
        preview ? (
          <span className={iconBtnCls}>
            <User className="w-4 h-4" />
          </span>
        ) : (
          <Link to={isAuthenticated ? account : login} className={iconBtnCls} aria-label="Hesap">
            <User className="w-4 h-4" />
          </Link>
        )
      )}
      {accountLinks}
    </div>
  );

  const desktopSearch =
    settings.showSearch &&
    !isMinimal &&
    settings.mobileLayout !== 'compact' && (
      <SearchField
        q={q}
        setQ={setQ}
        onSearch={onSearch}
        className="hidden md:flex flex-1 max-w-md mx-2 lg:mx-4 min-w-0"
      />
    );

  const mobileSearchStacked =
    settings.showSearch &&
    settings.mobileLayout === 'stacked' && (
      <SearchField q={q} setQ={setQ} onSearch={onSearch} className="md:hidden pb-3" />
    );

  const mobileSearchCompact =
    settings.showSearch && settings.mobileLayout === 'compact' && (
      <SearchField q={q} setQ={setQ} onSearch={onSearch} className="md:hidden" compact />
    );

  const menuJustify =
    settings.menuPosition === 'left'
      ? 'justify-start'
      : settings.menuPosition === 'right'
        ? 'justify-end'
        : 'justify-center';

  const rowHeight = { minHeight: settings.heightPx };

  return (
    <header
      className={`${settings.sticky ? 'sticky top-0 z-40' : 'relative z-40'} ${settings.backgroundColor.includes('rgba') || settings.backgroundColor.length > 7 ? 'backdrop-blur-sm' : ''}`}
      style={headerStyle}
    >
      <div className="max-w-6xl mx-auto px-4">
        {isLogoCenterBelow ? (
          <>
            <div className="flex items-center justify-center py-2" style={rowHeight}>
              <LogoBlock
                tenant={tenant}
                home={home}
                logoWidthPx={settings.logoWidthPx}
                logoMaxHeightPx={settings.logoMaxHeightPx}
                preview={preview}
              />
            </div>
            <div className="flex items-center gap-3 pb-2" style={{ minHeight: Math.max(40, settings.heightPx - 24) }}>
              <nav
                className={`hidden md:flex flex-1 items-center gap-3 sm:gap-4 ${menuJustify}`}
                style={navStyle}
              >
                {menuLinks}
              </nav>
              <div className="flex items-center gap-2 ml-auto md:ml-0">
                {settings.showSearch && (
                  <SearchField
                    q={q}
                    setQ={setQ}
                    onSearch={onSearch}
                    className="hidden lg:flex w-48 xl:w-56"
                  />
                )}
                {iconsRow}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 sm:gap-4" style={rowHeight}>
            {settings.logoPosition === 'center' ? (
              <div className="flex-1 flex justify-center min-w-0">
                <LogoBlock
                tenant={tenant}
                home={home}
                logoWidthPx={settings.logoWidthPx}
                logoMaxHeightPx={settings.logoMaxHeightPx}
                preview={preview}
              />
              </div>
            ) : (
              <LogoBlock
                tenant={tenant}
                home={home}
                logoWidthPx={settings.logoWidthPx}
                logoMaxHeightPx={settings.logoMaxHeightPx}
                preview={preview}
              />
            )}

            {!isMinimal && settings.menuPosition === 'center' && (
              <nav className="hidden md:flex flex-1 items-center justify-center gap-3 sm:gap-4 min-w-0" style={navStyle}>
                {menuLinks}
              </nav>
            )}

            {desktopSearch}

            {!isMinimal && settings.menuPosition !== 'center' && (
              <nav
                className={`hidden md:flex flex-1 items-center gap-3 sm:gap-4 ${menuJustify}`}
                style={navStyle}
              >
                {menuLinks}
              </nav>
            )}

            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              {settings.showSearch && isMinimal && (
                <SearchField q={q} setQ={setQ} onSearch={onSearch} className="hidden sm:flex w-40" />
              )}
              {mobileSearchCompact}
              {iconsRow}
            </div>
          </div>
        )}

        {mobileSearchStacked}
      </div>
    </header>
  );
}

export function StorefrontHeader({ tenant, storeLink, settings, preview = false }: Props) {
  const merged = mergeHeaderSettings(settings);

  if (!merged.enabled && !preview) {
    return <LegacyStorefrontHeader tenant={tenant} storeLink={storeLink} logoSettings={merged} />;
  }

  return (
    <ConfiguredStorefrontHeader
      tenant={tenant}
      storeLink={storeLink}
      settings={merged}
      preview={preview}
    />
  );
}
