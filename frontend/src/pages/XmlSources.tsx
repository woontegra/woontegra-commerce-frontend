/**
 * Kalıcı XML feed kaynakları — URL + mapping bir kez kaydedilir; senkron / cron ile güncellenir.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/apiClient';
import toast from 'react-hot-toast';
import { buildMappingWithAutoSuggest, FIXED_MAPPING_TARGETS } from '../utils/xmlMapping';

type DuplicateMode = 'skip' | 'update' | 'error';
type AutoSyncInterval = 'daily' | '1' | '6' | '12';

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
  createdAt: string;
  updatedAt: string;
}

function normalizeSourceRow(raw: XmlSourceRow): XmlSourceRow {
  const mapping = raw.mappingJson ?? raw.mapping ?? {};
  return {
    ...raw,
    mapping,
    lastSyncAt: raw.lastFetchedAt ?? raw.lastSyncAt ?? null,
  };
}

interface PreviewPayload {
  xmlFields: string[];
  totalRows: number;
}

function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) return (raw as any).data as T[];
  return [];
}

export default function XmlSources() {
  const [list, setList]       = useState<XmlSourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<XmlSourceRow | null>(null);

  const [name, setName]                 = useState('');
  const [url, setUrl]                   = useState('');
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('update');
  const [skipZeroStock, setSkipZeroStock] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState<AutoSyncInterval>('daily');
  const [autoSyncTime, setAutoSyncTime] = useState('03:00'); // HH:mm
  const [autoSyncTimezone, setAutoSyncTimezone] = useState('Europe/Istanbul');
  const [mapping, setMapping]           = useState<Record<string, string>>({});
  const [previewFields, setPreviewFields] = useState<string[]>([]);
  const [previewBusy, setPreviewBusy]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/xml-sources');
      const raw = (r.data as any)?.data ?? r.data;
      setList(unwrapList<XmlSourceRow>(raw).map(normalizeSourceRow));
    } catch {
      toast.error('Kaynaklar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

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
      const raw = r.data as any;
      const data = (raw?.data ?? raw) as PreviewPayload;
      if (!data?.xmlFields?.length) {
        toast.error('Önizleme verisi alınamadı.');
        return;
      }
      setPreviewFields(data.xmlFields);
      setMapping(buildMappingWithAutoSuggest(data.xmlFields, mapping));
      toast.success(`${data.totalRows ?? data.xmlFields.length} ürün satırı algılandı. Eşleştirmeyi kontrol edin.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? e?.message ?? 'Önizleme başarısız.');
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
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'Kaydedilemedi.');
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
    try {
      const r = await apiClient.post(
        `/xml-sources/${row.id}/sync`,
        {},
        { skipErrorToast: true, timeout: 120_000 },
      );
      const s = (r.data as any)?.summary ?? r.data?.summary;
      toast.success(
        `Senkron tamamlandı: ${s?.imported ?? 0} eklendi, ${s?.updated ?? 0} güncellendi, ${s?.skipped ?? 0} atlandı.`,
        { duration: 5000 },
      );
      void load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'Senkron başarısız.');
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">XML kaynakları</h1>
          <p className="text-sm text-slate-500 mt-1">
            Feed URL’nizi ve eşleştirmeyi bir kez kaydedin; manuel veya otomatik senkronla ürünler güncellenir.
            Cron varsayılan: 30 dakikada bir (
            <code className="text-xs bg-slate-100 px-1 rounded">XML_SOURCE_CRON_SCHEDULE</code>
            ).
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/dashboard/products/import/xml?mode=saved"
            className="px-4 py-2 text-sm font-medium text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-50"
          >
            XML içe aktarma
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
          >
            Yeni kaynak
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Yükleniyor…</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-500">
          Henüz kayıtlı XML yok. “Yeni kaynak” ile URL ve mapping ekleyin.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-600 uppercase">
                <th className="px-4 py-3">Ad</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Aktif</th>
                <th className="px-4 py-3">Son senkron</th>
                <th className="px-4 py-3">Hata</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                  <td className="px-4 py-3 max-w-xs truncate text-slate-600" title={row.url}>{row.url}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void toggleActive(row)}
                      className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                        row.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {row.isActive ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString('tr-TR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-red-600 text-xs max-w-[200px] truncate" title={row.lastSyncError ?? ''}>
                    {row.lastSyncError ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => void syncNow(row)}
                      disabled={!row.isActive}
                      className="text-indigo-600 font-medium hover:underline disabled:opacity-40"
                    >
                      XML'i Güncelle
                    </button>
                    <button type="button" onClick={() => openEdit(row)} className="text-slate-600 font-medium hover:underline">
                      Düzenle
                    </button>
                    <button type="button" onClick={() => void remove(row)} className="text-red-600 font-medium hover:underline">
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{editing ? 'Kaynağı düzenle' : 'Yeni XML kaynağı'}</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ad</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Örn. Tedarikçi A — günlük feed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">XML URL</label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                placeholder="https://..."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Çift kayıt</label>
                <select
                  value={duplicateMode}
                  onChange={e => setDuplicateMode(e.target.value as DuplicateMode)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Sıklık</label>
                    <select
                      value={autoSyncInterval}
                      onChange={e => setAutoSyncInterval(e.target.value as AutoSyncInterval)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                    >
                      <option value="1">1 saatte bir</option>
                      <option value="6">6 saatte bir</option>
                      <option value="12">12 saatte bir</option>
                      <option value="daily">Günlük</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Saat</label>
                    <input
                      type="time"
                      value={autoSyncTime}
                      onChange={e => setAutoSyncTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Örn. 03:00 seçerseniz günlük 03:00’te, 6 saatte bir seçerseniz 03:00/09:00/15:00/21:00 çalışır.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Zaman dilimi</label>
                    <input
                      value={autoSyncTimezone}
                      onChange={e => setAutoSyncTimezone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono bg-white"
                      placeholder="Europe/Istanbul"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">IANA timezone (varsayılan: Europe/Istanbul)</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void runPreview()}
                disabled={previewBusy}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
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
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs min-w-[140px]"
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
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-xl border border-slate-200">
                İptal
              </button>
              <button type="button" onClick={() => void save()} className="px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
