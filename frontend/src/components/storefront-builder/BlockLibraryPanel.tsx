import { Plus } from 'lucide-react';
import {
  BLOCK_DESCRIPTIONS,
  blockLabel,
  SUPPORTED_BLOCK_TYPES,
} from '../../pages/storefrontBuilderHelpers';
import { BLOCK_ICONS, BLOCK_ICON_COLORS } from './blockLibraryMeta';

type BlockLibraryPanelProps = {
  onAddBlock: (type: string) => void;
};

export default function BlockLibraryPanel({ onAddBlock }: BlockLibraryPanelProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 py-3 border-b border-slate-200 bg-white">
        <h2 className="text-[13px] font-semibold text-slate-800">Blok Kütüphanesi</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Ana sayfaya eklemek için seçin</p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
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
  );
}
