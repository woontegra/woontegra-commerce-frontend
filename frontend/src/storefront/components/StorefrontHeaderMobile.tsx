import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import {
  useStorefrontTenantOptional,
  type StorefrontTenantInfo,
} from '../../contexts/StorefrontTenantContext';
import { displayStorefrontName } from '../../utils/displayStoreName';
import { useStorefrontCartOptional } from '../hooks/StorefrontCartProvider';
import { useStorefrontAuthOptional } from '../hooks/StorefrontAuthProvider';
import { headerLogoImageStyle } from '../../utils/headerSettingsHelpers';
import { useStoreLogo } from '../hooks/useStoreLogo';

export type StorefrontHeaderMobileOptions = {
  showSearch?: boolean;
  showCart?: boolean;
  showAccount?: boolean;
  showFavorites?: boolean;
  activeColor?: string;
  logoWidthPx?: number;
  logoMaxHeightPx?: number;
};

type Props = {
  tenant: StorefrontTenantInfo;
  storeLink: (path: string) => string;
  preview?: boolean;
  options?: StorefrontHeaderMobileOptions;
  className?: string;
  style?: React.CSSProperties;
};

export function StorefrontHeaderMobile({
  tenant,
  storeLink,
  preview = false,
  options = {},
  className = '',
  style,
}: Props) {
  const tenantCtx = useStorefrontTenantOptional();
  const cart = useStorefrontCartOptional();
  const auth = useStorefrontAuthOptional();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [q, setQ] = useState('');

  const {
    showSearch = true,
    showCart = true,
    showAccount = true,
    showFavorites = false,
    activeColor,
    logoWidthPx = 120,
    logoMaxHeightPx = 32,
  } = options;

  const home = storeLink('/store');
  const products = storeLink('/store/urunler');
  const cartUrl = storeLink('/store/sepet');
  const account = storeLink('/store/hesabim');
  const login = storeLink('/store/giris');
  const favorites = storeLink('/store/favoriler');

  const categories = tenantCtx?.categories ?? [];
  const topCategories = categories
    .filter(c => !c.parentId)
    .sort((a, b) => a.order - b.order)
    .slice(0, 12);

  const itemCount = preview ? 2 : (cart?.itemCount ?? 0);
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const authLoading = auth?.loading ?? false;

  const displayName = displayStorefrontName(tenant.name);
  const { logoSrc, onLogoError } = useStoreLogo(tenant.logoUrl);
  const logoStyle = headerLogoImageStyle({ logoWidthPx, logoMaxHeightPx });
  const badgeStyle = activeColor ? { backgroundColor: activeColor } : undefined;

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  const closeDrawer = () => setDrawerOpen(false);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (preview) return;
    const term = q.trim();
    if (!term) return;
    closeDrawer();
    navigate(storeLink(`/store/urunler?search=${encodeURIComponent(term)}`));
  };

  const drawerNavLink = ({
    to,
    end,
    children,
    linkKey,
  }: {
    to: string;
    end?: boolean;
    children: React.ReactNode;
    linkKey?: string;
  }) => {
    const key = linkKey ?? to;
    if (preview) {
      return (
        <span key={key} className="store-header-drawer-link" onClick={closeDrawer}>
          {children}
        </span>
      );
    }
    return (
      <NavLink
        key={key}
        to={to}
        end={end}
        className={({ isActive }) => `store-header-drawer-link${isActive ? ' is-active' : ''}`}
        onClick={closeDrawer}
      >
        {children}
      </NavLink>
    );
  };

  return (
    <>
      <div className={`store-header-mobile lg:hidden ${className}`.trim()} style={style}>
        <div className="store-header-mobile-top">
          <button
            type="button"
            className="store-header-mobile-icon-btn"
            aria-label="Menüyü aç"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="w-5 h-5" strokeWidth={1.75} />
          </button>

          <div className="store-header-mobile-logo">
            {preview ? (
              <div className="store-header-mobile-logo-inner">
                {logoSrc ? (
                  <img src={logoSrc} alt={displayName} style={logoStyle} onError={onLogoError} />
                ) : (
                  <span className="store-header-mobile-logo-text">{displayName}</span>
                )}
              </div>
            ) : (
              <Link to={home} className="store-header-mobile-logo-inner" onClick={closeDrawer}>
                {logoSrc ? (
                  <img src={logoSrc} alt={displayName} style={logoStyle} onError={onLogoError} />
                ) : (
                  <span className="store-header-mobile-logo-text">{displayName}</span>
                )}
              </Link>
            )}
          </div>

          <div className="store-header-mobile-actions">
            {showAccount &&
              (preview ? (
                <span className="store-header-mobile-icon-btn" aria-hidden>
                  <User className="w-5 h-5" strokeWidth={1.75} />
                </span>
              ) : (
                <Link
                  to={isAuthenticated ? account : login}
                  className="store-header-mobile-icon-btn"
                  aria-label={isAuthenticated ? 'Hesabım' : 'Giriş'}
                >
                  <User className="w-5 h-5" strokeWidth={1.75} />
                </Link>
              ))}
            {showCart &&
              (preview ? (
                <span className="store-header-mobile-icon-btn">
                  <ShoppingCart className="w-5 h-5" strokeWidth={1.75} />
                  {itemCount > 0 && (
                    <span className="store-header-cart-badge" style={badgeStyle}>
                      {itemCount}
                    </span>
                  )}
                </span>
              ) : (
                <Link
                  to={cartUrl}
                  className="store-header-mobile-icon-btn"
                  aria-label="Sepet"
                >
                  <ShoppingCart className="w-5 h-5" strokeWidth={1.75} />
                  {itemCount > 0 && (
                    <span className="store-header-cart-badge" style={badgeStyle}>
                      {itemCount}
                    </span>
                  )}
                </Link>
              ))}
          </div>
        </div>

        {showSearch && (
          <form onSubmit={onSearch} className="store-header-mobile-search">
            <div className="store-header-search store-header-mobile-search-field">
              <Search className="store-header-mobile-search-icon" strokeWidth={1.75} />
              <input
                type="search"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Ürün ara…"
                aria-label="Ürün ara"
              />
            </div>
          </form>
        )}
      </div>

      {drawerOpen &&
        createPortal(
          <div className="store-header-drawer-root lg:hidden" role="presentation">
            <button
              type="button"
              className="store-header-drawer-backdrop"
              aria-label="Menüyü kapat"
              onClick={closeDrawer}
            />
            <aside
              className="store-header-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Mağaza menüsü"
            >
              <div className="store-header-drawer-head">
                <div className="store-header-drawer-brand min-w-0">
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt={displayName}
                      className="store-header-drawer-logo"
                      style={logoStyle}
                      onError={onLogoError}
                    />
                  ) : (
                    <span className="store-header-drawer-title">{displayName}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="store-header-mobile-icon-btn"
                  aria-label="Menüyü kapat"
                  onClick={closeDrawer}
                >
                  <X className="w-5 h-5" strokeWidth={1.75} />
                </button>
              </div>

              <nav className="store-header-drawer-nav">
                {drawerNavLink({ to: home, end: true, children: 'Ana sayfa' })}
                {drawerNavLink({ to: products, children: 'Ürünler' })}

                {topCategories.length > 0 && (
                  <div className="store-header-drawer-section">
                    <p className="store-header-drawer-section-label">Kategoriler</p>
                    {topCategories.map(cat =>
                      drawerNavLink({
                        linkKey: cat.id || cat.slug,
                        to: storeLink(`/store/kategori/${encodeURIComponent(cat.slug)}`),
                        children: cat.name,
                      }),
                    )}
                  </div>
                )}

                <div className="store-header-drawer-section">
                  <p className="store-header-drawer-section-label">Hesap</p>
                  {showFavorites && drawerNavLink({ to: favorites, children: 'Favoriler' })}
                  {showCart && drawerNavLink({ to: cartUrl, children: 'Sepet' })}
                  {showAccount &&
                    !authLoading &&
                    (isAuthenticated
                      ? drawerNavLink({ to: account, children: 'Hesabım' })
                      : drawerNavLink({ to: login, children: 'Giriş yap' }))}
                </div>
              </nav>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
