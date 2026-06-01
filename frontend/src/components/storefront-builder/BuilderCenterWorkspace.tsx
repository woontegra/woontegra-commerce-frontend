import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import type { StorefrontLayout, StorefrontSection } from '../../types/storefrontBuilder.types';
import { blockLabel } from '../../pages/storefrontBuilderHelpers';
import type { HeroPreviewViewport } from '../../utils/heroBuilderConstants';
import { PREVIEW_VIEWPORT_WIDTH } from '../../utils/heroBuilderConstants';
import SortableSectionRow from './SortableSectionRow';
import BuilderPreview from './BuilderPreview';
import { AnnouncementBar } from '../../storefront/components/AnnouncementBar';
import type { AnnouncementBarSettings } from '../../utils/announcementBarHelpers';
import { GLOBAL_ANNOUNCEMENT_BAR_ID } from '../../utils/announcementBarHelpers';

type BuilderCenterWorkspaceProps = {
  layout: StorefrontLayout;
  selectedId: string | null;
  selectedSection: StorefrontSection | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onDragEnd: (event: DragEndEvent) => void;
  tenantSlug?: string | null;
  announcementBar: AnnouncementBarSettings;
  globalSelection: string | null;
};

const VIEWPORTS: { id: HeroPreviewViewport; label: string; icon: typeof Monitor }[] = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'mobile', label: 'Mobil', icon: Smartphone },
];

export default function BuilderCenterWorkspace({
  layout,
  selectedId,
  selectedSection,
  onSelect,
  onEdit,
  onDelete,
  onToggleEnabled,
  onDragEnd,
  tenantSlug = null,
  announcementBar,
  globalSelection,
}: BuilderCenterWorkspaceProps) {
  const [previewViewport, setPreviewViewport] = useState<HeroPreviewViewport>('desktop');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const showViewportSwitcher =
    selectedSection?.type === 'hero' || globalSelection === GLOBAL_ANNOUNCEMENT_BAR_ID;

  const previewViewportForBar: 'desktop' | 'mobile' | undefined =
    previewViewport === 'mobile' ? 'mobile' : previewViewport ? 'desktop' : undefined;

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50/50">
      <div className="shrink-0 border-b border-slate-200 bg-white">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-semibold text-slate-800">Sayfa Akışı</h2>
            <p className="text-[11px] text-slate-500">Sürükleyerek sıralayın</p>
          </div>
          <span className="text-[11px] font-medium text-slate-500 tabular-nums">
            {layout.sections.length} blok
          </span>
        </div>
        <div className="max-h-[200px] overflow-y-auto p-3">
          {layout.sections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center px-4 bg-slate-50/80">
              <p className="text-[13px] font-medium text-slate-600">Henüz blok eklenmedi</p>
              <p className="text-[12px] text-slate-500 mt-1">Sol panelden bir blok ekleyerek başlayın.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={layout.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {layout.sections.map(section => (
                    <SortableSectionRow
                      key={section.id}
                      section={section}
                      isSelected={selectedId === section.id}
                      onSelect={() => onSelect(section.id)}
                      onEdit={() => onEdit(section.id)}
                      onDelete={() => onDelete(section.id)}
                      onToggleEnabled={enabled => onToggleEnabled(section.id, enabled)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="shrink-0 px-4 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[13px] font-semibold text-slate-800">Vitrin Önizleme</h2>
            <p className="text-[11px] text-slate-500">
              {globalSelection === GLOBAL_ANNOUNCEMENT_BAR_ID
                ? 'Üst Duyuru Barı'
                : selectedSection
                  ? blockLabel(selectedSection.type)
                  : 'Blok seçin'}
            </p>
          </div>
          {showViewportSwitcher && (
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200">
              {VIEWPORTS.map(vp => {
                const Icon = vp.icon;
                return (
                  <button
                    key={vp.id}
                    type="button"
                    title={vp.label}
                    onClick={() => setPreviewViewport(vp.id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                      previewViewport === vp.id
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{vp.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
          <div
            className="mx-auto transition-all duration-300"
            style={{ maxWidth: showViewportSwitcher ? PREVIEW_VIEWPORT_WIDTH[previewViewport] : '100%' }}
          >
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50 overflow-hidden">
              <div className="h-10 bg-gradient-to-b from-slate-100 to-slate-50 border-b border-slate-200 flex items-center px-3 gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/90" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/90" />
                <span className="ml-1 flex-1 h-6 rounded-md bg-white border border-slate-200/90 text-[10px] text-slate-400 flex items-center px-2.5 truncate">
                  mağaza vitrin önizleme
                </span>
              </div>
              <div className="bg-white min-h-[200px]">
                {(announcementBar.enabled || globalSelection === GLOBAL_ANNOUNCEMENT_BAR_ID) && (
                  <AnnouncementBar
                    settings={announcementBar}
                    preview
                    previewViewport={previewViewportForBar}
                  />
                )}
                {globalSelection === GLOBAL_ANNOUNCEMENT_BAR_ID ? (
                  <div className="px-4 py-8 text-center text-[12px] text-slate-400 border-t border-dashed border-slate-100">
                    Duyuru barı tüm vitrin sayfalarında header üstünde görünür.
                  </div>
                ) : (
                  <BuilderPreview
                    section={selectedSection}
                    variant="workspace"
                    previewViewport={showViewportSwitcher ? previewViewport : undefined}
                    tenantSlug={tenantSlug}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
