import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useState } from 'react';
import type { StorefrontTenantInfo } from '../../contexts/StorefrontTenantContext';
import { useStorefrontCart } from '../hooks/StorefrontCartProvider';
import { useStorefrontAuth } from '../hooks/StorefrontAuthProvider';

type Props = {
  tenant: StorefrontTenantInfo;
  storeLink: (path: string) => string;
};

export function StorefrontHeader({ tenant, storeLink }: Props) {
  const { itemCount } = useStorefrontCart();
  const { isAuthenticated, logout, loading: authLoading } = useStorefrontAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const home     = storeLink('/store');
  const products = storeLink('/store/urunler');
  const cart     = storeLink('/store/sepet');
  const account  = storeLink('/store/hesabim');
  const login    = storeLink('/store/giris');

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate(storeLink(`/store/urunler?search=${encodeURIComponent(term)}`));
  };

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-16 flex items-center justify-between gap-4">
          <Link to={home} className="flex items-center gap-2 font-semibold text-lg truncate shrink-0">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
            ) : (
              <span className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm">
                {tenant.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="truncate max-w-[10rem] sm:max-w-none">{tenant.name}</span>
          </Link>

          <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Ürün ara…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
          </form>

          <nav className="flex items-center gap-2 sm:gap-4 text-sm font-medium text-slate-600 shrink-0">
            <NavLink to={home} className={({ isActive }) => (isActive ? 'text-indigo-600' : 'hover:text-indigo-600')} end>
              Ana sayfa
            </NavLink>
            <NavLink to={products} className={({ isActive }) => (isActive ? 'text-indigo-600' : 'hover:text-indigo-600')}>
              Ürünler
            </NavLink>
            {!authLoading && isAuthenticated ? (
              <>
                <Link to={account} className="hidden sm:inline hover:text-indigo-600">
                  Hesabım
                </Link>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="hidden sm:inline hover:text-indigo-600"
                >
                  Çıkış
                </button>
              </>
            ) : (
              <>
                <Link to={account} className="hidden sm:inline hover:text-indigo-600">
                  Hesabım
                </Link>
                <Link to={login} className="hidden sm:inline hover:text-indigo-600">
                  Giriş
                </Link>
              </>
            )}
            <Link
              to={cart}
              className="relative px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              Sepet
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
        <form onSubmit={onSearch} className="md:hidden pb-3">
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Ürün ara…"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
          />
        </form>
      </div>
    </header>
  );
}
