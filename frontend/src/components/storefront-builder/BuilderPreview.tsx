import type { StorefrontSection } from '../../types/storefrontBuilder.types';
import {
  blockLabel,
  buildBannerImageLayerProps,
  gridColumnsClass,
  objectFitClass,
  parseTrustBadges,
} from '../../pages/storefrontBuilderHelpers';
import HeroBlockView from './HeroBlockView';
import { normalizeImageUrl } from '../../utils/imageUtils';
import type { HeroPreviewViewport } from '../../utils/heroBuilderConstants';

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
}

export default function BuilderPreview({ section, variant = 'compact', previewViewport }: BuilderPreviewProps) {
  const isWorkspace = variant === 'workspace';
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
      return (
        <HeroBlockView
          settings={s}
          imageUrl={rawUrl}
          themePrimary={null}
          preview
          previewViewport={previewViewport}
          className={isWorkspace ? 'w-full' : 'rounded-xl border border-slate-200'}
        />
      );
    }

    case 'categoryGrid': {
      const cols = num(s, 'columns', 4);
      const count = Math.min(num(s, 'limit', 4), cols);
      const cardCls = isWorkspace
        ? 'rounded-xl border border-slate-200 p-6 bg-white'
        : 'rounded-xl border border-slate-200 p-4 bg-white';
      return (
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-slate-800">{str(s, 'title', 'Kategoriler')}</p>
            <span className="text-[10px] text-indigo-600">{str(s, 'viewAllLabel', 'Tüm kategorileri göster')}</span>
          </div>
          <div className={`grid ${gridColumnsClass(cols)} gap-2`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-100 p-2 bg-slate-50">
                {bool(s, 'showImages', true) && <div className="aspect-square rounded bg-slate-200 mb-1.5" />}
                <div className="h-2 w-2/3 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'featuredProducts': {
      const cardStyle = str(s, 'cardStyle', 'card');
      const showPrice = bool(s, 'showPrice', true);
      const showCart = bool(s, 'showAddToCart', true);
      return (
        <div className="rounded-xl border border-slate-200 p-4 bg-white">
          <p className="text-[13px] font-semibold text-slate-800 mb-3">{str(s, 'title', 'Ürünler')}</p>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2].map(i => (
              <div
                key={i}
                className={`rounded-lg overflow-hidden ${cardStyle === 'card' ? 'border border-slate-200 shadow-sm' : 'border border-transparent'}`}
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200" />
                <div className="p-2 space-y-1.5">
                  <div className="h-2 w-3/4 bg-slate-200 rounded" />
                  {showPrice && <div className="h-2 w-1/2 bg-indigo-100 rounded" />}
                  {showCart && (
                    <div className="h-6 rounded-md bg-indigo-600/90 flex items-center justify-center text-[9px] text-white font-medium">
                      Sepete Ekle
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'campaignBanner': {
      const bg = str(s, 'backgroundColor', '#fffbeb');
      const color = str(s, 'textColor', '#78350f');
      const url = imageSrc(s, 'imageUrl') || null;
      const bannerImage = buildBannerImageLayerProps(s, url);
      return (
        <div
          className="rounded-xl overflow-hidden border border-slate-200 px-4 py-5 relative min-h-[120px]"
          style={{ backgroundColor: bg, color }}
        >
          {bannerImage.imageLayerStyle && (
            <div className="absolute inset-0" style={bannerImage.imageLayerStyle} aria-hidden />
          )}
          {bannerImage.showOverlay && bannerImage.overlayStyle && (
            <div className="absolute inset-0" style={bannerImage.overlayStyle} aria-hidden />
          )}
          <div className="relative">
            <h3 className="text-[15px] font-semibold">{str(s, 'title', 'Kampanya')}</h3>
            <p className="text-[12px] opacity-80 mt-0.5">{str(s, 'subtitle')}</p>
            {str(s, 'buttonText') && (
              <span className="inline-block mt-2 px-2.5 py-1 rounded-lg bg-black/10 text-[11px] font-medium">
                {str(s, 'buttonText')}
              </span>
            )}
          </div>
        </div>
      );
    }

    case 'trustBadges': {
      const badges = parseTrustBadges(str(s, 'badges'));
      return (
        <div className="rounded-xl border border-slate-200 p-4 bg-white">
          <p className="text-[13px] font-semibold text-slate-800 mb-3 text-center">{str(s, 'title', 'Güven')}</p>
          <div className="grid gap-2">
            {(badges.length ? badges : [{ title: 'Rozet', description: '' }]).map((b, i) => (
              <div key={i} className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2.5 text-center">
                <p className="text-[12px] font-semibold text-emerald-900">{b.title}</p>
                {b.description && <p className="text-[10px] text-emerald-700/80 mt-0.5">{b.description}</p>}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'textImage': {
      const imageLeft = str(s, 'imagePosition', 'left') !== 'right';
      const fitCls = objectFitClass(str(s, 'imageFit', 'cover'));
      return (
        <div className="rounded-xl border border-slate-200 p-4 bg-white">
          <div className={`flex gap-3 ${imageLeft ? '' : 'flex-row-reverse'}`}>
            {imagePreview(imageSrc(s, 'imageUrl'), `w-20 h-20 rounded-lg ${fitCls} flex-shrink-0`)}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-800">{str(s, 'title', 'Başlık')}</p>
              <p className="text-[12px] text-slate-500 mt-1 line-clamp-3">{str(s, 'text', 'Metin')}</p>
              {str(s, 'buttonText') && (
                <span className="inline-block mt-2 text-[11px] font-medium text-indigo-600">{str(s, 'buttonText')}</span>
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
