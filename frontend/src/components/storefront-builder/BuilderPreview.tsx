import { useEffect, useMemo, useState } from 'react';
import type { StorefrontSection } from '../../types/storefrontBuilder.types';
import {
  blockLabel,
  buildBannerImageLayerProps,
  gridColumnsClass,
  objectFitClass,
  parseTrustBadges,
} from '../../pages/storefrontBuilderHelpers';
import HeroBlockView from './HeroBlockView';
import FeaturedProductsBlockView from './FeaturedProductsBlockView';
import { normalizeImageUrl } from '../../utils/imageUtils';
import type { HeroPreviewViewport } from '../../utils/heroBuilderConstants';
import {
  featuredViewAllHref,
  loadFeaturedBlockProducts,
  type FeaturedProductsEmptyReason,
} from '../../utils/featuredProductsBlockHelpers';
import type { StorefrontProductSummary } from '../../storefront/types/storefront.types';
import type { ThemeSettings } from '../../utils/themeSettingsHelpers';
import { productsSectionWidthClass } from '../../utils/storefrontImageLayout';

function str(settings: Record<string, unknown>, key: string, fallback = '') {
  const v = settings[key];
  if (v == null) return fallback;
  return String(v);
}

function bool(settings: Record<string, unknown>, key: string, fallback: boolean) {
  const v = settings[key];
  return v === undefined ? fallback : Boolean(v);
}

function num(settings: Record<string, unknown>, key: string, fallback: number) {
  const v = settings[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function imageSrc(settings: Record<string, unknown>, key: string): string {
  return normalizeImageUrl(str(settings, key)) ?? '';
}

function imagePreview(url: string, className: string) {
  const trimmed = url.trim();
  const src = normalizeImageUrl(trimmed);
  if (!src) {
    return <div className={`${className} bg-slate-100 flex items-center justify-center text-[10px] text-slate-400`}>Görsel</div>;
  }
  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={e => {
        const el = e.target as HTMLImageElement;
        el.replaceWith(Object.assign(document.createElement('div'), {
          className: `${className} bg-slate-100 flex items-center justify-center text-[10px] text-slate-400`,
          textContent: 'Görsel',
        }));
      }}
    />
  );
}

interface BuilderPreviewProps {
  section: StorefrontSection | null;
  variant?: 'compact' | 'workspace';
  previewViewport?: HeroPreviewViewport;
  tenantSlug?: string | null;
  themeSettings?: ThemeSettings | null;
}

function FeaturedProductsPreview({
  section,
  tenantSlug,
  isWorkspace,
  themeSettings = null,
}: {
  section: StorefrontSection;
  tenantSlug?: string | null;
  isWorkspace: boolean;
  themeSettings?: ThemeSettings | null;
}) {
  const s = section.settings;
  const [products, setProducts] = useState<StorefrontProductSummary[]>([]);
  const [loading, setLoading] = useState(Boolean(tenantSlug));
  const [emptyReason, setEmptyReason] = useState<FeaturedProductsEmptyReason>('none');

  const settingsKey = useMemo(
    () =>
      JSON.stringify({
        sourceType: s.sourceType ?? s.source,
        categoryId: s.categoryId,
        limit: s.limit,
        displayMode: s.displayMode,
      }),
    [s.sourceType, s.source, s.categoryId, s.limit, s.displayMode],
  );

  useEffect(() => {
    if (!tenantSlug) {
      setProducts([]);
      setEmptyReason('no_products');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await loadFeaturedBlockProducts(tenantSlug, s);
      if (!cancelled) {
        setProducts(result.products);
        setEmptyReason(result.emptyReason);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug, settingsKey, s]);

  const storeLink = (path: string) => path;
  const viewAllHref = featuredViewAllHref(s, storeLink);
  const widthMode = str(s, 'widthMode', 'container');
  const shellCls = isWorkspace
    ? 'p-4 sm:p-6 bg-white'
    : 'rounded-xl border border-slate-200 p-4 bg-white';

  return (
    <div className={shellCls}>
      <div className={productsSectionWidthClass(widthMode)}>
        <FeaturedProductsBlockView
          settings={s}
          products={products}
          loading={loading}
          emptyReason={tenantSlug ? emptyReason : 'no_products'}
          storeLink={storeLink}
          viewAllHref={viewAllHref}
          preview
          themeSettings={themeSettings}
        />
      </div>
    </div>
  );
}

export default function BuilderPreview({
  section,
  variant = 'compact',
  previewViewport,
  tenantSlug = null,
  themeSettings = null,
}: BuilderPreviewProps) {
  const isWorkspace = variant === 'workspace';
  const themePrimary = themeSettings?.enabled ? themeSettings.primaryColor : null;
  const emptyCls = isWorkspace
    ? 'px-6 py-16 text-center bg-slate-50'
    : 'rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center';
  if (!section) {
    return (
      <div className={emptyCls}>
        <p className="text-[13px] text-slate-500">Önizleme için sayfa akışından bir blok seçin.</p>
      </div>
    );
  }

  if (!section.enabled) {
    return (
      <div className={isWorkspace ? 'px-6 py-12 text-center bg-slate-50' : 'rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center'}>
        <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">Pasif blok</p>
        <p className="text-[13px] text-slate-400 mt-1">{blockLabel(section.type)}</p>
      </div>
    );
  }

  const s = section.settings;

  switch (section.type) {
    case 'hero': {
      const rawUrl = imageSrc(s, 'imageUrl') || null;
      const rawMobileUrl = imageSrc(s, 'mobileImageUrl') || null;
      const activeSlideId = String(s.activeSlideId ?? '');
      return (
        <HeroBlockView
          settings={s}
          imageUrl={rawUrl}
          mobileImageUrl={rawMobileUrl}
          themePrimary={themePrimary}
          preview
          previewViewport={previewViewport}
          previewActiveSlideId={activeSlideId || null}
          className={isWorkspace ? 'w-full store-hero-section' : 'rounded-xl border border-stone-200/80 store-hero-section overflow-hidden'}
        />
      );
    }

    case 'categoryGrid': {
      const cols = num(s, 'columns', 4);
      const count = Math.min(num(s, 'limit', 4), cols);
      const cardCls = isWorkspace
        ? 'p-4 sm:p-6 store-section--warm'
        : 'rounded-xl border border-stone-200/80 p-4 store-section--warm';
      return (
        <div className={cardCls}>
          <div className="store-section-header mb-4">
            <p className="store-section-eyebrow text-[10px]">Koleksiyonlar</p>
            <p className="store-section-heading text-base">{str(s, 'title', 'Kategoriler')}</p>
          </div>
          <div className={`grid ${gridColumnsClass(cols)} gap-3`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="store-category-card">
                {bool(s, 'showImages', true) ? (
                  <div className="store-category-card-media">
                    <div className="w-full h-full bg-stone-200/60" />
                    <div className="store-category-card-overlay">
                      <span className="store-category-card-label text-xs">Kategori {i + 1}</span>
                    </div>
                  </div>
                ) : (
                  <div className="store-category-card-placeholder py-6">
                    <span className="store-category-card-placeholder-name text-xs">Kategori {i + 1}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'featuredProducts':
      return (
        <FeaturedProductsPreview
          section={section}
          tenantSlug={tenantSlug}
          isWorkspace={isWorkspace}
          themeSettings={themeSettings}
        />
      );

    case 'campaignBanner': {
      const bg = str(s, 'backgroundColor', '#f5f3ef');
      const color = str(s, 'textColor', '#1c1917');
      const url = imageSrc(s, 'imageUrl') || null;
      const bannerImage = buildBannerImageLayerProps(s, url);
      return (
        <div
          className={`store-campaign-banner ${!url ? 'store-campaign-banner--no-image' : ''} relative overflow-hidden min-h-[140px]`}
          style={{ backgroundColor: bg, color }}
        >
          {bannerImage.imageLayerStyle && (
            <div className="absolute inset-0 z-0" style={bannerImage.imageLayerStyle} aria-hidden />
          )}
          {bannerImage.showOverlay && bannerImage.overlayStyle && (
            <div className="absolute inset-0 z-[1]" style={bannerImage.overlayStyle} aria-hidden />
          )}
          <div className="store-campaign-inner relative z-[2]">
            <div className="store-campaign-content">
              <p className="store-section-subheading text-[10px]">Özel fırsat</p>
              <h3 className="store-campaign-title text-base mt-1">{str(s, 'title', 'Kampanya')}</h3>
              <p className="store-campaign-subtitle text-[12px]">{str(s, 'subtitle')}</p>
              {str(s, 'buttonText') && (
                <span
                  className="store-campaign-cta inline-flex mt-2 px-3 py-1.5 text-[10px] text-white"
                  style={{ backgroundColor: themePrimary ?? '#1c1917' }}
                >
                  {str(s, 'buttonText')}
                </span>
              )}
            </div>
            {!url && <div className="store-campaign-visual min-h-[80px]" aria-hidden />}
          </div>
        </div>
      );
    }

    case 'trustBadges': {
      const badges = parseTrustBadges(str(s, 'badges'));
      const items = badges.length
        ? badges
        : [
            { title: 'Güvenli ödeme', description: 'SSL koruması' },
            { title: 'Hızlı kargo', description: '1–3 iş günü' },
          ];
      return (
        <div className="rounded-xl border border-stone-200/80 p-4 store-trust-section">
          <p className="store-section-eyebrow text-[10px] mb-1">Güven & hizmet</p>
          <p className="store-section-heading text-base mb-4">{str(s, 'title', 'Güven')}</p>
          <div className="store-trust-grid gap-2">
            {items.map((b, i) => (
              <div key={i} className="store-trust-badge py-3 px-2.5">
                <div className="store-trust-badge-icon w-8 h-8 mb-2">
                  <span className="text-xs">✦</span>
                </div>
                <p className="store-trust-badge-title text-xs">{b.title}</p>
                {b.description && <p className="store-trust-badge-desc text-[10px]">{b.description}</p>}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'textImage': {
      const imageLeft = str(s, 'imagePosition', 'left') !== 'right';
      const fitCls = objectFitClass(str(s, 'imageFit', 'cover'));
      const url = imageSrc(s, 'imageUrl');
      if (!url.trim()) {
        return (
          <div className="rounded-xl border border-dashed border-stone-200/80 p-4 bg-stone-50/50 text-center">
            <p className="text-[12px] store-text-muted">Görsel eklenince vitrinde gösterilir</p>
          </div>
        );
      }
      return (
        <div className="rounded-xl border border-stone-200/80 p-4 store-brand-story">
          <div className={`flex gap-4 ${imageLeft ? '' : 'flex-row-reverse'}`}>
            {imagePreview(url, `w-24 h-28 rounded-xl ${fitCls} flex-shrink-0 store-brand-story-image`)}
            <div className="min-w-0 flex-1">
              <p className="store-section-eyebrow text-[10px]">Marka hikayesi</p>
              <p className="store-section-heading text-base">{str(s, 'title', 'Başlık')}</p>
              <p className="store-text-muted text-[12px] mt-1 line-clamp-3">{str(s, 'text', 'Metin')}</p>
              {str(s, 'buttonText') && (
                <span className="store-btn-primary inline-flex mt-2 px-3 py-1 text-[10px]">{str(s, 'buttonText')}</span>
              )}
            </div>
          </div>
        </div>
      );
    }

    default:
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
          <p className="text-[13px] text-slate-500">Bilinmeyen blok tipi</p>
        </div>
      );
  }
}
