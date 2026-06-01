import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import {
  AlertCircle,
  ExternalLink,
  LayoutTemplate,
  Loader2,
  RefreshCw,
  Save,
  Upload,
} from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import BlockLibraryPanel from '../components/storefront-builder/BlockLibraryPanel';
import BuilderCenterWorkspace from '../components/storefront-builder/BuilderCenterWorkspace';
import BuilderSettingsSidebar from '../components/storefront-builder/BuilderSettingsSidebar';
import {
  blockLabel,
  createSection,
  formatBuilderDate,
  isKnownBlockType,
  layoutFingerprint,
  statusLabel,
} from './storefrontBuilderHelpers';
import {
  extractAnnouncementBarFromTheme,
  GLOBAL_ANNOUNCEMENT_BAR_ID,
  type AnnouncementBarSettings,
} from '../utils/announcementBarHelpers';
import {
  extractHeaderSettingsFromTheme,
  GLOBAL_HEADER_SETTINGS_ID,
  type HeaderSettings,
} from '../utils/headerSettingsHelpers';
import {
  fetchHomeDraft,
  publishHomeLayout,
  saveHomeDraft,
} from '../services/storefrontBuilder.service';
import type {
  StorefrontDraftMeta,
  StorefrontLayout,
} from '../types/storefrontBuilder.types';

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
  const [globalSelection, setGlobalSelection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const savedFingerprint = useRef('');

  const announcementBar = useMemo(
    () => extractAnnouncementBarFromTheme(layout.theme),
    [layout.theme],
  );

  const headerSettings = useMemo(
    () => extractHeaderSettingsFromTheme(layout.theme),
    [layout.theme],
  );

  const selectedSection = useMemo(
    () => layout.sections.find(s => s.id === selectedId) ?? null,
    [layout.sections, selectedId],
  );

  const dirty = useMemo(
    () => layoutFingerprint(layout) !== savedFingerprint.current,
    [layout],
  );
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

  const handleAddBlock = (type: string) => {
    const section = createSection(type);
    setLayout(prev => ({ ...prev, sections: [...prev.sections, section] }));
    setGlobalSelection(null);
    setSelectedId(section.id);
  };

  const handleSelectSection = (id: string) => {
    setGlobalSelection(null);
    setSelectedId(id);
  };

  const handleSelectGlobal = (id: typeof GLOBAL_ANNOUNCEMENT_BAR_ID | typeof GLOBAL_HEADER_SETTINGS_ID) => {
    setGlobalSelection(id);
    setSelectedId(null);
  };

  const handleAnnouncementBarChange = useCallback((patch: Partial<AnnouncementBarSettings>) => {
    setLayout(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        announcementBar: {
          ...extractAnnouncementBarFromTheme(prev.theme),
          ...patch,
        },
      },
    }));
  }, []);

  const handleHeaderSettingsChange = useCallback((patch: Partial<HeaderSettings>) => {
    setLayout(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        headerSettings: {
          ...extractHeaderSettingsFromTheme(prev.theme),
          ...patch,
        },
      },
    }));
  }, []);

  const handleDelete = (id: string) => {
    const section = layout.sections.find(s => s.id === id);
    const label = section ? blockLabel(section.type) : 'blok';
    if (!window.confirm(`Bu bloğu silmek istediğinize emin misiniz? (${label})`)) return;
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== id),
    }));
    setSelectedId(cur => {
      if (cur !== id) return cur;
      const remaining = layout.sections.filter(s => s.id !== id);
      return remaining[0]?.id ?? null;
    });
  };

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(s => (s.id === id ? { ...s, enabled } : s)),
    }));
  };

  const handleSettingsChange = useCallback((sectionId: string, patch: Record<string, unknown>) => {
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, settings: { ...section.settings, ...patch } }
          : section,
      ),
    }));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLayout(prev => {
      const oldIndex = prev.sections.findIndex(s => s.id === active.id);
      const newIndex = prev.sections.findIndex(s => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return { ...prev, sections: arrayMove(prev.sections, oldIndex, newIndex) };
    });
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
        <p className="text-[14px]">Vitrin tasarım editörü yükleniyor…</p>
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
    <div className="-m-5 md:-m-6 flex flex-col h-[calc(100vh-7.5rem)] min-h-[640px] max-h-[calc(100vh-5rem)] overflow-hidden bg-slate-100/80">
      {/* Builder header */}
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 md:px-5 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:flex w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 items-center justify-center shrink-0">
            <LayoutTemplate className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-slate-900 truncate">Vitrin Tasarım Editörü</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-slate-500">
              <span>
                Durum:{' '}
                <span className="font-medium text-slate-700">{statusLabel(meta.status)}</span>
              </span>
              <span className="hidden sm:inline text-slate-300">·</span>
              <span className="hidden sm:inline">
                Son yayın:{' '}
                <span className="font-medium text-slate-700">
                  {meta.hasPublished ? formatBuilderDate(meta.publishedAt) : 'Henüz yayınlanmadı'}
                </span>
              </span>
              {dirty && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden />
                    Kaydedilmemiş değişiklik
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {storefrontUrl ? (
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Vitrini Görüntüle
            </a>
          ) : (
            <button
              type="button"
              disabled
              title="Vitrin slug tanımlı değil"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[12px] font-medium text-slate-400 cursor-not-allowed"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Vitrini Görüntüle
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || publishing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Taslağı Kaydet
          </button>
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={saving || publishing || layout.sections.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[12px] font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Yayına Al
          </button>
        </div>
      </header>

      {(actionError || unknownTypes.length > 0) && (
        <div className="shrink-0 px-4 py-2 space-y-1.5 border-b border-slate-200 bg-white">
          {actionError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}
          {unknownTypes.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              {unknownTypes.length} bilinmeyen blok tipi var. Kaydedilebilir; vitrin renderında sorun çıkabilir.
            </div>
          )}
        </div>
      )}

      {/* 3-column workspace */}
      <div className="flex-1 min-h-0 flex flex-col xl:flex-row overflow-hidden">
        <aside className="shrink-0 xl:w-[280px] border-b xl:border-b-0 xl:border-r border-slate-200 bg-white max-h-[240px] xl:max-h-none xl:h-full overflow-hidden">
          <BlockLibraryPanel
            onAddBlock={handleAddBlock}
            onSelectGlobal={handleSelectGlobal}
            selectedGlobalId={globalSelection}
          />
        </aside>

        <main className="flex-1 min-w-0 min-h-0 order-3 xl:order-none h-[50vh] xl:h-full border-b xl:border-b-0 xl:border-r border-slate-200">
          <BuilderCenterWorkspace
            layout={layout}
            selectedId={selectedId}
            selectedSection={selectedSection}
            onSelect={handleSelectSection}
            onEdit={handleSelectSection}
            onDelete={handleDelete}
            onToggleEnabled={handleToggleEnabled}
            onDragEnd={handleDragEnd}
            tenantSlug={storefrontSlug}
            announcementBar={announcementBar}
            headerSettings={headerSettings}
            globalSelection={globalSelection}
          />
        </main>

        <aside className="shrink-0 w-full xl:w-[480px] min-h-[280px] xl:min-h-0 xl:h-full overflow-hidden bg-white order-2 xl:order-none">
          <BuilderSettingsSidebar
            section={selectedSection}
            globalSelection={globalSelection}
            announcementBar={announcementBar}
            headerSettings={headerSettings}
            onChange={patch => selectedSection && handleSettingsChange(selectedSection.id, patch)}
            onAnnouncementBarChange={handleAnnouncementBarChange}
            onHeaderSettingsChange={handleHeaderSettingsChange}
            onDelete={() => selectedSection && handleDelete(selectedSection.id)}
            onToggleEnabled={enabled => selectedSection && handleToggleEnabled(selectedSection.id, enabled)}
          />
        </aside>
      </div>
    </div>
  );
}
