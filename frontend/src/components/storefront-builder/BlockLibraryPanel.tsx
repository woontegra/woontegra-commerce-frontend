import { LayoutPanelTop, Megaphone, PanelBottom, Palette, Plus } from 'lucide-react';
import {
  BLOCK_DESCRIPTIONS,
  blockLabel,
  SUPPORTED_BLOCK_TYPES,
} from '../../pages/storefrontBuilderHelpers';
import { GLOBAL_ANNOUNCEMENT_BAR_ID } from '../../utils/announcementBarHelpers';
import { GLOBAL_HEADER_SETTINGS_ID } from '../../utils/headerSettingsHelpers';
import { GLOBAL_FOOTER_SETTINGS_ID } from '../../utils/footerSettingsHelpers';
import { GLOBAL_THEME_SETTINGS_ID } from '../../utils/themeSettingsHelpers';
import { BLOCK_ICONS, BLOCK_ICON_COLORS } from './blockLibraryMeta';

export type GlobalBuilderSelectionId =
  | typeof GLOBAL_ANNOUNCEMENT_BAR_ID
  | typeof GLOBAL_HEADER_SETTINGS_ID
  | typeof GLOBAL_FOOTER_SETTINGS_ID
  | typeof GLOBAL_THEME_SETTINGS_ID;

type BlockLibraryPanelProps = {
  onAddBlock: (type: string) => void;
  onSelectGlobal: (id: GlobalBuilderSelectionId) => void;
  selectedGlobalId: string | null;
};

export default function BlockLibraryPanel({
  onAddBlock,
  onSelectGlobal,
  selectedGlobalId,
}: BlockLibraryPanelProps) {
  const announcementSelected = selectedGlobalId === GLOBAL_ANNOUNCEMENT_BAR_ID;
  const headerSelected = selectedGlobalId === GLOBAL_HEADER_SETTINGS_ID;
  const footerSelected = selectedGlobalId === GLOBAL_FOOTER_SETTINGS_ID;
  const themeSelected = selectedGlobalId === GLOBAL_THEME_SETTINGS_ID;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 py-3 border-b border-slate-200 bg-white">
        <h2 className="text-[13px] font-semibold text-slate-800">Blok Kütüphanesi</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Ana sayfaya eklemek için seçin</p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-1 mb-1.5">
            Global Alanlar
          </p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onSelectGlobal(GLOBAL_THEME_SETTINGS_ID)}
              className={`w-full group flex items-start gap-2.5 rounded-xl border px-2.5 py-2.5 text-left transition-all ${
                themeSelected
                  ? 'border-indigo-300 bg-indigo-50/80 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-amber-100 text-amber-700">
                <Palette className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 leading-tight">Tema Ayarları</p>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
                  Renkler, font, radius, container ve ürün kartı varsayılanları.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectGlobal(GLOBAL_HEADER_SETTINGS_ID)}
              className={`w-full group flex items-start gap-2.5 rounded-xl border px-2.5 py-2.5 text-left transition-all ${
                headerSelected
                  ? 'border-indigo-300 bg-indigo-50/80 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-sky-100 text-sky-700">
                <LayoutPanelTop className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 leading-tight">Header</p>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
                  Logo, menü, arama, sepet ve renk ayarlarını yönetin.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectGlobal(GLOBAL_FOOTER_SETTINGS_ID)}
              className={`w-full group flex items-start gap-2.5 rounded-xl border px-2.5 py-2.5 text-left transition-all ${
                footerSelected
                  ? 'border-indigo-300 bg-indigo-50/80 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-700">
                <PanelBottom className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 leading-tight">Footer</p>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
                  Logo, menü kolonları, sosyal medya, WhatsApp ve yasal linkler.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectGlobal(GLOBAL_ANNOUNCEMENT_BAR_ID)}
              className={`w-full group flex items-start gap-2.5 rounded-xl border px-2.5 py-2.5 text-left transition-all ${
                announcementSelected
                  ? 'border-indigo-300 bg-indigo-50/80 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-violet-100 text-violet-700">
                <Megaphone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 leading-tight">Üst Duyuru Barı</p>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
                  Header üstünde kampanya, iletişim ve duyuru metni gösterin.
                </p>
              </div>
            </button>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-1 mb-1.5">
            Sayfa Blokları
          </p>
          <div className="space-y-2">
            {SUPPORTED_BLOCK_TYPES.map(type => {
              const Icon = BLOCK_ICONS[type];
              const color = BLOCK_ICON_COLORS[type];
              return (
                <div
                  key={type}
                  className="group flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 hover:border-indigo-200 hover:shadow-sm transition-all"
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-slate-800 leading-tight">{blockLabel(type)}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
                      {BLOCK_DESCRIPTIONS[type]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddBlock(type)}
                    className="flex-shrink-0 inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-medium hover:bg-indigo-500 opacity-90 group-hover:opacity-100"
                  >
                    <Plus className="w-3 h-3" />
                    Ekle
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
