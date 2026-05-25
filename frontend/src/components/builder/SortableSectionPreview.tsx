import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SectionPreview from './SectionPreview';
import type { Section } from './SectionLibrary';

interface SortableSectionPreviewProps {
  section: Section;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function SortableSectionPreview({
  section,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: SortableSectionPreviewProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-10 top-1/2 -translate-y-1/2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <div className="bg-gray-800 text-white p-2 rounded-lg shadow-lg hover:bg-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      </div>

      <div className="group">
        <SectionPreview
          section={section}
          isSelected={isSelected}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
