import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import type { StorefrontSection } from '../../types/storefrontBuilder.types';
import { blockLabel, isKnownBlockType } from '../../pages/storefrontBuilderHelpers';

interface SortableSectionRowProps {
  section: StorefrontSection;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: (enabled: boolean) => void;
}

export default function SortableSectionRow({
  section,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggleEnabled,
}: SortableSectionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  const known = isKnownBlockType(section.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
        isSelected
          ? 'border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200'
          : 'border-slate-200 bg-white hover:border-slate-300'
      } ${!section.enabled ? 'opacity-60' : ''}`}
    >
      <button
        type="button"
        className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Sürükle"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-w-0 text-left"
      >
        <p className="text-[13px] font-medium text-slate-800 truncate">{blockLabel(section.type)}</p>
        <span
          className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
            known ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {section.type}
        </span>
      </button>

      <label className="flex-shrink-0 flex items-center gap-1.5" title={section.enabled ? 'Aktif' : 'Pasif'}>
        <input
          type="checkbox"
          checked={section.enabled}
          onChange={e => onToggleEnabled(e.target.checked)}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-[11px] text-slate-500 hidden sm:inline">
          {section.enabled ? 'Aktif' : 'Pasif'}
        </span>
      </label>

      <button
        type="button"
        onClick={onEdit}
        className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
        aria-label="Düzenle"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
        aria-label="Sil"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
