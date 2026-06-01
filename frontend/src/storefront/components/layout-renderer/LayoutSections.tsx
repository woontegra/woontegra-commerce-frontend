import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useStorefrontTenant } from '../../hooks/useStorefrontTenant';
import { fetchStorefrontProducts, normalizeStoreImageUrl } from '../../services/storefrontApi';
import { ProductCard } from '../ProductCard';
import { CategoryCard } from '../CategoryCard';
import type { StorefrontProductSummary } from '../../types/storefront.types';
import type { StorefrontSection } from '../../../types/storefrontBuilder.types';
import {
  layoutBool,
  layoutNum,
  layoutStr,
  parseBadgeLines,
  resolveStorePath,
} from './layoutRendererHelpers';

type SectionProps = {
  section: StorefrontSection;
  primaryColor: string | null;
  storeLink: (path: string) => string;
};

export function HeroSection({ section, primaryColor, storeLink }: SectionProps) {
  const s = section.settings;
  const title = layoutStr(s, 'title', 'Hoş geldiniz');
  const subtitle = layoutStr(s, 'subtitle');
  const buttonText = layoutStr(s, 'buttonText');
  const buttonUrl = resolveStorePath(layoutStr(s, 'buttonUrl', '/store/urunler'), storeLink);
  const imageUrl = normalizeStoreImageUrl(layoutStr(s, 'imageUrl'));
  const alignment = layoutStr(s, 'alignment', 'center');
  const alignCls =
    alignment === 'left'
      ? 'text-left items-start'
      : alignment === 'right'
        ? 'text-right items-end'
        : 'text-center items-center';

  const gradientStyle = primaryColor
    ? { background: `linear-gradient(135deg, ${primaryColor}, #4f46e5)` }
    : undefined;

  return (
    <section
      className="text-white relative overflow-hidden"
      style={gradientStyle}
    >
      {!gradientStyle && (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700" aria-hidden />
      )}
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
      )}
      <div className={`relative max-w-6xl mx-auto px-4 py-16 sm:py-20 flex flex-col ${alignCls}`}>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-3 text-indigo-100 max-w-xl text-sm sm:text-base">{subtitle}</p>
        )}
        {buttonText && (
          <Link
            to={buttonUrl}
            className="inline-flex mt-8 px-5 py-2.5 rounded-xl bg-white text-indigo-700 text-sm font-semibold shadow hover:bg-indigo-50"
          >
            {buttonText}
          </Link>
        )}
      </div>
    </section>
  );
}

export function CategoryGridSection({ section, storeLink }: SectionProps) {
  const { categories } = useStorefrontTenant();
  const s = section.settings;
  const title = layoutStr(s, 'title', 'Kategoriler');
  const limit = layoutNum(s, 'limit', 6);
  const showImages = layoutBool(s, 'showImages', true);

  const items = useMemo(
    () => categories.filter(c => c.parentId == null).slice(0, limit),
    [categories, limit],
  );

  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">{title}</h2>
      {items.length === 0 ? (
        <p className="text-slate-500 text-sm">Henüz kategori yok.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map(c => (
            <li key={c.id}>
              <CategoryCard
                category={showImages ? c : { ...c, imageUrl: null }}
                url={storeLink(`/store/kategori/${encodeURIComponent(c.slug)}`)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function FeaturedProductsSection({ section, storeLink }: SectionProps) {
  const { tenant } = useStorefrontTenant();
  const s = section.settings;
  const title = layoutStr(s, 'title', 'Öne Çıkan Ürünler');
  const limit = layoutNum(s, 'limit', 8);
  const source = layoutStr(s, 'source', 'featured');
  const [products, setProducts] = useState<StorefrontProductSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant?.slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await fetchStorefrontProducts(tenant.slug, {
          limit,
          page: source === 'latest' ? 1 : 1,
        });
        if (!cancelled) setProducts(result.items.slice(0, limit));
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant?.slug, limit, source]);

  return (
    <section className="max-w-6xl mx-auto px-4 pb-16">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <Link to={storeLink('/store/urunler')} className="text-sm font-medium text-indigo-600 hover:underline">
          Tümünü gör
        </Link>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl bg-white border border-slate-200 h-52 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="text-slate-500 text-sm">Gösterilecek ürün yok.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              productUrl={storeLink(`/store/urun/${encodeURIComponent(p.slug)}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function CampaignBannerSection({ section, primaryColor, storeLink }: SectionProps) {
  const s = section.settings;
  const title = layoutStr(s, 'title', 'Kampanya');
  const subtitle = layoutStr(s, 'subtitle');
  const buttonText = layoutStr(s, 'buttonText');
  const buttonUrl = resolveStorePath(layoutStr(s, 'buttonUrl', '/store/urunler'), storeLink);
  const imageUrl = normalizeStoreImageUrl(layoutStr(s, 'imageUrl'));

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-8 sm:px-10 sm:py-10"
        style={primaryColor ? { borderColor: `${primaryColor}33` } : undefined}
      >
        {imageUrl && (
          <img src={imageUrl} alt="" className="absolute right-0 top-0 h-full w-1/3 object-cover opacity-20 hidden sm:block" />
        )}
        <div className="relative max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Kampanya</p>
          <h2 className="mt-1 text-2xl font-bold text-amber-950">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-amber-900/80">{subtitle}</p>}
          {buttonText && (
            <Link
              to={buttonUrl}
              className="inline-flex mt-5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90"
              style={{ backgroundColor: primaryColor ?? '#d97706' }}
            >
              {buttonText}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export function TrustBadgesSection({ section }: SectionProps) {
  const s = section.settings;
  const title = layoutStr(s, 'title', 'Neden bizi tercih etmelisiniz?');
  const badges = parseBadgeLines(layoutStr(s, 'badges'));

  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-xl font-semibold text-slate-900 mb-4 text-center">{title}</h2>
      <div className="flex flex-wrap justify-center gap-3">
        {(badges.length ? badges : ['Güvenli alışveriş']).map(b => (
          <span
            key={b}
            className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-50 text-emerald-800 text-sm font-medium border border-emerald-100"
          >
            {b}
          </span>
        ))}
      </div>
    </section>
  );
}

export function TextImageSection({ section }: SectionProps) {
  const s = section.settings;
  const title = layoutStr(s, 'title');
  const text = layoutStr(s, 'text');
  const imageUrl = normalizeStoreImageUrl(layoutStr(s, 'imageUrl'));
  const imageRight = layoutStr(s, 'imagePosition', 'left') === 'right';

  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <div className={`flex flex-col gap-6 sm:gap-8 ${imageRight ? 'sm:flex-row-reverse' : 'sm:flex-row'} sm:items-center`}>
        <div className="sm:w-2/5 flex-shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full rounded-2xl object-cover aspect-[4/3] bg-slate-100" />
          ) : (
            <div className="w-full rounded-2xl aspect-[4/3] bg-slate-100" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {title && <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>}
          {text && <p className="mt-3 text-slate-600 text-sm sm:text-base whitespace-pre-wrap">{text}</p>}
        </div>
      </div>
    </section>
  );
}
