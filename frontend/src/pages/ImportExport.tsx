import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/apiClient';

const UPGRADE_BILLING_HREF = '/dashboard/billing';
const UPGRADE_PLANS_HREF   = '/plans';
import { refreshOnboardingUserInStore } from '../utils/onboardingClient';

// ─── Types ────────────────────────────────────────────────────────────────────

type Entity   = 'products' | 'customers' | 'orders';
type ImportEntity = 'products' | 'customers';

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

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTITIES = [
  { key: 'products',  label: 'Ürünler',    icon: '📦', canImport: true  },
  { key: 'customers', label: 'Müşteriler', icon: '👥', canImport: true  },
  { key: 'orders',    label: 'Siparişler', icon: '🛒', canImport: false },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

const ImportExport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');

  // Import state
  const [importEntity, setImportEntity] = useState<ImportEntity>('products');
  const [file,         setFile]         = useState<File | null>(null);
  const [dragging,     setDragging]     = useState(false);
  const [importing,    setImporting]    = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError,  setImportError]  = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exportEntity,  setExportEntity]  = useState<Entity>('products');
  const [exporting,     setExporting]     = useState(false);
  const [orderStatus,   setOrderStatus]   = useState('');
  const [orderFrom,     setOrderFrom]     = useState('');
  const [orderTo,       setOrderTo]       = useState('');

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  };

  const pickFile = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      setImportError('Sadece .csv dosyaları kabul edilir.');
      return;
    }
    setFile(f);
    setImportResult(null);
    setImportError(null);
  };

  // ── Import ───────────────────────────────────────────────────────────────
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
      const result = (res.data as any).result;
      setImportResult(result);
      if (importEntity === 'products' && result && ((result.created ?? 0) + (result.updated ?? 0) > 0)) {
        void refreshOnboardingUserInStore();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Import başarısız.';
      setImportError(msg);
      if (err?.response?.data?.result) setImportResult(err.response.data.result);
    } finally {
      setImporting(false);
    }
  }, [file, importEntity]);

  // ── Template download ────────────────────────────────────────────────────
  const downloadTemplate = (entity: ImportEntity) => {
    const token = localStorage.getItem('token');
    const url   = `${(api.defaults.baseURL ?? '/api')}/csv/template/${entity}`;
    const a     = document.createElement('a');
    a.href      = url;
    a.setAttribute('download', `${entity}_template.csv`);
    // Add token as query param for auth (simple approach)
    a.href = `${url}?_t=${Date.now()}`;
    // Use fetch with auth header instead
    fetchExport(url, `${entity}_template.csv`, token);
  };

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setExporting(true);
    const token = localStorage.getItem('token');
    let url = `${api.defaults.baseURL ?? '/api'}/csv/export/${exportEntity}`;

    if (exportEntity === 'orders') {
      const params = new URLSearchParams();
      if (orderStatus) params.set('status', orderStatus);
      if (orderFrom)   params.set('from',   orderFrom);
      if (orderTo)     params.set('to',     orderTo);
      if (params.toString()) url += `?${params}`;
    }

    await fetchExport(url, `${exportEntity}_export.csv`, token);
    setExporting(false);
  }, [exportEntity, orderStatus, orderFrom, orderTo]);

  async function fetchExport(url: string, filename: string, token: string | null) {
    try {
      const res  = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = href; a.download = filename; a.click();
      URL.revokeObjectURL(href);
    } catch (err: any) {
      alert(`Dosya indirilemedi: ${err.message}`);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CSV İçe/Dışa Aktar</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Toplu ürün, müşteri ve sipariş verisi yönetimi
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {(['import', 'export'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab === 'import' ? '⬆ İçe Aktar' : '⬇ Dışa Aktar'}
          </button>
        ))}
      </div>

      {/* ── IMPORT TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Entity selector */}
          <div className="flex gap-3">
            {ENTITIES.filter(e => e.canImport).map(e => (
              <button
                key={e.key}
                onClick={() => { setImportEntity(e.key as ImportEntity); setFile(null); setImportResult(null); setImportError(null); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition ${
                  importEntity === e.key
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400'
                }`}
              >
                {e.icon} {e.label}
              </button>
            ))}
          </div>

          {/* Template download hint */}
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
            <span className="text-blue-600 dark:text-blue-400 text-lg">💡</span>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              CSV formatından emin değilseniz{' '}
              <button
                onClick={() => downloadTemplate(importEntity)}
                className="font-semibold underline hover:no-underline"
              >
                örnek şablonu indirin
              </button>
              . Images sütununda birden fazla URL için <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">|</code> kullanın.
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-12 text-center transition ${
              dragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : file
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
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
                <div className="text-4xl mb-3">✅</div>
                <p className="font-medium text-green-700 dark:text-green-400">{file.name}</p>
                <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                  {(file.size / 1024).toFixed(1)} KB — değiştirmek için tıklayın
                </p>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">📂</div>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  CSV dosyasını buraya sürükleyin veya tıklayın
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Maks 10 MB</p>
              </>
            )}
          </div>

          {/* Import button */}
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                İçe aktarılıyor...
              </>
            ) : (
              <>⬆ İçe Aktar</>
            )}
          </button>

          {/* Error banner */}
          {importError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
              ❌ {importError}
            </div>
          )}

          {/* Result summary */}
          {importResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Toplam',    value: importResult.total,   color: 'text-gray-700 dark:text-gray-300',  bg: 'bg-gray-100 dark:bg-gray-800' },
                  { label: 'Oluşturuldu', value: importResult.created, color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
                  { label: 'Güncellendi', value: importResult.updated, color: 'text-blue-700 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: 'Atlandı',   value: importResult.skipped, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 text-center`}>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {importEntity === 'products'
                && ((importResult.skippedPlanLimit ?? 0) > 0 || importResult.reason === 'PLAN_LIMIT') && (
                <div className="space-y-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4 text-sm text-indigo-900 dark:text-indigo-200">
                  {(importResult.skippedPlanLimit ?? 0) > 0 ? (
                    <p className="text-base font-semibold">
                      <span className="tabular-nums text-indigo-700 dark:text-indigo-300">{importResult.skippedPlanLimit}</span>
                      {' '}
                      ürün daha yüklemek için plan yükseltin.
                    </p>
                  ) : (
                    <p className="text-base font-semibold">Plan limitiniz doldu.</p>
                  )}
                  {importResult.created > 0 && (
                    <p className="text-indigo-800/95 dark:text-indigo-200/90">
                      Bu içe aktarmada <strong className="tabular-nums">{importResult.created}</strong> yeni ürün oluşturuldu.
                    </p>
                  )}
                  <p>
                    <Link
                      to={UPGRADE_BILLING_HREF}
                      className="font-semibold text-indigo-700 dark:text-indigo-300 underline decoration-2 underline-offset-2 hover:no-underline"
                    >
                      Devam etmek için plan yükseltin
                    </Link>
                    <span className="text-indigo-400 dark:text-indigo-500"> · </span>
                    <Link
                      to={UPGRADE_PLANS_HREF}
                      className="font-medium text-indigo-600 dark:text-indigo-300 underline underline-offset-2 hover:no-underline"
                    >
                      Tüm planları gör
                    </Link>
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      to={UPGRADE_BILLING_HREF}
                      className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    >
                      Planı Yükselt
                    </Link>
                    <Link
                      to={UPGRADE_PLANS_HREF}
                      className="inline-flex items-center justify-center rounded-xl border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-medium text-indigo-800 dark:text-indigo-100 transition hover:bg-indigo-100/80 dark:hover:bg-gray-800"
                    >
                      Planları karşılaştır
                    </Link>
                  </div>
                </div>
              )}

              {/* Row errors */}
              {importResult.errors.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-900/20 flex items-center gap-2">
                    <span className="text-red-600 dark:text-red-400 font-semibold text-sm">
                      ⚠ {importResult.errors.length} satır hatası
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto">
                    {importResult.errors.map((e, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-start gap-3 text-sm">
                        <span className="flex-shrink-0 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded font-mono">
                          Satır {e.row}
                        </span>
                        <span className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded font-mono">
                          {e.field}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 flex-1">{e.message}</span>
                        {e.value && (
                          <span className="text-xs text-gray-400 dark:text-gray-600 font-mono truncate max-w-24">
                            "{e.value}"
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.errors.length === 0
                && !((importResult.skippedPlanLimit ?? 0) > 0 || importResult.reason === 'PLAN_LIMIT') && (
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-medium">
                  ✅ İçe aktarma hatasız tamamlandı!
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── EXPORT TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          {/* Entity cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ENTITIES.map(e => (
              <button
                key={e.key}
                onClick={() => setExportEntity(e.key as Entity)}
                className={`p-5 rounded-2xl border-2 text-left transition ${
                  exportEntity === e.key
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300'
                }`}
              >
                <div className="text-3xl mb-2">{e.icon}</div>
                <p className="font-semibold text-gray-900 dark:text-white">{e.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {e.key === 'products'  && 'Tüm ürünleri dışa aktar'}
                  {e.key === 'customers' && 'Tüm müşterileri dışa aktar'}
                  {e.key === 'orders'    && 'Sipariş geçmişini dışa aktar'}
                </p>
              </button>
            ))}
          </div>

          {/* Order filters */}
          {exportEntity === 'orders' && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sipariş Filtreleri</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Durum</label>
                  <select
                    value={orderStatus}
                    onChange={e => setOrderStatus(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {['', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED'].map(s => (
                      <option key={s} value={s}>{s || 'Tümü'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={orderFrom}
                    onChange={e => setOrderFrom(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={orderTo}
                    onChange={e => setOrderTo(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Hazırlanıyor...
              </>
            ) : (
              <>⬇ CSV İndir ({ENTITIES.find(e => e.key === exportEntity)?.label})</>
            )}
          </button>

          {/* Info */}
          <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
            <span className="text-lg">ℹ️</span>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>Dışa aktarılan CSV dosyası Excel ile uyumludur (UTF-8 BOM).</p>
              <p>Ürünler için <strong>images</strong> sütunundaki URL'ler <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">|</code> ile ayrılmıştır.</p>
              <p>Dışa aktarılan dosyayı düzenleyip tekrar içe aktarabilirsiniz.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportExport;
