import type { StorefrontSection } from '../../types/storefrontBuilder.types';
import { blockLabel } from '../../pages/storefrontBuilderHelpers';

function str(settings: Record<string, unknown>, key: string, fallback = '') {
  return String(settings[key] ?? fallback);
}

function badgesList(settings: Record<string, unknown>): string[] {
  const raw = str(settings, 'badges');
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

interface BuilderPreviewProps {
  section: StorefrontSection | null;
}

export default function BuilderPreview({ section }: BuilderPreviewProps) {
  if (!section) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
        <p className="text-[13px] text-slate-500">Önizleme için bir blok seçin.</p>
      </div>
    );
  }

  if (!section.enabled) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
        <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">Pasif blok</p>
        <p className="text-[13px] text-slate-400 mt-1">{blockLabel(section.type)}</p>
      </div>
    );
  }

  const s = section.settings;

  switch (section.type) {
    case 'hero': {
      const align = str(s, 'alignment', 'center');
      const alignCls =
        align === 'left' ? 'text-left items-start' : align === 'right' ? 'text-right items-end' : 'text-center items-center';
      return (
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-5">
          <div className={`flex flex-col gap-2 ${alignCls}`}>
            <p className="text-[11px] uppercase tracking-wider opacity-70">Hero Banner</p>
            <h3 className="text-lg font-semibold">{str(s, 'title', 'Başlık')}</h3>
            <p className="text-[13px] opacity-90 max-w-sm">{str(s, 'subtitle', 'Alt başlık')}</p>
            {str(s, 'buttonText') && (
              <span className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-white/20 text-[12px] font-medium">
                {str(s, 'buttonText')}
              </span>
            )}
          </div>
        </div>
      );
    }

    case 'categoryGrid':
      return (
        <div className="rounded-xl border border-slate-200 p-4 bg-white">
          <p className="text-[13px] font-semibold text-slate-800 mb-3">{str(s, 'title', 'Kategoriler')}</p>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-slate-100 flex items-center justify-center">
                {Boolean(s.showImages) && (
                  <div className="w-6 h-6 rounded bg-slate-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      );

    case 'featuredProducts':
      return (
        <div className="rounded-xl border border-slate-200 p-4 bg-white">
          <p className="text-[13px] font-semibold text-slate-800 mb-3">{str(s, 'title', 'Ürünler')}</p>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-100 p-2">
                <div className="aspect-[4/3] rounded bg-slate-100 mb-2" />
                <div className="h-2 w-3/4 bg-slate-200 rounded" />
                <div className="h-2 w-1/2 bg-slate-100 rounded mt-1" />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Kaynak: {str(s, 'source', 'featured') === 'latest' ? 'En yeni' : 'Öne çıkan'}
          </p>
        </div>
      );

    case 'campaignBanner':
      return (
        <div className="rounded-xl overflow-hidden border border-amber-200 bg-amber-50 p-4">
          <p className="text-[11px] font-medium text-amber-700 uppercase">Kampanya</p>
          <h3 className="text-[15px] font-semibold text-amber-950 mt-1">{str(s, 'title', 'Kampanya')}</h3>
          <p className="text-[12px] text-amber-800/80 mt-0.5">{str(s, 'subtitle')}</p>
          {str(s, 'buttonText') && (
            <span className="inline-block mt-2 text-[12px] font-medium text-amber-900 underline">
              {str(s, 'buttonText')}
            </span>
          )}
        </div>
      );

    case 'trustBadges': {
      const badges = badgesList(s);
      return (
        <div className="rounded-xl border border-slate-200 p-4 bg-white">
          <p className="text-[13px] font-semibold text-slate-800 mb-3">{str(s, 'title', 'Güven')}</p>
          <div className="flex flex-wrap gap-2">
            {(badges.length ? badges : ['Rozet']).map((b, i) => (
              <span
                key={i}
                className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      );
    }

    case 'textImage': {
      const imageLeft = str(s, 'imagePosition', 'left') !== 'right';
      return (
        <div className="rounded-xl border border-slate-200 p-4 bg-white">
          <div className={`flex gap-3 ${imageLeft ? '' : 'flex-row-reverse'}`}>
            <div className="w-20 h-20 rounded-lg bg-slate-100 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-800">{str(s, 'title', 'Başlık')}</p>
              <p className="text-[12px] text-slate-500 mt-1 line-clamp-3">{str(s, 'text', 'Metin')}</p>
            </div>
          </div>
        </div>
      );
    }

    default:
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
          <p className="text-[13px] text-slate-500">Bilinmeyen blok tipi: {section.type}</p>
        </div>
      );
  }
}
