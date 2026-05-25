/**
 * XML Import — Production Level
 * 3-step wizard: Upload → Field Mapping → Import Results
 * Supports both file upload and URL-based import
 */

import React, { useRef, useState, useCallback } from 'react';
import apiClient from '../services/apiClient';
import toast from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import XmlImportSavedPanel, { type XmlSourceRow } from '../components/xml/XmlImportSavedPanel';

/** Ödeme / abonelik (dashboard) ve genel plan seçimi (public) */
const UPGRADE_BILLING_HREF = '/dashboard/billing';
const UPGRADE_PLANS_HREF   = '/plans';
import { refreshOnboardingUserInStore } from '../utils/onboardingClient';
import XmlMappingEditor from '../components/xml/XmlMappingEditor';
import {
  buildCustomTargetLabels,
  buildMappingWithAutoSuggest,
  normalizeMappingForImport,
  resolveTargetLabel,
  validateMappingForImport,
} from '../utils/xmlMapping';

// ── Types ──────────────────────────────────────────────────────────────────

type DuplicateMode  = 'skip' | 'update' | 'error';
type SourceMode     = 'file' | 'url';
type ImportPageMode = 'new' | 'saved';

function defaultSourceNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') || 'XML Kaynağı';
  } catch {
    return 'XML Kaynağı';
  }
}

function defaultSourceNameFromFile(filename: string): string {
  return filename.replace(/\.xml$/i, '').trim() || 'XML Dosyası';
}

function isHttpFeedUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function buildPersistSourceUrl(params: {
  sourceMode: SourceMode;
  sourceUrl: string;
  file: File | null;
  editingSourceId: string | null;
}): string {
  const trimmed = params.sourceUrl.trim();
  if (params.sourceMode === 'url') {
    return trimmed;
  }
  if (isHttpFeedUrl(trimmed)) return trimmed;
  const key = params.editingSourceId ?? crypto.randomUUID();
  const label = encodeURIComponent(params.file?.name ?? 'feed.xml');
  return `file-local://${key}/${label}`;
}

function customTargetsFromStored(
  customTargets?: TargetField[],
  labels?: Record<string, string>,
): TargetField[] {
  if (customTargets?.length) return customTargets;
  if (labels && Object.keys(labels).length > 0) {
    return Object.entries(labels).map(([key, label]) => ({ key, label }));
  }
  return [];
}

interface TargetField { key: string; label: string; required?: boolean }

interface ProductQuotaPreview {
  plan:            string;
  current:         number;
  max:             number;
  unlimited:       boolean;
  remainingSlots:  number | null;
  usagePercent:    number;
}

interface PreviewData {
  totalRows:        number;
  xmlFields:        string[];
  sampleRows:       Record<string, string>[];
  mapping?:         Record<string, string>;
  targetFields:     TargetField[];
  filename:         string;
  fileSizeBytes:    number;
  sourceUrl?:       string;
  xmlFormat?:       'wordpress' | 'standard';
  productQuota?:    ProductQuotaPreview;
}

interface ImportRowResult {
  row:     number;
  name:    string;
  barcode: string;
  status:  'imported' | 'updated' | 'skipped' | 'error';
  errors?: string[];
}

interface ImportSummary {
  total:              number;
  imported:           number;
  updated:            number;
  skipped:            number;
  failed:             number;
  skippedPlanLimit?:  number;
  reason?:            'PLAN_LIMIT';
}

interface ImportResult {
  summary: ImportSummary;
  results: ImportRowResult[];
}

interface ImportProgress {
  current:  number;
  total:    number;
  name:     string;
  status:   ImportRowResult['status'];
  imported: number;
  updated:  number;
  skipped:  number;
  failed:   number;
}

interface ImportLog {
  id:          string;
  filename:    string;
  status:      string;
  totalRows:   number;
  successRows: number;
  failedRows:  number;
  startedAt:   string;
  completedAt: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function downloadErrorReport(results: ImportRowResult[]) {
  const errors = results.filter(r => r.status === 'error');
  const lines  = ['Satır,Ürün Adı,Barkod,Hatalar'];
  for (const r of errors) {
    const errs = (r.errors ?? []).join(' | ').replace(/"/g, '""');
    lines.push(`${r.row},"${r.name}","${r.barcode}","${errs}"`);
  }
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'xml-import-errors.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Step indicator ─────────────────────────────────────────────────────────

const STEPS = ['Dosya / URL Seç', 'Alan Eşleştirme', 'Sonuçlar'] as const;

function StepIndicator({ current, importing }: { current: 0 | 1 | 2; importing?: boolean }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const isActive    = i === current;
        const isProcessing = isActive && i === 1 && importing;
        const isDone      = i < current;
        return (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                isDone        ? 'bg-indigo-600 text-white' :
                isProcessing  ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                isActive      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                'bg-gray-100 text-gray-400'
              }`}>
                {isDone
                  ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                  : isProcessing
                    ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                    : i + 1
                }
              </div>
              <span className={`text-sm font-medium hidden sm:block ${i <= current ? 'text-gray-900' : 'text-gray-400'}`}>
                {isProcessing ? 'İçe Aktarılıyor…' : label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 ${i < current ? 'bg-indigo-600' : 'bg-gray-200'}`}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Üst mod: yeni XML / kayıtlı XML ─────────────────────────────────────────

function PageModeTabs({
  mode,
  onChange,
  disabled,
}: {
  mode:     ImportPageMode;
  onChange: (m: ImportPageMode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-full max-w-md">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('new')}
        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          mode === 'new' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
        } disabled:opacity-50`}
      >
        Yeni XML ekle
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('saved')}
        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          mode === 'saved' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
        } disabled:opacity-50`}
      >
        Kayıtlı XML kullan
      </button>
    </div>
  );
}

// ── Step 1: Upload (file + URL tabs) ───────────────────────────────────────

function UploadStep({
  onPreviewFile,
  onPreviewUrl,
  history,
}: {
  onPreviewFile: (file: File) => Promise<void>;
  onPreviewUrl:  (url: string) => Promise<void>;
  history:       ImportLog[];
}) {
  const inputRef                  = useRef<HTMLInputElement>(null);
  const [mode, setMode]           = useState<SourceMode>('file');
  const [file, setFile]           = useState<File | null>(null);
  const [urlValue, setUrlValue]   = useState('');
  const [dragging, setDragging]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [urlError, setUrlError]   = useState('');

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.xml')) {
      toast.error('Yalnızca .xml dosyaları kabul edilir.'); return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error('Dosya 20 MB\'dan büyük olamaz.'); return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      if (mode === 'file') {
        if (!file) { toast.error('Lütfen bir XML dosyası seçin.'); setLoading(false); return; }
        await onPreviewFile(file);
      } else {
        const trimmed = urlValue.trim();
        if (!trimmed) { setUrlError('URL boş olamaz.'); setLoading(false); return; }
        if (!/^https?:\/\/.+/.test(trimmed)) { setUrlError('Geçerli bir http(s) URL girin.'); setLoading(false); return; }
        setUrlError('');
        await onPreviewUrl(trimmed);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? err.message ?? 'Hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'file' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            Dosyadan Yükle
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'url' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            URL'den Yükle
          </span>
        </button>
      </div>

      {/* File mode */}
      {mode === 'file' && (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            dragging
              ? 'border-indigo-400 bg-indigo-50'
              : file
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/30'
          }`}
        >
          <input ref={inputRef} type="file" accept=".xml,text/xml,application/xml"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            className="hidden"/>

          {file ? (
            <div className="space-y-2">
              <div className="mx-auto w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <p className="font-semibold text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">{fmtBytes(file.size)}</p>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setFile(null); }}
                className="text-xs text-red-500 hover:underline mt-1"
              >
                Dosyayı Kaldır
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mx-auto w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800">XML dosyasını buraya sürükleyin</p>
                <p className="text-sm text-gray-500 mt-0.5">veya tıklayarak seçin — maks. 20 MB</p>
              </div>
              <p className="text-xs text-gray-400">Desteklenen format: .xml</p>
            </div>
          )}
        </div>
      )}

      {/* URL mode */}
      {mode === 'url' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">XML Dosyasının URL'si</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                </svg>
              </div>
              <input
                type="url"
                value={urlValue}
                onChange={e => { setUrlValue(e.target.value); setUrlError(''); }}
                placeholder="https://example.com/products.xml"
                className={`w-full pl-9 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${urlError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}
              />
            </div>
          </div>
          {urlError && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              {urlError}
            </p>
          )}
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-1.5">
            <p className="text-xs font-semibold text-blue-800">URL İle İçe Aktarma</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>URL'nin herkese açık (public) erişilebilir olması gerekir</li>
              <li>Yalnızca <code className="bg-blue-100 px-1 rounded">http://</code> ve <code className="bg-blue-100 px-1 rounded">https://</code> desteklenir</li>
              <li>Maksimum dosya boyutu: 30 MB</li>
              <li>Tedarikçi XML feed'leri, Google Merchant XML vb. desteklenir</li>
            </ul>
          </div>
        </div>
      )}

      {/* Info box (file mode) */}
      {mode === 'file' && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-1.5">
          <p className="text-sm font-semibold text-blue-800">XML Formatı Hakkında</p>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li>Her ürün bir XML elementi olmalı (örn. <code className="bg-blue-100 px-1 rounded">&lt;Product&gt;</code>)</li>
            <li>Zorunlu alanlar: Ürün adı ve satış fiyatı</li>
            <li>Bir sonraki adımda XML alanlarını ürün alanlarıyla eşleştireceksiniz</li>
            <li>Barkod tabanlı duplicate kontrolü yapılır</li>
          </ul>
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 space-y-3">
          <p className="text-sm font-semibold text-indigo-900 text-center">
            {mode === 'file' ? 'XML dosyanız sunucuda okunuyor ve analiz ediliyor…' : 'XML içeriği URL üzerinden alınıyor…'}
          </p>
          <div
            className="h-2.5 w-full rounded-full overflow-hidden bg-indigo-100"
            role="progressbar"
            aria-valuetext="İşleniyor"
            aria-busy="true"
          >
            <div
              className="h-full w-full rounded-full bg-gradient-to-r from-indigo-200 via-indigo-500 to-indigo-200 bg-[length:200%_100%] animate-shimmer"
            />
          </div>
          <p className="text-xs text-center text-indigo-700/75">
            İlerleme çubuğu belirsiz moddadır; dosya boyutuna göre süre değişir
          </p>
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={(mode === 'file' && !file) || loading}
        className="w-full py-3 font-semibold text-white bg-indigo-600 hover:bg-indigo-700
                   rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading && (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        )}
        {loading
          ? (mode === 'file' ? 'Dosya analiz ediliyor…' : 'URL içeriği alınıyor…')
          : 'Analiz Et →'}
      </button>

      {/* Import history */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Son İçe Aktarmalar</h3>
          <div className="space-y-2">
            {history.slice(0, 5).map(log => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{log.filename}</p>
                  <p className="text-xs text-gray-400">{fmtDate(log.startedAt)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <div className="text-right text-xs">
                    <p className="text-emerald-600 font-medium">{log.successRows} başarılı</p>
                    {log.failedRows > 0 && <p className="text-red-500">{log.failedRows} hatalı</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    log.status === 'success' ? 'bg-green-100 text-green-700' :
                    log.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {log.status === 'success' ? 'Başarılı' : log.status === 'partial' ? 'Kısmi' : 'Başarısız'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 2: Field Mapping ──────────────────────────────────────────────────

function MappingStep({
  preview,
  mapping,
  setMapping,
  customTargets,
  setCustomTargets,
  duplicateMode,
  setDuplicateMode,
  skipZeroStock,
  setSkipZeroStock,
  sourceMode,
  saveAsSource,
  setSaveAsSource,
  sourceName,
  setSourceName,
  sourceUrl,
  setSourceUrl,
  editingSourceId,
  onSaveSource,
  onImport,
  onBack,
}: {
  preview:            PreviewData;
  mapping:            Record<string, string>;
  setMapping:         React.Dispatch<React.SetStateAction<Record<string, string>>>;
  customTargets:      TargetField[];
  setCustomTargets:   React.Dispatch<React.SetStateAction<TargetField[]>>;
  duplicateMode:      DuplicateMode;
  setDuplicateMode:   React.Dispatch<React.SetStateAction<DuplicateMode>>;
  skipZeroStock:      boolean;
  setSkipZeroStock:   React.Dispatch<React.SetStateAction<boolean>>;
  sourceMode:         SourceMode;
  saveAsSource:       boolean;
  setSaveAsSource:    React.Dispatch<React.SetStateAction<boolean>>;
  sourceName:         string;
  setSourceName:      React.Dispatch<React.SetStateAction<string>>;
  sourceUrl:          string;
  setSourceUrl:       React.Dispatch<React.SetStateAction<string>>;
  editingSourceId:    string | null;
  file:               File | null;
  onSaveSource:       () => Promise<void>;
  onImport:           () => Promise<void>;
  onBack:             () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [savingSource, setSavingSource] = useState(false);

  const handleImport = async () => {
    const err = validateMappingForImport(mapping);
    if (err) {
      toast.error(err);
      return;
    }
    setLoading(true);
    try { await onImport(); }
    catch (e: unknown) {
      const ex = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(ex?.response?.data?.error ?? ex?.message ?? 'Import hatası.');
    }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    const err = validateMappingForImport(mapping);
    if (err) {
      toast.error(err);
      return;
    }
    setSavingSource(true);
    try {
      await onSaveSource();
    } catch {
      /* onSaveSource toasts */
    } finally {
      setSavingSource(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Source info + stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-blue-50 rounded-xl text-center">
          <p className="text-xl font-bold text-blue-700">{preview.totalRows}</p>
          <p className="text-xs text-blue-600 mt-0.5">Toplam Ürün</p>
        </div>
        <div className="p-3 bg-purple-50 rounded-xl text-center">
          <p className="text-xl font-bold text-purple-700">{preview.xmlFields.length}</p>
          <p className="text-xs text-purple-600 mt-0.5">XML Alanı</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-xl text-center">
          <p className="text-sm font-bold text-gray-700 truncate">{fmtBytes(preview.fileSizeBytes)}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-full">{preview.filename}</p>
        </div>
      </div>

      {preview.sourceUrl && (
        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <span className="truncate">Kaynak URL: {preview.sourceUrl}</span>
        </div>
      )}

      {/* Format-specific notice */}
      {preview.productQuota && !preview.productQuota.unlimited
        && preview.productQuota.remainingSlots != null
        && preview.totalRows > preview.productQuota.remainingSlots && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-amber-700 font-bold text-sm">!</div>
          <div>
            <p className="text-sm font-semibold text-amber-900">Plan ürün kotası</p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Bu dosyada <strong>{preview.totalRows}</strong> kayıt var; planda kalan yeni ürün kotanız{' '}
              <strong>{preview.productQuota.remainingSlots}</strong>. Kotayı aşan satırlar içe aktarılmadan{' '}
              <strong>atlanır</strong>.
            </p>
            <p className="text-xs text-amber-900 mt-2">
              <Link
                to={UPGRADE_BILLING_HREF}
                className="font-semibold text-amber-950 underline underline-offset-2 hover:no-underline"
              >
                Devam etmek için plan yükseltin
              </Link>
              {' · '}
              <Link to={UPGRADE_PLANS_HREF} className="text-amber-900/90 underline underline-offset-2 hover:no-underline">
                Planları incele
              </Link>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to={UPGRADE_BILLING_HREF}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Planı Yükselt
              </Link>
            </div>
          </div>
        </div>
      )}

      {preview.xmlFormat === 'wordpress' && (
        <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-900">WordPress / WooCommerce XML tespit edildi</p>
            <p className="text-xs text-purple-700 mt-1 leading-relaxed">
              WooCommerce ürün kayıtları algılandı. Alan eşleştirmesini siz yapacaksınız.
              Yalnızca <strong>wp:post_type = product</strong> kayıtları içe aktarılır.
            </p>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Alan Eşleştirme</h3>
        <XmlMappingEditor
          xmlFields={preview.xmlFields}
          sampleRows={preview.sampleRows}
          mapping={mapping}
          setMapping={setMapping}
          customTargets={customTargets}
          setCustomTargets={setCustomTargets}
        />
      </div>

      {/* Preview table */}
      {preview.sampleRows.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Önizleme
            <span className="text-gray-400 font-normal text-xs ml-2">— ilk {preview.sampleRows.length} kayıt</span>
          </h3>
          <div className="border border-gray-200 rounded-xl overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">#</th>
                  {Object.entries(mapping)
                    .filter(([, target]) => target && target !== '__ignore__')
                    .map(([xmlField, target]) => {
                      const label = resolveTargetLabel(target, customTargets);
                      return <th key={xmlField} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{label}</th>;
                    })}
                </tr>
              </thead>
              <tbody>
                {preview.sampleRows.map((row, ri) => (
                  <tr key={ri} className={`border-b border-gray-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-3 py-2 text-gray-400">{ri + 1}</td>
                    {Object.entries(mapping)
                      .filter(([, target]) => target && target !== '__ignore__')
                      .map(([xmlField, target]) => {
                        const val = row[xmlField];
                        // Match image URLs: explicit extension OR common CDN/upload patterns
                        const isImg = target === 'imageUrl' && !!val && (
                          /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)(\?.*)?$/i.test(val) ||
                          /^https?:\/\/.+\/(upload|uploads?|images?|media|photos?|cdn)\/.+/i.test(val)
                        );
                        return (
                          <td key={xmlField} className="px-3 py-2 text-gray-700 max-w-[180px]">
                            {isImg
                              ? (
                                <div className="flex items-center gap-2">
                                  <img
                                    src={val}
                                    alt=""
                                    className="h-10 w-10 rounded object-cover border border-gray-200 flex-shrink-0"
                                    onError={e => {
                                      const img = e.target as HTMLImageElement;
                                      img.style.display = 'none';
                                      // Show fallback icon next to URL when image fails
                                      const parent = img.parentElement;
                                      if (parent && !parent.querySelector('.img-fallback')) {
                                        const span = document.createElement('span');
                                        span.className = 'img-fallback text-gray-300 text-lg';
                                        span.title = val ?? '';
                                        span.textContent = '🖼️';
                                        parent.insertBefore(span, parent.firstChild);
                                      }
                                    }}
                                  />
                                  <span className="truncate text-xs text-gray-400 max-w-[100px]" title={val}>{val}</span>
                                </div>
                              )
                              : val
                                ? <span className="truncate block">{val}</span>
                                : <span className="text-gray-300">—</span>
                            }
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-indigo-950">
            {editingSourceId ? 'Kayıtlı XML kaydını güncelle' : 'Kayıtlı XML olarak sakla'}
          </p>
          <p className="text-xs text-indigo-800/80 mt-0.5">
            Eşleştirme kaydedilir; &quot;Kayıtlı XML kullan&quot; sekmesinden tekrar açabilirsiniz.
            {sourceMode === 'file' && ' Dosya kaynaklarında otomatik çekim için isteğe bağlı feed URL\'si ekleyebilirsiniz.'}
          </p>
        </div>
        <input
          type="text"
          value={sourceName}
          onChange={e => setSourceName(e.target.value)}
          placeholder="Kaynak adı (örn. WooCommerce ürün feed’i)"
          className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-white"
        />
        {sourceMode === 'url' ? (
          <p className="text-xs text-indigo-900/70 truncate" title={sourceUrl}>
            Feed URL: {sourceUrl || '—'}
          </p>
        ) : (
          <input
            type="url"
            value={isHttpFeedUrl(sourceUrl) ? sourceUrl : ''}
            onChange={e => setSourceUrl(e.target.value)}
            placeholder="İsteğe bağlı: https://… feed URL (otomatik güncelleme için)"
            className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-white"
          />
        )}
        <label className="flex items-center gap-2 text-xs text-indigo-900 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={saveAsSource}
            onChange={e => setSaveAsSource(e.target.checked)}
            className="w-4 h-4 accent-indigo-600"
          />
          İçe aktarırken de bu kaydı güncelle
        </label>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={savingSource || loading}
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-indigo-700 bg-white border-2 border-indigo-300
                     rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {savingSource && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          )}
          {savingSource ? 'Kaydediliyor…' : editingSourceId ? 'Kaydı Güncelle' : 'Kaydet'}
        </button>
      </div>

      {/* Duplicate handling */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Tekrar Eden Ürün Kontrolü (Barkod / SKU)</h3>
        <div className="grid grid-cols-3 gap-3">
          {([
            { value: 'skip',   label: 'Atla',     desc: 'Mevcut ürünü değiştirmez, yeni kayıt oluşturmaz', color: 'border-blue-400 bg-blue-50' },
            { value: 'update', label: 'Güncelle', desc: 'Mevcut ürünün fiyat, stok ve bilgilerini günceller', color: 'border-amber-400 bg-amber-50' },
            { value: 'error',  label: 'Hata Ver', desc: 'Çakışan kayıtlar hata olarak raporlanır', color: 'border-red-400 bg-red-50' },
          ] as Array<{ value: DuplicateMode; label: string; desc: string; color: string }>).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDuplicateMode(opt.value)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                duplicateMode === opt.value ? opt.color : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                  duplicateMode === opt.value ? 'border-current' : 'border-gray-300'
                }`}>
                  {duplicateMode === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-current"/>}
                </div>
                <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Skip zero-stock option */}
      <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 cursor-pointer transition-colors select-none">
        <input
          type="checkbox"
          checked={skipZeroStock}
          onChange={e => setSkipZeroStock(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0"
        />
        <div>
          <p className="text-sm font-semibold text-gray-800">Stok miktarı 0 olan ürünleri içe aktarma</p>
          <p className="text-xs text-gray-500 mt-0.5">XML'de stok alanı eşlenmiş ve değeri 0 olan satırlar atlanır, sisteme eklenmez.</p>
        </div>
      </label>

      <div className="flex gap-3">
        <button
          type="button" onClick={onBack}
          className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          ← Geri
        </button>
        <button
          type="button" onClick={() => void handleImport()}
          disabled={loading || savingSource}
          className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700
                     rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          )}
          {loading ? `${preview.totalRows} ürün içe aktarılıyor…` : `${preview.totalRows} Ürünü İçe Aktar →`}
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Results ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ImportRowResult['status'] }) {
  const MAP = {
    imported: { label: 'Eklendi',     cls: 'bg-green-50 text-green-700 border-green-200' },
    updated:  { label: 'Güncellendi', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    skipped:  { label: 'Atlandı',     cls: 'bg-gray-50 text-gray-500 border-gray-200'   },
    error:    { label: 'Hata',        cls: 'bg-red-50 text-red-600 border-red-200'       },
  };
  const { label, cls } = MAP[status];
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${cls}`}>{label}</span>;
}

function ResultsStep({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  const { summary, results } = result;
  const [filterStatus, setFilterStatus] = useState<ImportRowResult['status'] | 'all'>('all');
  const [page, setPage]                 = useState(1);
  const PAGE_SIZE   = 50;
  const filtered    = filterStatus === 'all' ? results : results.filter(r => r.status === filterStatus);
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const allSuccess  = summary.failed === 0;

  return (
    <div className="space-y-6">
      <div className={`p-5 rounded-2xl border ${allSuccess ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3 mb-3">
          {allSuccess
            ? <svg className="w-7 h-7 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            : <svg className="w-7 h-7 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          }
          <div>
            <p className={`font-bold text-lg ${allSuccess ? 'text-emerald-800' : 'text-amber-800'}`}>
              {allSuccess ? 'İçe aktarma tamamlandı!' : 'İçe aktarma kısmen tamamlandı'}
            </p>
            <p className={`text-sm ${allSuccess ? 'text-emerald-700' : 'text-amber-700'}`}>
              {summary.total} kayıt işlendi
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Eklendi',     value: summary.imported, color: 'text-green-700 bg-green-100' },
            { label: 'Güncellendi', value: summary.updated,  color: 'text-amber-700 bg-amber-100' },
            { label: 'Atlandı',     value: summary.skipped,  color: 'text-gray-600 bg-gray-100'   },
            { label: 'Hata',        value: summary.failed,   color: 'text-red-700 bg-red-100'      },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
              <p className="text-2xl font-black">{s.value}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {((summary.skippedPlanLimit ?? 0) > 0 || summary.reason === 'PLAN_LIMIT') && (
          <div className="mt-4 space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
            {(summary.skippedPlanLimit ?? 0) > 0 ? (
              <p className="text-base font-semibold leading-snug">
                <span className="text-indigo-700 tabular-nums">{summary.skippedPlanLimit}</span>
                {' '}
                ürün daha yüklemek için plan yükseltin.
              </p>
            ) : (
              <p className="text-base font-semibold">Plan limitiniz doldu; kalan ürünler içe aktarılamadı.</p>
            )}
            {summary.imported > 0 && (
              <p className="text-indigo-800/90">
                Bu içe aktarmada <strong className="tabular-nums">{summary.imported}</strong> yeni ürün eklendi.
              </p>
            )}
            <p className="text-indigo-800">
              <Link
                to={UPGRADE_BILLING_HREF}
                className="font-semibold text-indigo-700 underline decoration-2 underline-offset-2 hover:text-indigo-900"
              >
                Devam etmek için plan yükseltin
              </Link>
              <span className="text-indigo-400"> · </span>
              <Link
                to={UPGRADE_PLANS_HREF}
                className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-900"
              >
                Tüm planları gör
              </Link>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                to={UPGRADE_BILLING_HREF}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Planı Yükselt
              </Link>
              <Link
                to={UPGRADE_PLANS_HREF}
                className="inline-flex items-center justify-center rounded-xl border border-indigo-300 bg-white px-4 py-2.5 text-sm font-medium text-indigo-800 transition hover:bg-indigo-100/80"
              >
                Planları karşılaştır
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {summary.failed > 0 && (
          <button
            onClick={() => downloadErrorReport(results)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600
                       border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Hata Raporunu İndir ({summary.failed} satır)
          </button>
        )}
        <Link
          to="/dashboard/products"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white
                     bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
        >
          Ürünlere Git
        </Link>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600
                     border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Yeni İçe Aktarma
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Kayıt Detayları</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Filtrele:</span>
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value as any); setPage(1); }}
              className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
            >
              <option value="all">Tümü ({results.length})</option>
              {summary.imported > 0 && <option value="imported">Eklendi ({summary.imported})</option>}
              {summary.updated  > 0 && <option value="updated">Güncellendi ({summary.updated})</option>}
              {summary.skipped  > 0 && <option value="skipped">Atlandı ({summary.skipped})</option>}
              {summary.failed   > 0 && <option value="error">Hata ({summary.failed})</option>}
            </select>
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-16">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Ürün Adı</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Barkod</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Mesaj</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r, i) => (
                <tr key={r.row} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                  <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{r.row}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[200px] truncate">{r.name || '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.barcode || '—'}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={r.status}/></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[300px]">
                    {r.status === 'error' && r.errors
                      ? <span className="text-red-500">{r.errors.join(' • ')}</span>
                      : r.status === 'skipped' && r.errors
                        ? r.errors[0]
                        : null
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 px-1">
            <span className="text-xs text-gray-500">{filtered.length} kayıt</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40">‹</button>
              <span className="px-3 py-1.5 text-xs font-medium text-gray-700">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40">›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Export button ───────────────────────────────────────────────────────────

function ExportButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/products/export/xml', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/xml;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `woontegra-products-${new Date().toISOString().slice(0, 10)}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('XML dosyası indirildi.');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Export başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
      )}
      {loading ? 'İndiriliyor…' : 'XML Dışa Aktar'}
    </button>
  );
}

// ── Processing step (progress bar) ────────────────────────────────────────

function ProcessingStep({ progress, onCancel }: { progress: ImportProgress; onCancel: () => void }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const stats = [
    { label: 'Eklendi',     value: progress.imported, bg: 'bg-green-50', text: 'text-green-700',  border: 'border-green-200' },
    { label: 'Güncellendi', value: progress.updated,  bg: 'bg-amber-50', text: 'text-amber-700',  border: 'border-amber-200' },
    { label: 'Atlandı',     value: progress.skipped,  bg: 'bg-gray-50',  text: 'text-gray-600',   border: 'border-gray-200' },
    { label: 'Hata',        value: progress.failed,   bg: 'bg-red-50',   text: 'text-red-600',    border: 'border-red-200' },
  ];

  return (
    <div className="py-6 space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{progress.total} Ürün İçe Aktarılıyor</h2>
        <p className="text-sm text-gray-500 mt-1">Lütfen bekleyin, sayfayı kapatmayın</p>
        <p className="text-xs text-gray-400 mt-1">Şimdiye kadar {progress.imported} eklendi, {progress.updated} güncellendi</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">{progress.current} / {progress.total} ürün işlendi</span>
          <span className="text-lg font-black text-indigo-600">%{pct}</span>
        </div>
        <div className="h-5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>0</span>
          <span>{progress.total}</span>
        </div>
      </div>

      {/* Current product name */}
      {progress.name && (
        <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
          <svg className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div className="min-w-0">
            <p className="text-xs text-indigo-500 font-medium mb-0.5">Şu an işleniyor</p>
            <p className="text-sm font-semibold text-indigo-900 truncate">{progress.name}</p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`p-4 rounded-xl border ${s.bg} ${s.border} text-center`}>
            <p className={`text-2xl font-black ${s.text}`}>{s.value}</p>
            <p className={`text-xs font-medium mt-1 ${s.text}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Estimated time hint */}
      {progress.current > 0 && progress.current < progress.total && (
        <p className="text-center text-xs text-gray-400">
          Bu işlem ürün sayısına bağlı olarak birkaç dakika sürebilir
        </p>
      )}

      {/* Cancel button */}
      <div className="flex justify-center pt-2">
        {confirmCancel ? (
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700 font-medium">İçe aktarma iptal edilsin mi?</p>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
            >
              Evet, durdur
            </button>
            <button
              onClick={() => setConfirmCancel(false)}
              className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium"
            >
              Devam et
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmCancel(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:border-red-300 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-xl text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
            İçe Aktarmayı Durdur
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function XmlImport() {
  const [searchParams, setSearchParams]     = useSearchParams();
  const [pageMode,       setPageMode]       = useState<ImportPageMode>(
    searchParams.get('mode') === 'saved' ? 'saved' : 'new',
  );
  const [step,           setStep]           = useState<0 | 1 | 2>(0);
  const [sourceMode,     setSourceMode]     = useState<SourceMode>('file');
  const [sourceUrl,      setSourceUrl]      = useState<string>('');
  const [file,           setFile]           = useState<File | null>(null);
  const [preview,        setPreview]        = useState<PreviewData | null>(null);
  const [mapping,        setMapping]        = useState<Record<string, string>>({});
  const [customTargets,  setCustomTargets]  = useState<TargetField[]>([]);
  const [duplicateMode,  setDuplicateMode]  = useState<DuplicateMode>('update');
  const [skipZeroStock,  setSkipZeroStock]  = useState<boolean>(false);
  const [saveAsSource,   setSaveAsSource]   = useState(true);
  const [sourceName,     setSourceName]     = useState('');
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [savedListRefreshKey, setSavedListRefreshKey] = useState(0);
  const [importResult,   setImportResult]   = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [history,        setHistory]        = useState<ImportLog[]>([]);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const setPageModeAndUrl = useCallback((mode: ImportPageMode) => {
    setPageMode(mode);
    if (mode === 'saved') {
      setSearchParams({ mode: 'saved' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams]);

  const persistXmlSource = useCallback(async (opts?: { force?: boolean }) => {
    if (!preview) return;
    if (!opts?.force && !saveAsSource) return;

    const mapErr = validateMappingForImport(mapping);
    if (mapErr) {
      toast.error(mapErr);
      throw new Error(mapErr);
    }

    const persistUrl = buildPersistSourceUrl({
      sourceMode,
      sourceUrl,
      file,
      editingSourceId,
    });

    if (sourceMode === 'url' && !isHttpFeedUrl(persistUrl)) {
      const msg = 'Geçerli bir feed URL\'si girin (https://…).';
      toast.error(msg);
      throw new Error(msg);
    }

    const name =
      sourceName.trim() ||
      (sourceMode === 'url'
        ? defaultSourceNameFromUrl(sourceUrl)
        : defaultSourceNameFromFile(file?.name ?? preview.filename ?? 'XML'));

    const mappingJson = normalizeMappingForImport(mapping, preview.xmlFields);
    const payload = {
      name,
      url:                 persistUrl,
      mappingJson,
      customTargetLabels:  buildCustomTargetLabels(customTargets),
      customTargets,
      duplicateMode,
      skipZeroStock,
      isActive:            true,
    };

    if (editingSourceId) {
      await apiClient.patch(`/xml-sources/${editingSourceId}`, payload, { skipErrorToast: true });
    } else {
      const r = await apiClient.post('/xml-sources', payload, { skipErrorToast: true });
      const raw = r.data as { data?: { id?: string } };
      const id  = raw?.data?.id ?? (raw as { id?: string })?.id;
      if (id) setEditingSourceId(id);
    }

    setSavedListRefreshKey(k => k + 1);
  }, [
    saveAsSource, sourceMode, sourceUrl, sourceName, mapping, customTargets, preview,
    duplicateMode, skipZeroStock, editingSourceId, file,
  ]);

  const handleSaveSource = useCallback(async () => {
    try {
      await persistXmlSource({ force: true });
      setSaveAsSource(true);
      toast.success(
        editingSourceId
          ? 'Kayıtlı XML güncellendi. “Kayıtlı XML kullan” sekmesinde görünür.'
          : 'Eşleştirme kaydedildi. “Kayıtlı XML kullan” sekmesinden açabilirsiniz.',
        { duration: 5000 },
      );
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      const msg = err?.response?.data?.error ?? err?.message ?? 'Kayıt saklanamadı.';
      if (msg.includes('zaten kayıtlı')) {
        toast.error('Bu URL zaten kayıtlı. “Kayıtlı XML” sekmesinden düzenleyin.');
      } else {
        toast.error(msg);
      }
      throw e;
    }
  }, [persistXmlSource, editingSourceId]);

  // Load import history — NOTE: apiClient interceptor already unwraps .data.data → just use r.data
  React.useEffect(() => {
    apiClient.get('/products/import/history')
      .then(r => setHistory((r.data ?? []) as ImportLog[]))
      .catch(() => {});
  }, []);

  const refreshHistory = () => {
    apiClient.get('/products/import/history')
      .then(r => setHistory((r.data ?? []) as ImportLog[]))
      .catch(() => {});
  };

  // ── Step 1: analyze file ──────────────────────────────────────────────────
  const handlePreviewFile = useCallback(async (f: File) => {
    const formData = new FormData();
    formData.append('file', f);

    const res = await apiClient.post(
      '/products/import/xml/preview',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000 },
    );

    const raw  = res.data as any;
    const data = (raw?.data ?? raw) as PreviewData;
    if (!data?.xmlFields?.length) {
      throw new Error('Sunucu geçersiz yanıt döndü. Lütfen tekrar deneyin.');
    }
    setFile(f);
    setSourceMode('file');
    setSourceUrl('');
    setEditingSourceId(null);
    setSaveAsSource(true);
    setSourceName(defaultSourceNameFromFile(f.name));
    setPreview(data);
    setMapping(buildMappingWithAutoSuggest(data.xmlFields));
    setCustomTargets([]);
    setPageModeAndUrl('new');
    setStep(1);
  }, [setPageModeAndUrl]);

  // ── Step 1: analyze URL ───────────────────────────────────────────────────
  const handlePreviewUrl = useCallback(async (url: string) => {
    const res = await apiClient.post(
      '/products/import/xml/preview-url',
      { url },
      { timeout: 60_000 },
    );

    const raw  = res.data as any;
    const data = (raw?.data ?? raw) as PreviewData;
    if (!data?.xmlFields?.length) {
      throw new Error('Sunucu geçersiz yanıt döndü. Lütfen tekrar deneyin.');
    }
    setFile(null);
    setSourceMode('url');
    setSourceUrl(url);
    setEditingSourceId(null);
    setSaveAsSource(true);
    setSourceName(defaultSourceNameFromUrl(url));
    setDuplicateMode('update');
    setPreview(data);
    setMapping(buildMappingWithAutoSuggest(data.xmlFields));
    setCustomTargets([]);
    setPageModeAndUrl('new');
    setStep(1);
  }, [setPageModeAndUrl]);

  const handleEditSavedSource = useCallback(async (source: XmlSourceRow) => {
    try {
      const r = await apiClient.post(
        `/xml-sources/${source.id}/preview`,
        {},
        { skipErrorToast: true, timeout: 90_000 },
      );
      const raw  = r.data as { data?: Record<string, unknown> };
      const data = (raw?.data ?? raw) as PreviewData & {
        sourceId?: string;
        duplicateMode?: DuplicateMode;
        skipZeroStock?: boolean;
        customTargetLabels?: Record<string, string>;
        customTargets?: TargetField[];
      };
      if (!data?.xmlFields?.length) {
        throw new Error('Önizleme alınamadı.');
      }
      const stored =
        (data as { mappingJson?: Record<string, string> }).mappingJson ??
        data.mapping ??
        source.mappingJson;
      setEditingSourceId(source.id);
      setSourceMode('url');
      setSourceUrl(source.url);
      setSourceName(source.name);
      setSaveAsSource(true);
      setDuplicateMode(source.duplicateMode ?? 'update');
      setSkipZeroStock(source.skipZeroStock);
      setPreview(data);
      setMapping(buildMappingWithAutoSuggest(data.xmlFields, stored));
      setCustomTargets(
        customTargetsFromStored(
          data.customTargets ?? source.customTargets as TargetField[] | undefined,
          data.customTargetLabels ?? source.customTargetLabels,
        ),
      );
      setPageModeAndUrl('new');
      setStep(1);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err?.response?.data?.error ?? err?.message ?? 'Kaynak önizlemesi başarısız.');
    }
  }, [setPageModeAndUrl]);

  // ── Cancel import ─────────────────────────────────────────────────────────
  const handleCancelImport = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setImportProgress(null);
    toast('İçe aktarma iptal edildi.', { icon: '⚠️' });
  }, []);

  // ── Step 2: execute import (streaming with progress) ─────────────────────
  const handleImport = useCallback(async () => {
    if (!preview) throw new Error('Önizleme verisi bulunamadı.');

    if (saveAsSource) {
      try {
        await persistXmlSource({ force: true });
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string };
        const msg = err?.response?.data?.error ?? err?.message ?? 'Kayıt saklanamadı.';
        if (msg.includes('zaten kayıtlı')) {
          toast.error('Bu URL zaten kayıtlı. “Kayıtlı XML” sekmesinden düzenleyin veya farklı URL kullanın.');
        } else {
          toast.error(msg);
        }
        throw e;
      }
    }

    // Initialize progress before fetch so UI switches immediately
    setImportProgress({
      current: 0, total: preview.totalRows,
      name: '', status: 'imported',
      imported: 0, updated: 0, skipped: 0, failed: 0,
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api';
    const token   = localStorage.getItem('token') ?? '';
    const customTargetLabels = buildCustomTargetLabels(customTargets);
    const normalizedMapping = normalizeMappingForImport(mapping, preview.xmlFields);

    let endpoint: string;
    let fetchInit: RequestInit;

    if (sourceMode === 'url') {
      endpoint  = `${baseUrl}/products/import/xml/stream-url`;
      fetchInit = {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({
          url: sourceUrl, mapping: normalizedMapping, duplicateMode, skipZeroStock, customTargetLabels,
        }),
        signal:  controller.signal,
      };
    } else {
      if (!file) throw new Error('Dosya bulunamadı.');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(normalizedMapping));
      formData.append('customTargetLabels', JSON.stringify(customTargetLabels));
      formData.append('duplicateMode', duplicateMode);
      formData.append('skipZeroStock', String(skipZeroStock));
      endpoint  = `${baseUrl}/products/import/xml/stream`;
      fetchInit = {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body:    formData,
        signal:  controller.signal,
      };
    }

    let response: Response;
    try {
      response = await fetch(endpoint, fetchInit);
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // User cancelled
      setImportProgress(null);
      throw err;
    }
    if (!response.ok) {
      setImportProgress(null);
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error ?? `HTTP ${response.status}`);
    }
    if (!response.body) {
      setImportProgress(null);
      throw new Error('Streaming desteklenmiyor. Tarayıcınızı güncelleyin.');
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';
    let   importError: Error | null = null;

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.type === 'progress') {
            setImportProgress(prev => ({
              current:  event.current,
              total:    event.total,
              name:     event.name ?? '',
              status:   event.status,
              imported: (prev?.imported ?? 0) + (event.status === 'imported' ? 1 : 0),
              updated:  (prev?.updated  ?? 0) + (event.status === 'updated'  ? 1 : 0),
              skipped:  (prev?.skipped  ?? 0) + (event.status === 'skipped'  ? 1 : 0),
              failed:   (prev?.failed   ?? 0) + (event.status === 'error'    ? 1 : 0),
            }));
          } else if (event.type === 'done') {
            setImportResult({ summary: event.summary, results: event.results });
            setImportProgress(null);
            setStep(2);
            refreshHistory();
            {
              const s = event.summary as ImportSummary;
              if ((s.imported ?? 0) + (s.updated ?? 0) > 0) {
                void refreshOnboardingUserInStore();
              }
              const planLimited = (s.skippedPlanLimit ?? 0) > 0 || s.reason === 'PLAN_LIMIT';
              if (planLimited) {
                toast(
                  (s.skippedPlanLimit ?? 0) > 0
                    ? `${s.imported} ürün yüklendi. ${s.skippedPlanLimit} ürün daha için Faturalama → Planı Yükselt.`
                    : `${s.imported} ürün yüklendi; plan limiti doldu. Faturalama'dan yükseltin.`,
                  { icon: 'ℹ️', duration: 8000 },
                );
              }
              if (s.failed > 0 && s.imported === 0 && s.updated === 0) {
                toast.error(
                  `İçe aktarma tamamlandı ancak ürün eklenemedi veya güncellenemedi (${s.failed} hata). Ayrıntılar sonuç ekranında.`,
                  { duration: 7000 },
                );
              } else if (s.failed > 0) {
                toast(
                  `İşlem bitti: ${s.imported} eklendi, ${s.updated} güncellendi; ${s.failed} satırda hata.`,
                  { icon: '⚠️', duration: 6500 },
                );
              } else if (!planLimited) {
                toast.success(
                  `İçe aktarma başarılı: ${s.imported} ürün eklendi, ${s.updated} güncellendi${s.skipped ? `, ${s.skipped} atlandı` : ''}.`,
                  { duration: 5500 },
                );
              }
            }
            break outer;
          } else if (event.type === 'error') {
            importError = new Error(event.message ?? 'Import hatası.');
            break outer;
          }
        } catch {
          // Ignore JSON parse errors for incomplete chunks
        }
      }
    }

    if (importError) {
      setImportProgress(null);
      throw importError;
    }
  }, [
    file, sourceMode, sourceUrl, preview, mapping, customTargets, duplicateMode, skipZeroStock,
    saveAsSource, persistXmlSource,
  ]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setStep(0);
    setFile(null);
    setSourceUrl('');
    setPreview(null);
    setMapping({});
    setCustomTargets([]);
    setEditingSourceId(null);
    setSaveAsSource(true);
    setSourceName('');
    setImportResult(null);
    setImportProgress(null);
  }, []);

  const handleSavedSyncComplete = useCallback((summary: {
    total?: number; imported?: number; updated?: number; skipped?: number; failed?: number;
  }) => {
    setImportResult({
      summary: {
        total:    summary.total ?? 0,
        imported: summary.imported ?? 0,
        updated:  summary.updated ?? 0,
        skipped:  summary.skipped ?? 0,
        failed:   summary.failed ?? 0,
      },
      results: [],
    });
    setStep(2);
    refreshHistory();
    if ((summary.imported ?? 0) + (summary.updated ?? 0) > 0) {
      void refreshOnboardingUserInStore();
    }
  }, []);

  return (
    // ── Full-width layout (same as other pages) ──────────────────────────
    <div className="-mx-6 -my-6">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 mb-1">
          <Link to="/dashboard/products" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Ürünler
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">XML İçe Aktarma</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">XML Ürün İçe / Dışa Aktarma</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Yeni feed ekleyin veya kayıtlı XML entegrasyonunuzdan ürünleri güncelleyin
            </p>
          </div>
          <ExportButton />
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Step indicator */}
        <StepIndicator current={step} importing={importProgress !== null}/>

        {/* Wizard card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          {step === 0 && (
            <PageModeTabs
              mode={pageMode}
              onChange={setPageModeAndUrl}
            />
          )}
          {step === 0 && pageMode === 'saved' && (
            <XmlImportSavedPanel
              refreshKey={savedListRefreshKey}
              onEditMapping={source => { void handleEditSavedSource(source); }}
              onSyncComplete={handleSavedSyncComplete}
            />
          )}
          {step === 0 && pageMode === 'new' && (
            <UploadStep
              onPreviewFile={handlePreviewFile}
              onPreviewUrl={handlePreviewUrl}
              history={history}
            />
          )}
          {step === 1 && preview && importProgress !== null && (
            <ProcessingStep progress={importProgress} onCancel={handleCancelImport} />
          )}
          {step === 1 && preview && importProgress === null && (
            <MappingStep
              preview={preview}
              mapping={mapping}
              setMapping={setMapping}
              customTargets={customTargets}
              setCustomTargets={setCustomTargets}
              duplicateMode={duplicateMode}
              setDuplicateMode={setDuplicateMode}
              skipZeroStock={skipZeroStock}
              setSkipZeroStock={setSkipZeroStock}
              sourceMode={sourceMode}
              saveAsSource={saveAsSource}
              setSaveAsSource={setSaveAsSource}
              sourceName={sourceName}
              setSourceName={setSourceName}
              sourceUrl={sourceUrl}
              setSourceUrl={setSourceUrl}
              editingSourceId={editingSourceId}
              file={file}
              onSaveSource={handleSaveSource}
              onImport={handleImport}
              onBack={handleReset}
            />
          )}
          {step === 2 && importResult && (
            <ResultsStep
              result={importResult}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
