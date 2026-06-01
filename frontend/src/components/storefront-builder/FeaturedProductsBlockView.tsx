import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../../storefront/components/ProductCard';
import type { StorefrontProductSummary } from '../../storefront/types/storefront.types';
import {
  featuredEmptyMessage,
  mapProductCardVariant,
  productGridResponsiveClass,
  resolveFeaturedSourceType,
  resolveShowViewAll,
} from '../../utils/featuredProductsBlockHelpers';
import type { FeaturedProductsEmptyReason } from '../../utils/featuredProductsBlockHelpers';
import { mapThemeProductCardVariant, resolveBlockProductCardStyle, type ThemeSettings } from '../../utils/themeSettingsHelpers';
import { effectivePrice, formatTry } from '../../storefront/utils/format';

type FeaturedProductsBlockViewProps = {
  settings: Record<string, unknown>;
  products: StorefrontProductSummary[];
  loading?: boolean;
  emptyReason?: FeaturedProductsEmptyReason;
  storeLink: (path: string) => string;
  viewAllHref: string;
  preview?: boolean;
  themeSettings?: ThemeSettings | null;
};

function str(settings: Record<string, unknown>, key: string, fallback = ''): string {
  return String(settings[key] ?? fallback);
}

function num(settings: Record<string, unknown>, key: string, fallback: number): number {
  const v = settings[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(settings: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = settings[key];
  return v === undefined ? fallback : Boolean(v);
}

function ProductListRow({
  product,
  productUrl,
  showPrice,
  showAddToCart,
  preview,
}: {
  product: StorefrontProductSummary;
  productUrl: string;
  showPrice: boolean;
  showAddToCart: boolean;
  preview?: boolean;
}) {
  const sale = effectivePrice(product.price, product.discountPrice);
  const body = (
    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-shadow">
      <div className="w-full sm:w-28 h-28 flex-shrink-0 rounded-lg bg-slate-100 overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Görsel yok</div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className="font-semibold text-slate-900 truncate">{product.name}</h3>
        {showPrice && (
          <p className="mt-1 text-sm font-medium text-indigo-600">{formatTry(sale)}</p>
        )}
        {showAddToCart && (
          <span className="mt-2 inline-flex w-fit px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium">
            Sepete Ekle
          </span>
        )}
      </div>
    </div>
  );
  if (preview) return body;
  return <Link to={productUrl}>{body}</Link>;
}

function ProductCarousel({
  products,
  productUrl,
  cardVariant,
  showPrice,
  showAddToCart,
  preview,
}: {
  products: StorefrontProductSummary[];
  productUrl: (slug: string) => string;
  cardVariant: 'card' | 'plain';
  showPrice: boolean;
  showAddToCart: boolean;
  preview?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center text-slate-600 hover:bg-slate-50 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        aria-label="Önceki"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-1 px-1 touch-pan-x"
      >
        {products.map(p => (
          <div key={p.id} className="snap-start flex-shrink-0 w-[220px] sm:w-[240px]">
            <ProductCard
              product={p}
              productUrl={preview ? '#' : productUrl(p.slug)}
              variant={cardVariant}
              hidePrice={!showPrice}
              hideAddToCart={!showAddToCart || preview}
              preview={preview}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center text-slate-600 hover:bg-slate-50 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        aria-label="Sonraki"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function FeaturedProductsBlockView({
  settings,
  products,
  loading = false,
  emptyReason = 'none',
  storeLink,
  viewAllHref,
  preview = false,
  themeSettings = null,
}: FeaturedProductsBlockViewProps) {
  const title = str(settings, 'title', 'Ürün Vitrini');
  const showTitle = bool(settings, 'showTitle', true);
  const showViewAll = resolveShowViewAll(settings);
  const viewAllLabel = str(settings, 'viewAllLabel', 'Tümünü gör');
  const displayMode = str(settings, 'displayMode', 'grid');
  const blockCardStyle = str(settings, 'cardStyle', 'standard');
  const showPrice = bool(settings, 'showPrice', true);
  const showAddToCart = bool(settings, 'showAddToCart', true);
  const colsDesktop = num(settings, 'columnsDesktop', num(settings, 'columns', 4));
  const colsTablet = num(settings, 'columnsTablet', 2);
  const colsMobile = num(settings, 'columnsMobile', 2);
  const sourceType = resolveFeaturedSourceType(settings);
  const resolvedCardStyle = themeSettings
    ? resolveBlockProductCardStyle(settings, themeSettings)
    : blockCardStyle;
  const cardVariant = themeSettings
    ? mapThemeProductCardVariant(resolvedCardStyle)
    : mapProductCardVariant(blockCardStyle);

  const productUrl = (slug: string) => storeLink(`/store/urun/${encodeURIComponent(slug)}`);

  return (
    <>
      {(showTitle || showViewAll) && (
        <div className="flex items-center justify-between mb-4 gap-3">
          {showTitle && <h2 className="text-xl font-semibold text-slate-900">{title}</h2>}
          {showViewAll && (
            preview ? (
              <span className="text-sm font-medium store-link-primary">{viewAllLabel}</span>
            ) : (
              <Link to={viewAllHref} className="text-sm font-medium store-link-primary hover:underline whitespace-nowrap">
                {viewAllLabel}
              </Link>
            )
          )}
        </div>
      )}

      {loading ? (
        <div className={`${productGridResponsiveClass(colsMobile, colsTablet, colsDesktop)}`}>
          {Array.from({ length: Math.min(colsDesktop, 4) }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white border border-slate-200 h-52 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="text-slate-500 text-sm rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
          {featuredEmptyMessage(emptyReason, sourceType)}
        </p>
      ) : displayMode === 'list' ? (
        <div className="space-y-3">
          {products.map(p => (
            <ProductListRow
              key={p.id}
              product={p}
              productUrl={productUrl(p.slug)}
              showPrice={showPrice}
              showAddToCart={showAddToCart}
              preview={preview}
            />
          ))}
        </div>
      ) : displayMode === 'carousel' ? (
        <ProductCarousel
          products={products}
          productUrl={productUrl}
          cardVariant={cardVariant}
          showPrice={showPrice}
          showAddToCart={showAddToCart}
          preview={preview}
        />
      ) : (
        <div className={productGridResponsiveClass(colsMobile, colsTablet, colsDesktop)}>
          {products.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              productUrl={preview ? '#' : productUrl(p.slug)}
              variant={cardVariant}
              hidePrice={!showPrice}
              hideAddToCart={!showAddToCart || preview}
              preview={preview}
            />
          ))}
        </div>
      )}
    </>
  );
}
