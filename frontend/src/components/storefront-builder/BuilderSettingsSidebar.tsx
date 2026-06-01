import { Trash2 } from 'lucide-react';
import type { StorefrontSection } from '../../types/storefrontBuilder.types';
import { blockLabel } from '../../pages/storefrontBuilderHelpers';
import HeroSettingsPanel from './HeroSettingsPanel';
import SectionSettingsPanel from './SectionSettingsPanel';

type BuilderSettingsSidebarProps = {
  section: StorefrontSection | null;
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onToggleEnabled: (enabled: boolean) => void;
};

export default function BuilderSettingsSidebar({
  section,
  onChange,
  onDelete,
  onToggleEnabled,
}: BuilderSettingsSidebarProps) {
  if (!section) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="shrink-0 px-4 py-3 border-b border-slate-200 bg-white">
          <h2 className="text-[13px] font-semibold text-slate-800">Seçili Blok Ayarları</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <p className="text-[13px] font-medium text-slate-600">Blok seçilmedi</p>
            <p className="text-[12px] text-slate-400 mt-1">Düzenlemek için sayfa akışından bir blok seçin.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 py-3 border-b border-slate-200 bg-white space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-slate-800 truncate">{blockLabel(section.type)}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">{section.type}</p>
          </div>
          <button
            type="button"
            onClick={onDelete}
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            aria-label="Bloğu sil"
            title="Sil"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <label className="flex items-center gap-2 text-[12px] text-slate-600">
          <input
            type="checkbox"
            checked={section.enabled}
            onChange={e => onToggleEnabled(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          {section.enabled ? 'Aktif' : 'Pasif'}
        </label>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {section.type === 'hero' ? (
          <HeroSettingsPanel key={section.id} section={section} onChange={onChange} tabbed />
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <SectionSettingsPanel key={section.id} section={section} onChange={onChange} />
          </div>
        )}
      </div>
    </div>
  );
}
