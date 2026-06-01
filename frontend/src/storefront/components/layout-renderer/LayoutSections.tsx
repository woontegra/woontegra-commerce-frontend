import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  Headphones,
  RotateCcw,
  Shield,
  Sparkles,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { useStorefrontGlobalTheme } from '../../hooks/StorefrontGlobalThemeProvider';
import { useStorefrontTenant } from '../../hooks/useStorefrontTenant';
import { normalizeStoreImageUrl } from '../../services/storefrontApi';
import { CategoryCard } from '../CategoryCard';
import type { StorefrontProductSummary } from '../../types/storefront.types';
import type { StorefrontSection } from '../../../types/storefrontBuilder.types';
import HeroBlockView from '../../../components/storefront-builder/HeroBlockView';
import { shouldRenderHeroSection } from '../../../utils/heroSliderHelpers';
import FeaturedProductsBlockView from '../../../components/storefront-builder/FeaturedProductsBlockView';
import {
  featuredViewAllHref,
  loadFeaturedBlockProducts,
  type FeaturedProductsEmptyReason,
} from '../../../utils/featuredProductsBlockHelpers';
import {
  buildBannerImageLayerProps,
  bannerHeightClass,
  gridColumnsClass,
  layoutBool,
  layoutNum,
  layoutStr,
  objectFitClass,
  parseTrustBadges,
  resolveStorePath,
  sectionWidthClass,
  productsSectionWidthClass,
} from './layoutRendererHelpers';

type SectionProps = {
  section: StorefrontSection;
  primaryColor: string | null;
  storeLink: (path: string) => string;
};

const DEFAULT_TRUST_BADGES = [
  { title: 'Güvenli ödeme', description: '256-bit SSL ile korunan ödeme altyapısı' },
  { title: 'Hızlı kargo', description: '1–3 iş günü içinde kapınızda' },
  { title: 'Kolay iade', description: '14 gün içinde koşulsuz iade' },
  { title: 'Müşteri desteği', description: '7/24 yardım ve danışmanlık' },
];

function trustIconForTitle(title: string): LucideIcon {
  const t = title.toLowerCase();
  if (t.includes('güven') || t.includes('ssl') || t.includes('ödeme')) return Shield;
  if (t.includes('kargo') || t.includes('teslim') || t.includes('hızlı')) return Truck;
  if (t.includes('iade') || t.includes('değişim')) return RotateCcw;
  if (t.includes('destek') || t.includes('müşteri') || t.includes('yardım')) return Headphones;
  if (t.includes('kart') || t.includes('taksit')) return CreditCard;
  return Sparkles;
}

function SectionHeader({
  eyebrow,
  title,
  description,
  viewAllLabel,
  viewAllHref,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  viewAllLabel?: string;
  viewAllHref?: string;
}) {
  if (!title && !eyebrow && !description && !viewAllLabel) return null;
  return (
    <div className="store-section-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        {eyebrow && <p className="store-section-eyebrow">{eyebrow}</p>}
        {title && <h2 className="store-section-heading">{title}</h2>}
        {description && <p className="store-section-desc">{description}</p>}
      </div>
      {viewAllLabel && viewAllHref && (
        <Link to={viewAllHref} className="store-section-link ml-auto sm:ml-0 shrink-0">
          {viewAllLabel} →
        </Link>
      )}
    </div>
  );
}

export function HeroSection({ section, primaryColor, storeLink }: SectionProps) {
  const s = section.settings;
  if (!shouldRenderHeroSection(s)) return null;

  const imageUrl = normalizeStoreImageUrl(layoutStr(s, 'imageUrl'));
  const mobileImageUrl = normalizeStoreImageUrl(layoutStr(s, 'mobileImageUrl'));

  return (
    <section className="store-hero-section store-section--flush-top">
      <HeroBlockView
        settings={s}
        imageUrl={imageUrl}
        mobileImageUrl={mobileImageUrl || null}
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

  if (items.length === 0) return null;

  return (
    <section className={`store-section--warm ${sectionWidthClass(widthMode)}`}>
      {(showTitle || viewAllLabel) && (
        <SectionHeader
          eyebrow={showTitle ? 'Koleksiyonlar' : undefined}
          title={showTitle ? title : undefined}
          description={showTitle ? 'Özenle seçilmiş kategorilerimizi keşfedin' : undefined}
          viewAllLabel={viewAllLabel || undefined}
          viewAllHref={storeLink('/store/urunler')}
        />
      )}
      {displayMode === 'list' ? (
        <ul className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x scrollbar-thin -mx-1 px-1">
          {items.map(c => (
            <li key={c.id} className="min-w-[168px] max-w-[192px] sm:min-w-[180px] snap-start flex-shrink-0">
              <CategoryCard
                category={showImages ? c : { ...c, imageUrl: null }}
                url={storeLink(`/store/kategori/${encodeURIComponent(c.slug)}`)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className={`grid ${gridColumnsClass(columns)} gap-4 sm:gap-5`}>
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
  const { themeSettings } = useStorefrontGlobalTheme();
  const s = section.settings;
  const widthMode = layoutStr(s, 'widthMode', 'container');
  const [products, setProducts] = useState<StorefrontProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [emptyReason, setEmptyReason] = useState<FeaturedProductsEmptyReason>('none');

  const settingsKey = useMemo(
    () =>
      JSON.stringify({
        sourceType: s.sourceType ?? s.source,
        categoryId: s.categoryId,
        limit: s.limit,
      }),
    [s.sourceType, s.source, s.categoryId, s.limit],
  );

  useEffect(() => {
    if (!tenant?.slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await loadFeaturedBlockProducts(tenant.slug, s);
      if (!cancelled) {
        setProducts(result.products);
        setEmptyReason(result.emptyReason);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant?.slug, settingsKey, s]);

  const viewAllHref = featuredViewAllHref(s, storeLink);

  if (!loading && products.length === 0 && emptyReason !== 'none') {
    return null;
  }

  return (
    <section className="store-section--alt store-products-section w-full">
      <div className={productsSectionWidthClass(widthMode)}>
        <FeaturedProductsBlockView
          settings={s}
          products={products}
          loading={loading}
          emptyReason={emptyReason}
          storeLink={storeLink}
          viewAllHref={viewAllHref}
          themeSettings={themeSettings}
        />
      </div>
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
  const backgroundColor = layoutStr(s, 'backgroundColor', '#f5f3ef');
  const textColor = layoutStr(s, 'textColor', '#1c1917');
  const widthMode = layoutStr(s, 'widthMode', 'container');
  const heightMode = layoutStr(s, 'heightMode', 'medium');
  const textPosition = layoutStr(s, 'textPosition', 'left');
  const bannerImage = buildBannerImageLayerProps(s, imageUrl);
  const hasImage = !!imageUrl;

  const textAlignCls =
    textPosition === 'center'
      ? 'mx-auto text-center items-center'
      : textPosition === 'right'
        ? 'ml-auto text-right items-end'
        : 'text-left items-start';

  return (
    <section className={`${sectionWidthClass(widthMode)}`}>
      <div
        className={`store-campaign-banner ${!hasImage ? 'store-campaign-banner--no-image' : 'store-campaign-banner--has-image'} ${bannerHeightClass(heightMode)}`}
        style={{
          backgroundColor,
          color: textColor,
          borderColor: primaryColor ? `${primaryColor}22` : undefined,
        }}
      >
        {bannerImage.imageLayerStyle && (
          <div className="absolute inset-0 z-0 store-campaign-image-layer" style={bannerImage.imageLayerStyle} aria-hidden />
        )}
        {bannerImage.showOverlay && bannerImage.overlayStyle && (
          <div className="absolute inset-0 z-[1]" style={bannerImage.overlayStyle} aria-hidden />
        )}
        <div className={`store-campaign-inner relative z-[2] ${hasImage ? 'store-campaign-inner--image' : ''}`}>
          <div className={`store-campaign-content flex flex-col ${textAlignCls}`}>
            <p className="store-section-subheading">Özel fırsat</p>
            <h2 className="store-campaign-title mt-2">{title}</h2>
            {subtitle && <p className="store-campaign-subtitle">{subtitle}</p>}
            {buttonText && (
              <Link
                to={buttonUrl}
                className="store-campaign-cta"
                style={{ backgroundColor: primaryColor ?? '#1c1917' }}
              >
                {buttonText}
                <span aria-hidden>→</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function TrustBadgesSection({ section }: SectionProps) {
  const s = section.settings;
  const title = layoutStr(s, 'title', 'Neden bizi tercih etmelisiniz?');
  const badges = parseTrustBadges(layoutStr(s, 'badges'));
  const items = badges.length ? badges : DEFAULT_TRUST_BADGES;

  return (
    <section className="store-trust-section">
      <div className="store-container mx-auto w-full px-4">
        <SectionHeader
          eyebrow="Güven & hizmet"
          title={title}
          description="Alışverişiniz boyunca yanınızdayız"
        />
        <div className="store-trust-grid">
          {items.map((b, i) => {
            const Icon = trustIconForTitle(b.title);
            return (
              <div key={`${b.title}-${i}`} className="store-trust-badge">
                <div className="store-trust-badge-icon">
                  <Icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <p className="store-trust-badge-title">{b.title}</p>
                {b.description && <p className="store-trust-badge-desc">{b.description}</p>}
              </div>
            );
          })}
        </div>
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

  if (!imageUrl) return null;
  if (!title && !text && !buttonText) return null;

  return (
    <section className="store-brand-story">
      <div className="store-container-wide">
        <div
          className={`flex flex-col gap-8 sm:gap-12 lg:gap-16 ${imageRight ? 'lg:flex-row-reverse' : 'lg:flex-row'} lg:items-center`}
        >
          <div className="lg:w-[44%] flex-shrink-0">
            <div className="store-brand-story-image">
              <img
                src={imageUrl}
                alt=""
                className={`w-full aspect-[4/5] ${objectFitClass(imageFit)}`}
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="store-section-eyebrow">Marka hikayesi</p>
            {title && <h2 className="store-section-heading text-2xl sm:text-3xl lg:text-4xl">{title}</h2>}
            {text && (
              <p className="mt-5 store-text-muted text-sm sm:text-base leading-relaxed whitespace-pre-wrap max-w-xl">
                {text}
              </p>
            )}
            {buttonText && (
              <Link to={buttonUrl} className="store-btn-primary inline-flex mt-8 px-8 py-3 text-sm">
                {buttonText}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
