import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useStorefrontTenant } from '../../hooks/useStorefrontTenant';
import { fetchStorefrontProducts, normalizeStoreImageUrl } from '../../services/storefrontApi';
import { ProductCard } from '../ProductCard';
import { CategoryCard } from '../CategoryCard';
import type { StorefrontProductSummary } from '../../types/storefront.types';
import type { StorefrontSection } from '../../../types/storefrontBuilder.types';
import HeroBlockView from '../../../components/storefront-builder/HeroBlockView';
import {
  buildBannerImageLayerProps,
  bannerHeightClass,
  featuredGridColumnsClass,
  gridColumnsClass,
  layoutBool,
  layoutNum,
  layoutStr,
  mapProductCardVariant,
  objectFitClass,
  parseTrustBadges,
  resolveStorePath,
  sectionWidthClass,
} from './layoutRendererHelpers';

type SectionProps = {
  section: StorefrontSection;
  primaryColor: string | null;
  storeLink: (path: string) => string;
};

export function HeroSection({ section, primaryColor, storeLink }: SectionProps) {
  const s = section.settings;
  const imageUrl = normalizeStoreImageUrl(layoutStr(s, 'imageUrl'));

  return (
    <section>
      <HeroBlockView
        settings={s}
        imageUrl={imageUrl}
        themePrimary={primaryColor}
        resolveHref={path => resolveStorePath(path, storeLink)}
      />
    </section>
  );
}

export function CategoryGridSection({ section, storeLink }: SectionProps) {
  const { categories } = useStorefrontTenant();
  const s = section.settings;
  const title = layoutStr(s, 'title', 'Kategoriler');
  const limit = layoutNum(s, 'limit', 6);
  const showImages = layoutBool(s, 'showImages', true);
  const showTitle = layoutBool(s, 'showTitle', true);
  const columns = layoutNum(s, 'columns', 4);
  const displayMode = layoutStr(s, 'displayMode', 'grid');
  const widthMode = layoutStr(s, 'widthMode', 'container');
  const viewAllLabel = layoutStr(s, 'viewAllLabel', 'Tüm kategorileri göster');

  const items = useMemo(
    () => categories.filter(c => c.parentId == null).slice(0, limit),
    [categories, limit],
  );

  return (
    <section className={`${sectionWidthClass(widthMode)} py-12`}>
      {(showTitle || viewAllLabel) && (
        <div className="flex items-center justify-between mb-4 gap-3">
          {showTitle && <h2 className="text-xl font-semibold text-slate-900">{title}</h2>}
          {viewAllLabel && (
            <Link to={storeLink('/store/urunler')} className="text-sm font-medium text-indigo-600 hover:underline whitespace-nowrap ml-auto">
              {viewAllLabel}
            </Link>
          )}
        </div>
      )}
      {items.length === 0 ? (
        <p className="text-slate-500 text-sm">Henüz kategori yok.</p>
      ) : displayMode === 'list' ? (
        <ul className="flex gap-3 overflow-x-auto pb-2 snap-x">
          {items.map(c => (
            <li key={c.id} className="min-w-[140px] max-w-[160px] snap-start flex-shrink-0">
              <CategoryCard
                category={showImages ? c : { ...c, imageUrl: null }}
                url={storeLink(`/store/kategori/${encodeURIComponent(c.slug)}`)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className={`grid ${gridColumnsClass(columns)} gap-3`}>
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
  const columns = layoutNum(s, 'columns', 4);
  const source = layoutStr(s, 'source', 'featured');
  const cardStyle = layoutStr(s, 'cardStyle', 'standard');
  const widthMode = layoutStr(s, 'widthMode', 'container');
  const showPrice = layoutBool(s, 'showPrice', true);
  const showAddToCart = layoutBool(s, 'showAddToCart', true);
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

  const cardVariant = mapProductCardVariant(cardStyle);

  return (
    <section className={`${sectionWidthClass(widthMode)} pb-16`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <Link to={storeLink('/store/urunler')} className="text-sm font-medium text-indigo-600 hover:underline">
          Tümünü gör
        </Link>
      </div>
      {loading ? (
        <div className={`grid ${featuredGridColumnsClass(columns)} gap-4`}>
          {Array.from({ length: Math.min(columns, 4) }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white border border-slate-200 h-52 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="text-slate-500 text-sm">Gösterilecek ürün yok.</p>
      ) : (
        <div className={`grid ${featuredGridColumnsClass(columns)} gap-4`}>
          {products.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              productUrl={storeLink(`/store/urun/${encodeURIComponent(p.slug)}`)}
              variant={cardVariant}
              hidePrice={!showPrice}
              hideAddToCart={!showAddToCart}
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
  const backgroundColor = layoutStr(s, 'backgroundColor', '#fffbeb');
  const textColor = layoutStr(s, 'textColor', '#78350f');
  const widthMode = layoutStr(s, 'widthMode', 'container');
  const heightMode = layoutStr(s, 'heightMode', 'medium');
  const textPosition = layoutStr(s, 'textPosition', 'left');
  const bannerImage = buildBannerImageLayerProps(s, imageUrl);

  const textAlignCls =
    textPosition === 'center' ? 'mx-auto text-center items-center' : textPosition === 'right' ? 'ml-auto text-right items-end' : 'text-left items-start';

  return (
    <section className={`${sectionWidthClass(widthMode)} py-10`}>
      <div
        className={`relative overflow-hidden rounded-2xl border px-6 py-8 sm:px-10 sm:py-10 flex flex-col justify-center ${bannerHeightClass(heightMode)}`}
        style={{
          backgroundColor,
          color: textColor,
          borderColor: primaryColor ? `${primaryColor}33` : undefined,
        }}
      >
        {bannerImage.imageLayerStyle && (
          <div className="absolute inset-0" style={bannerImage.imageLayerStyle} aria-hidden />
        )}
        {bannerImage.showOverlay && bannerImage.overlayStyle && (
          <div className="absolute inset-0" style={bannerImage.overlayStyle} aria-hidden />
        )}
        <div className={`relative max-w-lg flex flex-col ${textAlignCls}`}>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Kampanya</p>
          <h2 className="mt-1 text-2xl font-bold">{title}</h2>
          {subtitle && <p className="mt-2 text-sm opacity-80">{subtitle}</p>}
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
  const badges = parseTrustBadges(layoutStr(s, 'badges'));

  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-xl font-semibold text-slate-900 mb-4 text-center">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(badges.length ? badges : [{ title: 'Güvenli alışveriş', description: '' }]).map((b, i) => (
          <div
            key={`${b.title}-${i}`}
            className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center"
          >
            <p className="text-sm font-semibold text-emerald-900">{b.title}</p>
            {b.description && (
              <p className="text-xs text-emerald-800/80 mt-1">{b.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function TextImageSection({ section, storeLink }: SectionProps) {
  const s = section.settings;
  const title = layoutStr(s, 'title');
  const text = layoutStr(s, 'text');
  const imageUrl = normalizeStoreImageUrl(layoutStr(s, 'imageUrl'));
  const imageRight = layoutStr(s, 'imagePosition', 'left') === 'right';
  const imageFit = layoutStr(s, 'imageFit', 'cover');
  const buttonText = layoutStr(s, 'buttonText');
  const buttonUrl = resolveStorePath(layoutStr(s, 'buttonUrl', '/store/urunler'), storeLink);

  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <div className={`flex flex-col gap-6 sm:gap-8 ${imageRight ? 'sm:flex-row-reverse' : 'sm:flex-row'} sm:items-center`}>
        <div className="sm:w-2/5 flex-shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className={`w-full rounded-2xl aspect-[4/3] bg-slate-100 ${objectFitClass(imageFit)}`}
            />
          ) : (
            <div className="w-full rounded-2xl aspect-[4/3] bg-slate-100" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {title && <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>}
          {text && <p className="mt-3 text-slate-600 text-sm sm:text-base whitespace-pre-wrap">{text}</p>}
          {buttonText && (
            <Link
              to={buttonUrl}
              className="inline-flex mt-5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              {buttonText}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
