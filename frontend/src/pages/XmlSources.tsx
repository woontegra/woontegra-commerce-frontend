/**
 * Kalıcı XML feed kaynakları — URL + mapping bir kez kaydedilir; senkron / cron ile güncellenir.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/apiClient';
import toast from 'react-hot-toast';
import { buildMappingWithAutoSuggest, FIXED_MAPPING_TARGETS } from '../utils/xmlMapping';
import { Table } from '../components/ui/Table';

type DuplicateMode = 'skip' | 'update' | 'error';
type AutoSyncInterval = 'daily' | '1' | '6' | '12';
type StatusFilter = '' | 'active' | 'inactive' | 'error';
type SortKey = 'lastSync' | 'name' | 'error';

interface XmlSourceRow {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  mapping: Record<string, string>;
  mappingJson?: Record<string, string>;
  duplicateMode: DuplicateMode;
  skipZeroStock: boolean;
  isActive: boolean;
  autoSyncEnabled?: boolean;
  autoSyncIntervalHours?: number | null;
  autoSyncAtHour?: number | null;
  autoSyncAtMinute?: number | null;
  autoSyncTimezone?: string | null;
  lastSyncAt?: string | null;
  lastFetchedAt?: string | null;
  lastSyncError: string | null;
  lastImported?: number | null;
  lastUpdated?: number | null;
  createdAt: string;
  updatedAt: string;
}

interface PreviewPayload {
  xmlFields: string[];
  totalRows: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeSourceRow(raw: XmlSourceRow & Record<string, unknown>): XmlSourceRow {
  const mapping = raw.mappingJson ?? raw.mapping ?? {};
  return {
    ...raw,
    mapping,
    lastSyncAt: raw.lastFetchedAt ?? raw.lastSyncAt ?? null,
    lastImported: typeof raw.lastImported === 'number' ? raw.lastImported : null,
    lastUpdated:  typeof raw.lastUpdated === 'number' ? raw.lastUpdated : null,
  };
}

function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: T[] }).data;
  }
  return [];
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return null;
  return new Intl.DateTimeFormat('tr-TR', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function isFileLocalUrl(url: string) {
  return url.startsWith('file-local://');
}

function displayUrl(url: string) {
  if (isFileLocalUrl(url)) return 'Yerel XML dosyası';
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname;
    const short = `${u.hostname}${path}`;
    return short.length > 42 ? `${short.slice(0, 40)}…` : short;
  } catch {
    return url.length > 42 ? `${url.slice(0, 40)}…` : url;
  }
}

function rowStatus(row: XmlSourceRow): 'active' | 'inactive' | 'error' {
  if (row.lastSyncError) return 'error';
  if (!row.isActive) return 'inactive';
  return 'active';
}

function autoSyncLabel(row: XmlSourceRow): string {
  if (!row.autoSyncEnabled) return 'Kapalı';
  const hrs = row.autoSyncIntervalHours;
  if (hrs === 1) return '1 saatte bir';
  if (hrs === 6) return '6 saatte bir';
  if (hrs === 12) return '12 saatte bir';
  const hh = String(row.autoSyncAtHour ?? 3).padStart(2, '0');
  const mm = String(row.autoSyncAtMinute ?? 0).padStart(2, '0');
  return `Günlük · ${hh}:${mm}`;
}

function syncResultLabel(row: XmlSourceRow): string {
  if (row.lastImported != null || row.lastUpdated != null) {
    const parts: string[] = [];
    if (row.lastImported != null) parts.push(`${row.lastImported} eklendi`);
    if (row.lastUpdated != null) parts.push(`${row.lastUpdated} güncellendi`);
    return parts.join(' · ');
  }
  if (row.lastSyncAt) return 'Senkron tamamlandı';
  return 'Henüz senkron yapılmadı';
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('URL kopyalandı.');
  } catch {
    toast.error('Kopyalanamadı.');
  }
}

// ─── UI ───────────────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  active:   'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100',
  inactive: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  error:    'bg-red-50 text-red-800 ring-1 ring-red-100',
} as const;

const STATUS_LABELS = {
  active:   'Aktif',
  inactive: 'Pasif',
  error:    'Hatalı',
} as const;

function SummaryMetric({ label, value, sub, valueClassName }: { label: string; value: string | number; sub?: string; valueClassName?: string }) {
  return (
    <div className="wn-card px-4 py-3 min-w-[120px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-semibold mt-1 tabular-nums leading-tight ${valueClassName ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function TableEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="empty-state py-14 px-6">
      <div className="empty-state-icon">
        <svg className="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7l8-4 8 4M4 7h16" />
        </svg>
      </div>
      <p className="empty-state-title">Henüz XML kaynağı eklenmemiş.</p>
      <p className="empty-state-desc mx-auto max-w-md">
        Ürünlerinizi XML feed üzerinden içe aktarmak için yeni bir kaynak ekleyin veya XML dosyası yükleyin.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        <button type="button" onClick={onCreate} className="btn btn-primary text-[13px]">
          Yeni Kaynak
        </button>
        <Link to="/dashboard/products/import/xml?mode=saved" className="btn btn-secondary text-[13px]">
          XML İçe Aktar
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function XmlSources() {
  const [list, setList]             = useState<XmlSourceRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [syncingId, setSyncingId]   = useState<string | null>(null);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<XmlSourceRow | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [searchQuery, setSearchQuery]   = useState('');
  const [sortKey, setSortKey]           = useState<SortKey>('lastSync');

  const [name, setName]                 = useState('');
  const [url, setUrl]                   = useState('');
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('update');
  const [skipZeroStock, setSkipZeroStock] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState<AutoSyncInterval>('daily');
  const [autoSyncTime, setAutoSyncTime] = useState('03:00');
  const [autoSyncTimezone, setAutoSyncTimezone] = useState('Europe/Istanbul');
  const [mapping, setMapping]           = useState<Record<string, string>>({});
  const [previewFields, setPreviewFields] = useState<string[]>([]);
  const [previewBusy, setPreviewBusy]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/xml-sources');
      const raw = (r.data as { data?: unknown })?.data ?? r.data;
      setList(unwrapList<XmlSourceRow>(raw).map(r => normalizeSourceRow(r as XmlSourceRow & Record<string, unknown>)));
    } catch {
      toast.error('Kaynaklar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const active = list.filter(r => r.isActive && !r.lastSyncError).length;
    const errors = list.filter(r => Boolean(r.lastSyncError)).length;
    const autoOn = list.filter(r => r.autoSyncEnabled).length;
    const syncDates = list
      .map(r => r.lastSyncAt)
      .filter(Boolean)
      .map(d => new Date(d!).getTime());
    const latest = syncDates.length ? Math.max(...syncDates) : null;
    return {
      total:    list.length,
      active,
      errors,
      autoOn,
      latest:   latest ? (fmtDateTime(new Date(latest).toISOString()) ?? 'Henüz yok') : 'Henüz yok',
    };
  }, [list]);

  const filteredList = useMemo(() => {
    let rows = [...list];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(q) || r.url.toLowerCase().includes(q),
      );
    }
    if (statusFilter === 'active') {
      rows = rows.filter(r => r.isActive && !r.lastSyncError);
    } else if (statusFilter === 'inactive') {
      rows = rows.filter(r => !r.isActive);
    } else if (statusFilter === 'error') {
      rows = rows.filter(r => Boolean(r.lastSyncError));
    }
    rows.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'tr');
      if (sortKey === 'error') {
        const ae = a.lastSyncError ? 1 : 0;
        const be = b.lastSyncError ? 1 : 0;
        if (be !== ae) return be - ae;
      }
      const at = a.lastSyncAt ? new Date(a.lastSyncAt).getTime() : 0;
      const bt = b.lastSyncAt ? new Date(b.lastSyncAt).getTime() : 0;
      return bt - at;
    });
    return rows;
  }, [list, searchQuery, statusFilter, sortKey]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setUrl('');
    setDuplicateMode('update');
    setSkipZeroStock(false);
    setAutoSyncEnabled(false);
    setAutoSyncInterval('daily');
    setAutoSyncTime('03:00');
    setAutoSyncTimezone('Europe/Istanbul');
    setMapping({});
    setPreviewFields([]);
    setModalOpen(true);
  };

  const openEdit = (row: XmlSourceRow) => {
    setEditing(row);
    setName(row.name);
    setUrl(row.url);
    setDuplicateMode(row.duplicateMode);
    setSkipZeroStock(row.skipZeroStock);
    setAutoSyncEnabled(Boolean(row.autoSyncEnabled));
    const hrs = row.autoSyncIntervalHours;
    setAutoSyncInterval(hrs === 1 || hrs === 6 || hrs === 12 ? String(hrs) as AutoSyncInterval : 'daily');
    const hh = String(row.autoSyncAtHour ?? 3).padStart(2, '0');
    const mm = String(row.autoSyncAtMinute ?? 0).padStart(2, '0');
    setAutoSyncTime(`${hh}:${mm}`);
    setAutoSyncTimezone((row.autoSyncTimezone ?? 'Europe/Istanbul') as string);
    const m = typeof row.mapping === 'object' && row.mapping ? row.mapping as Record<string, string> : {};
    setMapping(m);
    setPreviewFields(Object.keys(m));
    setModalOpen(true);
  };

  const runPreview = async () => {
    if (!url.trim()) {
      toast.error('Önce URL girin.');
      return;
    }
    setPreviewBusy(true);
    try {
      const r = await apiClient.post('/products/import/xml/preview-url', { url: url.trim() }, { skipErrorToast: true });
      const raw = r.data as { data?: PreviewPayload } & PreviewPayload;
      const data = raw?.data ?? raw;
      if (!data?.xmlFields?.length) {
        toast.error('Önizleme verisi alınamadı.');
        return;
      }
      setPreviewFields(data.xmlFields);
      setMapping(buildMappingWithAutoSuggest(data.xmlFields, mapping));
      toast.success(`${data.totalRows ?? data.xmlFields.length} ürün satırı algılandı. Eşleştirmeyi kontrol edin.`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err?.response?.data?.error ?? err?.message ?? 'Önizleme başarısız.');
    } finally {
      setPreviewBusy(false);
    }
  };

  const save = async () => {
    if (!name.trim() || !url.trim()) {
      toast.error('Ad ve URL zorunludur.');
      return;
    }
    const mappedTargets = Object.values(mapping).filter(v => v && v !== '__ignore__');
    if (!mappedTargets.includes('name') || !mappedTargets.includes('price')) {
      toast.error('Ürün adı ve fiyat eşlenmelidir. Önce XML alanlarını yükleyin.');
      return;
    }
    const mappingJson: Record<string, string> = {};
    for (const [k, v] of Object.entries(mapping)) {
      mappingJson[k] = !v || v === '__ignore__' ? '__ignore__' : v;
    }
    try {
      const [hStr, mStr] = (autoSyncTime || '03:00').split(':');
      const autoSyncAtHour = Number.isFinite(Number(hStr)) ? Number(hStr) : 3;
      const autoSyncAtMinute = Number.isFinite(Number(mStr)) ? Number(mStr) : 0;
      const intervalHours = autoSyncInterval === 'daily' ? null : Number(autoSyncInterval);

      if (editing) {
        await apiClient.patch(`/xml-sources/${editing.id}`, {
          name, url, mappingJson, duplicateMode, skipZeroStock,
          autoSyncEnabled,
          autoSyncIntervalHours: intervalHours,
          autoSyncAtHour,
          autoSyncAtMinute,
          autoSyncTimezone,
        });
        toast.success('Kaynak güncellendi.');
      } else {
        await apiClient.post('/xml-sources', {
          name, url, mappingJson, duplicateMode, skipZeroStock, isActive: true,
          autoSyncEnabled,
          autoSyncIntervalHours: intervalHours,
          autoSyncAtHour,
          autoSyncAtMinute,
          autoSyncTimezone,
        });
        toast.success('Kaynak kaydedildi.');
      }
      setModalOpen(false);
      void load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error ?? 'Kaydedilemedi.');
    }
  };

  const toggleActive = async (row: XmlSourceRow) => {
    try {
      await apiClient.patch(`/xml-sources/${row.id}`, { isActive: !row.isActive });
      void load();
    } catch {
      toast.error('Durum güncellenemedi.');
    }
  };

  const syncNow = async (row: XmlSourceRow) => {
    setSyncingId(row.id);
    try {
      const r = await apiClient.post(
        `/xml-sources/${row.id}/sync`,
        {},
        { skipErrorToast: true, timeout: 120_000 },
      );
      const s = (r.data as { summary?: { imported?: number; updated?: number; skipped?: number } })?.summary
        ?? (r.data as { summary?: { imported?: number; updated?: number; skipped?: number } })?.summary;
      toast.success(
        `Senkron tamamlandı: ${s?.imported ?? 0} eklendi, ${s?.updated ?? 0} güncellendi, ${s?.skipped ?? 0} atlandı.`,
        { duration: 5000 },
      );
      void load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error ?? 'Senkron başarısız.');
    } finally {
      setSyncingId(null);
    }
  };

  const remove = async (row: XmlSourceRow) => {
    if (!window.confirm(`“${row.name}” silinsin mi?`)) return;
    try {
      await apiClient.delete(`/xml-sources/${row.id}`);
      toast.success('Silindi.');
      void load();
    } catch {
      toast.error('Silinemedi.');
    }
  };

  const columns = useMemo(() => [
    {
      key:    'name',
      header: 'Kaynak Adı',
      cell:   (row: XmlSourceRow) => (
        <span className="font-medium text-slate-900">{row.name}</span>
      ),
    },
    {
      key:    'url',
      header: 'URL',
      cell:   (row: XmlSourceRow) => (
        <div className="flex items-center gap-2 min-w-[140px] max-w-[220px]">
          <span className="text-[13px] text-slate-600 truncate" title={row.url}>
            {displayUrl(row.url)}
          </span>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); void copyText(row.url); }}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 shrink-0"
            title="URL kopyala"
          >
            Kopyala
          </button>
        </div>
      ),
    },
    {
      key:    'status',
      header: 'Durum',
      cell:   (row: XmlSourceRow) => {
        const st = rowStatus(row);
        return (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); void toggleActive(row); }}
            title={st === 'inactive' ? 'Aktifleştir' : st === 'active' ? 'Pasifleştir' : 'Durumu değiştir'}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLE[st]}`}
          >
            {STATUS_LABELS[st]}
          </button>
        );
      },
    },
    {
      key:    'lastSync',
      header: 'Son Senkron',
      cell:   (row: XmlSourceRow) => (
        <span className="text-[13px] text-slate-600 whitespace-nowrap">
          {fmtDateTime(row.lastSyncAt) ?? 'Henüz senkron yapılmadı'}
        </span>
      ),
    },
    {
      key:    'result',
      header: 'Sonuç / Ürün',
      cell:   (row: XmlSourceRow) => (
        <span className="text-[12px] text-slate-600">{syncResultLabel(row)}</span>
      ),
    },
    {
      key:    'error',
      header: 'Hata',
      cell:   (row: XmlSourceRow) => (
        row.lastSyncError ? (
          <span className="text-[12px] text-red-700 line-clamp-2" title={row.lastSyncError}>
            {row.lastSyncError}
          </span>
        ) : (
          <span className="text-[12px] text-emerald-600">Hata yok</span>
        )
      ),
    },
    {
      key:    'autoSync',
      header: 'Otomatik Senkron',
      cell:   (row: XmlSourceRow) => (
        <span className="text-[12px] text-slate-600">{autoSyncLabel(row)}</span>
      ),
    },
    {
      key:    'actions',
      header: 'İşlemler',
      align:  'right' as const,
      cell:   (row: XmlSourceRow) => (
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); void syncNow(row); }}
            disabled={!row.isActive || syncingId === row.id}
            className="text-[13px] font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {syncingId === row.id ? 'Güncelleniyor…' : 'Güncelle'}
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); openEdit(row); }}
            className="text-[13px] font-medium text-slate-600 hover:text-slate-900"
          >
            Düzenle
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); void remove(row); }}
            className="text-[13px] font-medium text-red-600 hover:text-red-800"
          >
            Sil
          </button>
        </div>
      ),
    },
  ], [syncingId]);

  const showFilteredEmpty = !loading && list.length > 0 && filteredList.length === 0;

  return (
    <div className="w-full space-y-6 pb-10 page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            XML Kaynakları
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-xl leading-relaxed">
            XML feed kaynaklarınızı yönetin, ürünleri manuel veya otomatik senkronize edin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link to="/dashboard/products/import/xml?mode=saved" className="btn btn-secondary">
            XML İçe Aktar
          </Link>
          <button type="button" onClick={openCreate} className="btn btn-primary">
            Yeni Kaynak
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryMetric label="Toplam XML Kaynağı" value={stats.total} />
        <SummaryMetric label="Aktif Kaynak" value={stats.active} />
        <SummaryMetric label="Son Senkron" value={stats.latest} />
        <SummaryMetric label="Hatalı Kaynak" value={stats.errors} valueClassName={stats.errors > 0 ? 'text-red-700' : 'text-slate-900'} />
        <SummaryMetric
          label="Otomatik Senkron"
          value={stats.autoOn}
          sub={`${stats.autoOn} kaynak açık`}
        />
      </div>

      {/* Cron info */}
      <div className="wn-card px-4 py-3.5 border-indigo-100/80 bg-indigo-50/40">
        <p className="text-[13px] text-slate-700 leading-relaxed">
          Otomatik senkronizasyon varsayılan olarak <strong className="font-medium">30 dakikada bir</strong> çalışır.
          Kaynak bazında özel otomatik senkron ayarlarını düzenleme ekranından yapabilirsiniz.
        </p>
        <details className="mt-2 text-[12px] text-slate-500">
          <summary className="cursor-pointer hover:text-slate-700 font-medium">Teknik bilgi</summary>
          <p className="mt-1.5 font-mono text-[11px] text-slate-500">
            Sunucu cron zamanlaması: XML_SOURCE_CRON_SCHEDULE ortam değişkeni ile yapılandırılır.
          </p>
        </details>
      </div>

      {/* Table card */}
      <div className="wn-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Kaynak adı veya URL ara…"
                className="wn-input w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="wn-select sm:w-40"
              aria-label="Durum filtresi"
            >
              <option value="">Tüm durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="error">Hatalı</option>
            </select>
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="wn-select sm:w-44"
              aria-label="Sıralama"
            >
              <option value="lastSync">Son senkron</option>
              <option value="name">Ad</option>
              <option value="error">Hata durumu</option>
            </select>
          </div>
          {(searchQuery || statusFilter) && !loading && (
            <p className="text-[12px] text-slate-500 mt-2">
              {filteredList.length} kaynak gösteriliyor
            </p>
          )}
        </div>

        <div className="px-2 sm:px-3 pb-2">
          <Table
            data={filteredList}
            columns={columns}
            keyExtractor={r => r.id}
            loading={loading}
            emptyState={
              !loading && list.length === 0
                ? <TableEmptyState onCreate={openCreate} />
                : showFilteredEmpty
                  ? (
                    <div className="empty-state py-12 px-6">
                      <p className="empty-state-title">Filtrelere uygun kaynak bulunamadı</p>
                      <p className="empty-state-desc mx-auto">Arama veya filtre kriterlerini değiştirin.</p>
                    </div>
                  )
                  : undefined
            }
          />
        </div>
      </div>

      {/* Tips */}
      <div className="wn-card px-5 py-4">
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Kullanım ipuçları</p>
        <ul className="grid sm:grid-cols-2 gap-2 text-[13px] text-slate-600">
          <li className="flex gap-2"><span className="text-indigo-400">•</span>XML URL herkese açık ve erişilebilir olmalıdır.</li>
          <li className="flex gap-2"><span className="text-indigo-400">•</span>SKU veya barkod alanı benzersiz olmalıdır.</li>
          <li className="flex gap-2"><span className="text-indigo-400">•</span>Görsel URL&apos;leri mümkünse HTTPS olmalıdır.</li>
          <li className="flex gap-2"><span className="text-indigo-400">•</span>Büyük XML dosyalarında senkron biraz sürebilir.</li>
        </ul>
      </div>

      {/* Modal — logic unchanged */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{editing ? 'Kaynağı düzenle' : 'Yeni XML kaynağı'}</h2>

            <div>
              <label className="wn-label">Ad</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="wn-input w-full"
                placeholder="Örn. Tedarikçi A — günlük feed"
              />
            </div>
            <div>
              <label className="wn-label">XML URL</label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="wn-input w-full font-mono text-[13px]"
                placeholder="https://..."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <div>
                <label className="wn-label">Çift kayıt</label>
                <select
                  value={duplicateMode}
                  onChange={e => setDuplicateMode(e.target.value as DuplicateMode)}
                  className="wn-select"
                >
                  <option value="update">Güncelle (önerilen)</option>
                  <option value="skip">Atla</option>
                  <option value="error">Hata ver</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 mt-6">
                <input type="checkbox" checked={skipZeroStock} onChange={e => setSkipZeroStock(e.target.checked)} />
                Stok 0 satırlarını atla
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={e => setAutoSyncEnabled(e.target.checked)}
                />
                Otomatik senkron açık
              </label>

              {autoSyncEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="wn-label">Sıklık</label>
                    <select
                      value={autoSyncInterval}
                      onChange={e => setAutoSyncInterval(e.target.value as AutoSyncInterval)}
                      className="wn-select w-full"
                    >
                      <option value="1">1 saatte bir</option>
                      <option value="6">6 saatte bir</option>
                      <option value="12">12 saatte bir</option>
                      <option value="daily">Günlük</option>
                    </select>
                  </div>
                  <div>
                    <label className="wn-label">Saat</label>
                    <input
                      type="time"
                      value={autoSyncTime}
                      onChange={e => setAutoSyncTime(e.target.value)}
                      className="wn-input w-full"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Günlük seçimde belirtilen saatte; aralıklı seçimde o saatten itibaren tekrarlar.
                    </p>
                  </div>
                  <div>
                    <label className="wn-label">Zaman dilimi</label>
                    <input
                      value={autoSyncTimezone}
                      onChange={e => setAutoSyncTimezone(e.target.value)}
                      className="wn-input w-full font-mono text-[13px]"
                      placeholder="Europe/Istanbul"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void runPreview()}
                disabled={previewBusy}
                className="btn btn-secondary"
              >
                {previewBusy ? 'Önizleniyor…' : 'XML alanlarını yükle'}
              </button>
            </div>

            {previewFields.length > 0 && (
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <p className="text-xs text-slate-500 px-3 py-2 bg-slate-50">Alan eşleştirme (bir kez kaydedilir)</p>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {previewFields.map(field => (
                    <div key={field} className="flex items-center gap-2 px-3 py-2 text-xs">
                      <span className="font-mono text-indigo-700 flex-1 truncate" title={field}>{field}</span>
                      <select
                        value={mapping[field] === '__ignore__' ? '' : (mapping[field] ?? '')}
                        onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))}
                        className="wn-select min-w-[140px] text-xs py-1"
                      >
                        <option value="">— Seçin —</option>
                        {FIXED_MAPPING_TARGETS.map(tf => (
                          <option key={tf.key} value={tf.key}>{tf.label}</option>
                        ))}
                        <option value="__ignore__">— Yoksay —</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost">
                İptal
              </button>
              <button type="button" onClick={() => void save()} className="btn btn-primary">
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
