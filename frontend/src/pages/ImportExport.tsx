import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/apiClient';
import { productService } from '../services/product.service';
import { refreshOnboardingUserInStore } from '../utils/onboardingClient';

const UPGRADE_BILLING_HREF = '/dashboard/billing';
const UPGRADE_PLANS_HREF   = '/plans';
const MAX_FILE_MB          = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

type Entity        = 'products' | 'customers' | 'orders';
type ImportEntity  = 'products' | 'customers';

interface RowError { row: number; field: string; message: string; value?: string }

interface ImportResult {
  total:             number;
  created:           number;
  updated:           number;
  skipped:           number;
  errors:            RowError[];
  skippedPlanLimit?: number;
  reason?:           'PLAN_LIMIT';
}

interface LastOperation {
  type:      'import' | 'export';
  entity:    string;
  label:     string;
  at:        string;
  summary?:  string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTITIES = [
  { key: 'products',  label: 'Ürünler',    icon: '📦', canImport: true  },
  { key: 'customers', label: 'Müşteriler', icon: '👥', canImport: true  },
  { key: 'orders',    label: 'Siparişler', icon: '🛒', canImport: false },
] as const;

const IMPORT_RULES = [
  'CSV dosyası UTF-8 kodlamasında olmalıdır.',
  'İlk satır sütun başlıklarını içermelidir.',
  'SKU alanı benzersiz olmalıdır (ürün import).',
  'Images sütununda birden fazla URL için | karakterini kullanın.',
  'Fiyat ve stok alanları sayısal olmalıdır.',
  'Maksimum dosya boyutu 10 MB.',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

async function fetchExport(url: string, filename: string, token: string | null) {
  const res  = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function SummaryMetric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="wn-card px-4 py-3 min-w-[120px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-slate-900 mt-1 tabular-nums leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="wn-card overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
        <h2 className="text-sm font-medium text-slate-900 tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="p-5 flex-1">{children}</div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const ImportExport: React.FC = () => {
  const [importEntity, setImportEntity] = useState<ImportEntity>('products');
  const [file,         setFile]         = useState<File | null>(null);
  const [dragging,     setDragging]     = useState(false);
  const [importing,    setImporting]    = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError,  setImportError]  = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exportEntity, setExportEntity] = useState<Entity>('products');
  const [exporting,    setExporting]    = useState(false);
  const [orderStatus,  setOrderStatus]  = useState('');
  const [orderFrom,    setOrderFrom]    = useState('');
  const [orderTo,      setOrderTo]      = useState('');

  const [productTotal, setProductTotal]   = useState<number | null>(null);
  const [lastImport,   setLastImport]     = useState<LastOperation | null>(null);
  const [lastExport,   setLastExport]     = useState<LastOperation | null>(null);

  const loadProductTotal = useCallback(async () => {
    try {
      const res = await productService.search({ limit: 1 });
      setProductTotal(res.total ?? res.items.length);
    } catch {
      setProductTotal(null);
    }
  }, []);

  useEffect(() => {
    void loadProductTotal();
  }, [loadProductTotal]);

  const errorRowCount = importResult?.errors.length ?? 0;
  const operationStatus = importing
    ? 'İçe aktarılıyor…'
    : exporting
      ? 'Dışa aktarılıyor…'
      : importResult
        ? importError
          ? 'Son işlem hatalı'
          : 'Son işlem tamamlandı'
        : 'Hazır';

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  };

  const pickFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setImportError('Sadece .csv dosyaları kabul edilir.');
      return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setImportError(`Dosya boyutu ${MAX_FILE_MB} MB sınırını aşıyor.`);
      return;
    }
    setFile(f);
    setImportResult(null);
    setImportError(null);
  };

  const downloadTemplate = (entity: ImportEntity) => {
    const token = localStorage.getItem('token');
    const url   = `${api.defaults.baseURL ?? '/api'}/csv/template/${entity}`;
    fetchExport(url, `${entity}_template.csv`, token).catch((err: Error) => {
      toast.error(`Şablon indirilemedi: ${err.message}`);
    });
  };

  const handleImport = useCallback(async () => {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setImportError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post(`/csv/import/${importEntity}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = (res.data as { result: ImportResult }).result;
      setImportResult(result);
      setLastImport({
        type:    'import',
        entity:  importEntity,
        label:   ENTITIES.find(e => e.key === importEntity)?.label ?? importEntity,
        at:      new Date().toISOString(),
        summary: `${result.created} oluşturuldu · ${result.updated} güncellendi · ${result.errors.length} hata`,
      });
      if (importEntity === 'products' && (result.created ?? 0) + (result.updated ?? 0) > 0) {
        void refreshOnboardingUserInStore();
        void loadProductTotal();
      }
      if (result.errors.length === 0) {
        toast.success('İçe aktarma tamamlandı.');
      } else {
        toast(`${result.errors.length} satırda hata var.`, { icon: '⚠️' });
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; result?: ImportResult } }; message?: string };
      const msg = axiosErr?.response?.data?.message || axiosErr?.message || 'Import başarısız.';
      setImportError(msg);
      if (axiosErr?.response?.data?.result) setImportResult(axiosErr.response.data.result);
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  }, [file, importEntity, loadProductTotal]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    const token = localStorage.getItem('token');
    let url = `${api.defaults.baseURL ?? '/api'}/csv/export/${exportEntity}`;

    if (exportEntity === 'orders') {
      const params = new URLSearchParams();
      if (orderStatus) params.set('status', orderStatus);
      if (orderFrom)   params.set('from', orderFrom);
      if (orderTo)     params.set('to', orderTo);
      if (params.toString()) url += `?${params}`;
    }

    try {
      await fetchExport(url, `${exportEntity}_export.csv`, token);
      setLastExport({
        type:    'export',
        entity:  exportEntity,
        label:   ENTITIES.find(e => e.key === exportEntity)?.label ?? exportEntity,
        at:      new Date().toISOString(),
        summary: 'CSV dosyası indirildi',
      });
      toast.success('Dışa aktarma başarılı.');
    } catch (err: unknown) {
      toast.error(`Dosya indirilemedi: ${(err as Error).message}`);
    } finally {
      setExporting(false);
    }
  }, [exportEntity, orderStatus, orderFrom, orderTo]);

  const exportEntityLabel = ENTITIES.find(e => e.key === exportEntity)?.label ?? exportEntity;

  return (
    <div className="w-full space-y-6 pb-10 page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            CSV İçe / Dışa Aktar
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-xl leading-relaxed">
            Ürün, müşteri ve sipariş verilerinizi CSV dosyalarıyla yönetin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => downloadTemplate(importEntity)}
            className="btn btn-secondary"
          >
            Örnek Şablon İndir
          </button>
          <button
            type="button"
            disabled
            title="İşlem geçmişi sonraki fazda aktif olacak."
            className="btn btn-ghost opacity-50 cursor-not-allowed"
          >
            İşlem Geçmişi
          </button>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryMetric
          label="Toplam Ürün"
          value={productTotal ?? '—'}
          sub={productTotal == null ? 'Yüklenemedi' : 'katalog'}
        />
        <SummaryMetric
          label="Son İçe Aktarım"
          value={lastImport ? fmtDateTime(lastImport.at) : 'Henüz yok'}
          sub={lastImport?.label}
        />
        <SummaryMetric
          label="Son Dışa Aktarım"
          value={lastExport ? fmtDateTime(lastExport.at) : 'Henüz yok'}
          sub={lastExport?.label}
        />
        <SummaryMetric
          label="Hatalı Kayıt"
          value={errorRowCount}
          sub={importResult ? 'son işlem' : '—'}
        />
        <SummaryMetric label="İşlem Durumu" value={operationStatus} />
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

        {/* Left — Import */}
        <div className="xl:col-span-2 space-y-6">
          <Panel title="İçe Aktar">
            <div className="space-y-5">
              {/* Entity tabs */}
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Veri tipi</p>
                <div className="flex flex-wrap gap-2">
                  {ENTITIES.map(e => {
                    const isImportable = e.canImport;
                    const isActive = isImportable && importEntity === e.key;
                    return (
                      <button
                        key={e.key}
                        type="button"
                        disabled={!isImportable}
                        title={!isImportable ? 'Sipariş import sonraki fazda aktif olacak.' : undefined}
                        onClick={() => {
                          if (!isImportable) return;
                          setImportEntity(e.key as ImportEntity);
                          setFile(null);
                          setImportResult(null);
                          setImportError(null);
                        }}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-medium border transition ${
                          !isImportable
                            ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                            : isActive
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700'
                        }`}
                      >
                        <span>{e.icon}</span>
                        {e.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CSV help */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-3.5 space-y-2">
                <p className="text-[13px] font-medium text-slate-800">CSV format rehberi</p>
                <p className="text-[13px] text-slate-600 leading-relaxed">
                  CSV formatından emin değilseniz{' '}
                  <button
                    type="button"
                    onClick={() => downloadTemplate(importEntity)}
                    className="font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                  >
                    örnek şablonu indirin
                  </button>
                  .
                </p>
                <p className="text-[12px] text-slate-500 leading-relaxed">
                  <strong className="font-medium text-slate-600">Images</strong> sütununda birden fazla görsel URL&apos;si
                  için <code className="px-1 py-0.5 rounded bg-white/80 text-indigo-700 font-mono text-[11px]">|</code>{' '}
                  karakterini kullanın.
                </p>
              </div>

              {/* Drop zone */}
              <div
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer border-2 border-dashed rounded-2xl px-6 py-14 text-center transition ${
                  dragging
                    ? 'border-indigo-400 bg-indigo-50/60'
                    : file
                      ? 'border-emerald-300 bg-emerald-50/40'
                      : 'border-slate-200 bg-slate-50/50 hover:border-indigo-300 hover:bg-indigo-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
                />
                {file ? (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-[13px] text-slate-500 mt-1">
                      {(file.size / 1024).toFixed(1)} KB · Değiştirmek için tıklayın veya sürükleyin
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="font-medium text-slate-800">CSV dosyasını sürükleyip bırakın</p>
                    <p className="text-[13px] text-slate-500 mt-1">veya dosya seçmek için tıklayın</p>
                    <p className="text-[12px] text-slate-400 mt-2">
                      Desteklenen format: .csv · Maks. {MAX_FILE_MB} MB
                    </p>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleImport}
                disabled={!file || importing}
                className="btn btn-primary w-full"
              >
                {importing ? 'İçe aktarılıyor…' : 'İçe Aktar'}
              </button>

              {importError && (
                <div className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 text-[13px] text-red-800">
                  {importError}
                </div>
              )}

              {importResult && (
                <ImportResultPanel
                  result={importResult}
                  importEntity={importEntity}
                />
              )}
            </div>
          </Panel>
        </div>

        {/* Right — Export + rules + last op */}
        <div className="space-y-6 xl:sticky xl:top-4">
          <Panel title="Dışa Aktar">
            <div className="space-y-4">
              <div>
                <label className="wn-label">Veri tipi</label>
                <select
                  value={exportEntity}
                  onChange={e => setExportEntity(e.target.value as Entity)}
                  className="wn-select w-full"
                >
                  {ENTITIES.map(e => (
                    <option key={e.key} value={e.key}>{e.label}</option>
                  ))}
                </select>
              </div>

              {exportEntity === 'orders' && (
                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="text-[12px] font-medium text-slate-700">Sipariş filtreleri</p>
                  <div>
                    <label className="wn-label">Durum</label>
                    <select
                      value={orderStatus}
                      onChange={e => setOrderStatus(e.target.value)}
                      className="wn-select w-full"
                    >
                      {['', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED'].map(s => (
                        <option key={s} value={s}>{s || 'Tümü'}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="wn-label">Başlangıç</label>
                      <input type="date" value={orderFrom} onChange={e => setOrderFrom(e.target.value)} className="wn-input w-full" />
                    </div>
                    <div>
                      <label className="wn-label">Bitiş</label>
                      <input type="date" value={orderTo} onChange={e => setOrderTo(e.target.value)} className="wn-input w-full" />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="btn btn-primary w-full"
              >
                {exporting ? 'Hazırlanıyor…' : `Dışa Aktar (${exportEntityLabel})`}
              </button>

              <p className="text-[12px] text-slate-500 leading-relaxed">
                Dışa aktarılan CSV Excel ile uyumludur (UTF-8 BOM). Dosyayı düzenleyip tekrar içe aktarabilirsiniz.
              </p>
            </div>
          </Panel>

          <Panel title="Import kuralları">
            <ul className="space-y-2">
              {IMPORT_RULES.map(rule => (
                <li key={rule} className="flex items-start gap-2 text-[13px] text-slate-600 leading-relaxed">
                  <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Son işlem özeti">
            {!lastImport && !lastExport && !importResult ? (
              <div className="empty-state py-8 px-2">
                <p className="empty-state-title text-base">Henüz işlem yapılmadı</p>
                <p className="empty-state-desc mx-auto text-[13px]">
                  İçe veya dışa aktarma yaptığınızda özet burada görünecektir.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-[13px]">
                {lastImport && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                    <p className="font-medium text-slate-800">Son içe aktarım</p>
                    <p className="text-slate-500 mt-0.5">{lastImport.label} · {fmtDateTime(lastImport.at)}</p>
                    {lastImport.summary && <p className="text-slate-600 mt-1">{lastImport.summary}</p>}
                  </div>
                )}
                {lastExport && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                    <p className="font-medium text-slate-800">Son dışa aktarım</p>
                    <p className="text-slate-500 mt-0.5">{lastExport.label} · {fmtDateTime(lastExport.at)}</p>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
};

// ─── Import result sub-panel ──────────────────────────────────────────────────

function ImportResultPanel({
  result,
  importEntity,
}: {
  result:       ImportResult;
  importEntity: ImportEntity;
}) {
  return (
    <div className="space-y-4 pt-2 border-t border-slate-100">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">İşlem sonucu</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam',      value: result.total,   tone: 'text-slate-900' },
          { label: 'Oluşturuldu', value: result.created, tone: 'text-emerald-700' },
          { label: 'Güncellendi', value: result.updated, tone: 'text-indigo-700' },
          { label: 'Atlandı',     value: result.skipped, tone: 'text-amber-700' },
        ].map(s => (
          <div key={s.label} className="wn-card px-3 py-2.5 text-center">
            <p className={`text-xl font-semibold tabular-nums ${s.tone}`}>{s.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {importEntity === 'products'
        && ((result.skippedPlanLimit ?? 0) > 0 || result.reason === 'PLAN_LIMIT') && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 text-[13px] text-indigo-900 space-y-3">
          {(result.skippedPlanLimit ?? 0) > 0 ? (
            <p className="font-medium">
              <span className="tabular-nums">{result.skippedPlanLimit}</span> ürün daha yüklemek için plan yükseltin.
            </p>
          ) : (
            <p className="font-medium">Plan limitiniz doldu.</p>
          )}
          {result.created > 0 && (
            <p>Bu içe aktarmada <strong className="tabular-nums">{result.created}</strong> yeni ürün oluşturuldu.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Link to={UPGRADE_BILLING_HREF} className="btn btn-primary text-[13px] py-2">Planı Yükselt</Link>
            <Link to={UPGRADE_PLANS_HREF} className="btn btn-secondary text-[13px] py-2">Planları karşılaştır</Link>
          </div>
        </div>
      )}

      {result.errors.length > 0 && (
        <div className="wn-card overflow-hidden border-red-100">
          <div className="px-4 py-2.5 border-b border-red-100 bg-red-50/60">
            <p className="text-[13px] font-medium text-red-800">
              {result.errors.length} satır hatası
            </p>
          </div>
          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {result.errors.map((e, i) => (
              <div key={i} className="px-4 py-2.5 flex flex-wrap items-start gap-2 text-[12px]">
                <span className="font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Satır {e.row}</span>
                <span className="font-mono bg-red-50 text-red-700 px-2 py-0.5 rounded">{e.field}</span>
                <span className="text-slate-600 flex-1 min-w-[140px]">{e.message}</span>
                {e.value && (
                  <span className="font-mono text-slate-400 truncate max-w-[120px]">&quot;{e.value}&quot;</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {result.errors.length === 0
        && !((result.skippedPlanLimit ?? 0) > 0 || result.reason === 'PLAN_LIMIT') && (
        <p className="text-[13px] font-medium text-emerald-700">İçe aktarma hatasız tamamlandı.</p>
      )}
    </div>
  );
}

export default ImportExport;
