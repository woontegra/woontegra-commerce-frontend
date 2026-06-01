import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  AlertCircle,
  ExternalLink,
  LayoutTemplate,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Upload,
} from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import SortableSectionRow from '../components/storefront-builder/SortableSectionRow';
import SectionSettingsPanel from '../components/storefront-builder/SectionSettingsPanel';
import BuilderPreview from '../components/storefront-builder/BuilderPreview';
import {
  BLOCK_DESCRIPTIONS,
  blockLabel,
  createSection,
  formatBuilderDate,
  isKnownBlockType,
  layoutFingerprint,
  SUPPORTED_BLOCK_TYPES,
  statusLabel,
} from './storefrontBuilderHelpers';
import {
  fetchHomeDraft,
  publishHomeLayout,
  saveHomeDraft,
} from '../services/storefrontBuilder.service';
import type {
  StorefrontDraftMeta,
  StorefrontLayout,
  StorefrontSection,
} from '../types/storefrontBuilder.types';

function SummaryMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="wn-card px-4 py-3 min-w-[100px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-[15px] font-semibold mt-1 text-slate-900">{value}</p>
    </div>
  );
}

function Panel({
  title,
  desc,
  children,
  className = '',
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`wn-card overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-[13px] font-semibold text-slate-800">{title}</h2>
        {desc && <p className="text-[12px] text-slate-500 mt-0.5">{desc}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function StorefrontBuilder() {
  const { branding } = useBranding();
  const storefrontSlug = branding.storefrontSlug?.trim() || null;
  const storefrontUrl = storefrontSlug ? `/store?tenant=${encodeURIComponent(storefrontSlug)}` : null;

  const [layout, setLayout] = useState<StorefrontLayout>({ version: 1, theme: {}, sections: [] });
  const [meta, setMeta] = useState<StorefrontDraftMeta>({
    isDefault: true,
    status: 'DRAFT',
    version: 1,
    publishedAt: null,
    updatedAt: null,
    hasPublished: false,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const savedFingerprint = useRef('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const selectedSection = useMemo(
    () => layout.sections.find(s => s.id === selectedId) ?? null,
    [layout.sections, selectedId],
  );

  const dirty = layoutFingerprint(layout) !== savedFingerprint.current;
  const activeCount = layout.sections.filter(s => s.enabled).length;
  const unknownTypes = layout.sections.filter(s => !isKnownBlockType(s.type));

  const loadDraft = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await fetchHomeDraft();
    if (!result.ok) {
      setLoadError(result.message);
      setLoading(false);
      return;
    }
    setLayout(result.layout);
    setMeta(result.meta);
    savedFingerprint.current = layoutFingerprint(result.layout);
    if (result.layout.sections.length > 0) {
      setSelectedId(prev => (prev && result.layout.sections.some(s => s.id === prev) ? prev : result.layout.sections[0].id));
    } else {
      setSelectedId(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSections = (sections: StorefrontSection[]) => {
    setLayout(prev => ({ ...prev, sections }));
  };

  const handleAddBlock = (type: string) => {
    const section = createSection(type);
    updateSections([...layout.sections, section]);
    setSelectedId(section.id);
  };

  const handleDelete = (id: string) => {
    updateSections(layout.sections.filter(s => s.id !== id));
    if (selectedId === id) {
      setSelectedId(layout.sections.find(s => s.id !== id)?.id ?? null);
    }
  };

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    updateSections(layout.sections.map(s => (s.id === id ? { ...s, enabled } : s)));
  };

  const handleSettingsChange = (id: string, settings: Record<string, unknown>) => {
    updateSections(layout.sections.map(s => (s.id === id ? { ...s, settings } : s)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = layout.sections.findIndex(s => s.id === active.id);
    const newIndex = layout.sections.findIndex(s => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    updateSections(arrayMove(layout.sections, oldIndex, newIndex));
  };

  const handleSave = async () => {
    setActionError(null);
    if (!Array.isArray(layout.sections)) {
      setActionError('Geçersiz layout: sections dizisi bulunamadı.');
      return;
    }
    setSaving(true);
    const result = await saveHomeDraft(layout);
    setSaving(false);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    setMeta(result.meta);
    savedFingerprint.current = layoutFingerprint(layout);
    toast.success('Taslak kaydedildi.');
  };

  const handlePublish = async () => {
    setActionError(null);
    if (dirty) {
      setSaving(true);
      const saveResult = await saveHomeDraft(layout);
      setSaving(false);
      if (!saveResult.ok) {
        setActionError(saveResult.message);
        return;
      }
      setMeta(saveResult.meta);
      savedFingerprint.current = layoutFingerprint(layout);
    }
    setPublishing(true);
    const result = await publishHomeLayout();
    setPublishing(false);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    setMeta(prev => ({ ...prev, ...result.meta, status: 'PUBLISHED', hasPublished: true }));
    toast.success('Vitrin tasarımı yayına alındı.');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-[14px]">Vitrin builder yükleniyor…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto wn-card p-8 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h1 className="text-[16px] font-semibold text-slate-900">Yüklenemedi</h1>
        <p className="text-[13px] text-slate-500 mt-2">{loadError || 'Vitrin builder verileri yüklenemedi.'}</p>
        <button
          type="button"
          onClick={() => void loadDraft()}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-500"
        >
          <RefreshCw className="w-4 h-4" />
          Tekrar dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <LayoutTemplate className="w-5 h-5" />
            <span className="text-[11px] font-medium uppercase tracking-wide">Ana Sayfa</span>
          </div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">Vitrin Tasarım Editörü</h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-xl">
            Mağazanızın ana sayfa bloklarını sürükle-bırak yöntemiyle düzenleyin, taslak kaydedin ve yayına alın.
          </p>
          {dirty && (
            <p className="text-[12px] text-amber-600 font-medium mt-2">Kaydedilmemiş değişiklikler var</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {storefrontUrl && (
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="w-4 h-4" />
              Vitrini Görüntüle
            </a>
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || publishing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Taslağı Kaydet
          </button>
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={saving || publishing || layout.sections.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Yayına Al
          </button>
        </div>
      </div>

      {actionError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {unknownTypes.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
          {unknownTypes.length} bilinmeyen blok tipi var. Kaydedilebilir; vitrin renderında sorun çıkabilir.
        </div>
      )}

      {/* Status cards */}
      <div className="flex flex-wrap gap-3">
        <SummaryMetric label="Toplam Blok" value={layout.sections.length} />
        <SummaryMetric label="Aktif Blok" value={activeCount} />
        <SummaryMetric label="Taslak Durumu" value={statusLabel(meta.status)} />
        <SummaryMetric
          label="Son Yayın Tarihi"
          value={meta.hasPublished ? formatBuilderDate(meta.publishedAt) : 'Henüz yayınlanmadı'}
        />
      </div>

      {/* 3-column builder */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Block library */}
        <div className="xl:col-span-3">
          <Panel title="Blok Kütüphanesi" desc="Ana sayfaya eklemek istediğiniz blokları seçin.">
            <div className="space-y-2">
              {SUPPORTED_BLOCK_TYPES.map(type => (
                <div
                  key={type}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-3 hover:border-slate-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-800">{blockLabel(type)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{BLOCK_DESCRIPTIONS[type]}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddBlock(type)}
                    className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50"
                  >
                    <Plus className="w-3 h-3" />
                    Ekle
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Page flow */}
        <div className="xl:col-span-5">
          <Panel title="Sayfa Akışı" desc="Blokları sürükleyerek sıralayın.">
            {layout.sections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
                <p className="text-[13px] text-slate-500">Henüz blok yok. Sol panelden ekleyin.</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={layout.sections.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {layout.sections.map(section => (
                      <SortableSectionRow
                        key={section.id}
                        section={section}
                        isSelected={selectedId === section.id}
                        onSelect={() => setSelectedId(section.id)}
                        onEdit={() => setSelectedId(section.id)}
                        onDelete={() => handleDelete(section.id)}
                        onToggleEnabled={enabled => handleToggleEnabled(section.id, enabled)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </Panel>
        </div>

        {/* Settings + preview */}
        <div className="xl:col-span-4 space-y-5">
          <Panel title="Seçili Blok Ayarları">
            {selectedSection ? (
              <>
                <p className="text-[12px] text-slate-500 mb-4">
                  {blockLabel(selectedSection.type)}{' '}
                  <span className="text-slate-400">({selectedSection.id})</span>
                </p>
                <SectionSettingsPanel
                  section={selectedSection}
                  onChange={settings => handleSettingsChange(selectedSection.id, settings)}
                />
              </>
            ) : (
              <p className="text-[13px] text-slate-500">Düzenlemek için orta listeden bir blok seçin.</p>
            )}
          </Panel>

          <Panel title="Canlı Önizleme" desc="Builder içi görsel destek — vitrin render motoru değil.">
            <BuilderPreview section={selectedSection} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
