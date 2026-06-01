import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../../storefront/components/ProductCard';
import type { StorefrontProductSummary } from '../../storefront/types/storefront.types';
import {
  featuredEmptyMessage,
  mapProductCardVariant,
  productGridResponsiveClass,
  resolveFeaturedSourceType,
} from '../../utils/featuredProductsBlockHelpers';
import type { FeaturedProductsEmptyReason } from '../../utils/featuredProductsBlockHelpers';
import { mapThemeProductCardVariant, resolveBlockProductCardStyle, type ThemeSettings } from '../../utils/themeSettingsHelpers';
import { effectivePrice, formatTry } from '../../storefront/utils/format';
import FeaturedProductsSectionHeader from './FeaturedProductsSectionHeader';

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
    <div className="store-product-list-row flex flex-col sm:flex-row gap-4 p-4 sm:p-5">
      <div className="w-full sm:w-28 h-28 flex-shrink-0 rounded-xl store-product-card-image overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs store-text-muted">Görsel yok</div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <h3 className="font-medium store-text-body truncate">{product.name}</h3>
        {showPrice && (
          <p className="text-sm font-semibold store-text-primary tracking-tight">{formatTry(sale)}</p>
        )}
        {showAddToCart && (
          <span className="mt-2 inline-flex w-fit px-4 py-1.5 store-btn-primary text-xs">
            Sepete ekle
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
  const [activePage, setActivePage] = useState(0);

  const updateActivePage = useCallback(() => {
    const el = ref.current;
    if (!el || products.length === 0) return;
    const first = el.querySelector<HTMLElement>('.store-product-carousel-item');
    if (!first) return;
    const itemWidth = first.offsetWidth + 16;
    if (itemWidth <= 0) return;
    const page = Math.round(el.scrollLeft / itemWidth);
    setActivePage(Math.min(Math.max(0, page), products.length - 1));
  }, [products.length]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', updateActivePage, { passive: true });
    return () => el.removeEventListener('scroll', updateActivePage);
  }, [updateActivePage]);

  const scroll = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>('.store-product-carousel-item');
    const step = first ? first.offsetWidth + 16 : 280;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const scrollToIndex = (index: number) => {
    const el = ref.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>('.store-product-carousel-item');
    const step = first ? first.offsetWidth + 16 : 280;
    el.scrollTo({ left: index * step, behavior: 'smooth' });
  };

  return (
    <div className="store-product-carousel">
      <button
        type="button"
        onClick={() => scroll(-1)}
        className="store-carousel-btn store-product-carousel-nav store-product-carousel-nav--prev flex items-center justify-center"
        aria-label="Önceki ürünler"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div ref={ref} className="store-product-carousel-track">
        {products.map(p => (
          <div key={p.id} className="store-product-carousel-item">
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
        className="store-carousel-btn store-product-carousel-nav store-product-carousel-nav--next flex items-center justify-center"
        aria-label="Sonraki ürünler"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      {products.length > 1 && (
        <div className="store-product-carousel-dots" role="tablist" aria-label="Ürün sayfaları">
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === activePage}
              aria-label={`Ürün ${i + 1}`}
              className={`store-product-carousel-dot${i === activePage ? ' is-active' : ''}`}
              onClick={() => scrollToIndex(i)}
            />
          ))}
        </div>
      )}
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
      <FeaturedProductsSectionHeader settings={settings} viewAllHref={viewAllHref} preview={preview} />

      {loading ? (
        <div className={`${productGridResponsiveClass(colsMobile, colsTablet, colsDesktop)} store-products-grid`}>
          {Array.from({ length: Math.min(colsDesktop, 4) }).map((_, i) => (
            <div key={i} className="store-skeleton-card h-52 sm:h-56 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="store-empty-state text-sm px-4 py-10 text-center">
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
        <div className={`${productGridResponsiveClass(colsMobile, colsTablet, colsDesktop)} store-products-grid`}>
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
