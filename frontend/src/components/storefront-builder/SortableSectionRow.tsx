import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import type { StorefrontSection } from '../../types/storefrontBuilder.types';
import { blockLabel } from '../../pages/storefrontBuilderHelpers';

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-all ${
        isSelected
          ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-2 ring-indigo-200/80'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      } ${!section.enabled ? 'opacity-55' : ''}`}
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

      <button type="button" onClick={onSelect} className="flex-1 min-w-0 text-left">
        <p className="text-[12px] font-semibold text-slate-800 truncate">{blockLabel(section.type)}</p>
        <p className="text-[10px] text-slate-500 truncate mt-0.5">{section.type}</p>
      </button>

      <label className="flex-shrink-0 flex items-center gap-1.5" title={section.enabled ? 'Aktif' : 'Pasif'}>
        <input
          type="checkbox"
          checked={section.enabled}
          onChange={e => onToggleEnabled(e.target.checked)}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-[11px] text-slate-500 hidden sm:inline">{section.enabled ? 'Aktif' : 'Pasif'}</span>
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
