/**
 * Kayıtlı XML kaynakları — liste, güncelleme, eşleştirme düzenleme
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';

export type DuplicateMode = 'skip' | 'update' | 'error';

export interface XmlSourceRow {
  id: string;
  name: string;
  url: string;
  mappingJson: Record<string, string>;
  customTargetLabels?: Record<string, string>;
  customTargets?: Array<{ key: string; label: string }>;
  duplicateMode: DuplicateMode;
  skipZeroStock: boolean;
  isActive: boolean;
  lastFetchedAt: string | null;
  lastSyncError: string | null;
}

function normalizeRow(raw: Record<string, unknown>): XmlSourceRow {
  const mapping =
    (raw.mappingJson as Record<string, string> | undefined) ??
    (raw.mapping as Record<string, string> | undefined) ??
    {};
  return {
    id:            String(raw.id),
    name:          String(raw.name ?? ''),
    url:           String(raw.url ?? ''),
    mappingJson:   mapping,
    customTargetLabels: (raw.customTargetLabels as Record<string, string> | undefined) ?? {},
    customTargets: (raw.customTargets as Array<{ key: string; label: string }> | undefined) ?? [],
    duplicateMode: (raw.duplicateMode as DuplicateMode) ?? 'update',
    skipZeroStock: Boolean(raw.skipZeroStock),
    isActive:      raw.isActive !== false,
    lastFetchedAt:
      (raw.lastFetchedAt as string | null | undefined) ??
      (raw.lastSyncAt as string | null | undefined) ??
      null,
    lastSyncError: (raw.lastSyncError as string | null) ?? null,
  };
}

function unwrapList(raw: unknown): XmlSourceRow[] {
  const arr = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
      ? (raw as { data: unknown[] }).data
      : [];
  return arr.map(r => normalizeRow(r as Record<string, unknown>));
}

function isFileLocalUrl(url: string): boolean {
  return url.startsWith('file-local://');
}

export interface XmlImportSavedPanelProps {
  refreshKey?: number;
  onEditMapping: (source: XmlSourceRow) => void;
  onSyncComplete: (summary: {
    total?: number;
    imported?: number;
    updated?: number;
    skipped?: number;
    failed?: number;
  }) => void;
}

export default function XmlImportSavedPanel({ refreshKey = 0, onEditMapping, onSyncComplete }: XmlImportSavedPanelProps) {
  const [list, setList]       = useState<XmlSourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/xml-sources');
      const raw = (r.data as { data?: unknown })?.data ?? r.data;
      setList(unwrapList(raw));
    } catch {
      toast.error('Kayıtlı XML listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const syncSource = async (row: XmlSourceRow) => {
    if (!row.isActive) {
      toast.error('Kaynak pasif. Düzenle ile aktifleştirin.');
      return;
    }
    setSyncingId(row.id);
    try {
      const r = await apiClient.post(
        `/xml-sources/${row.id}/sync`,
        {},
        { skipErrorToast: true, timeout: 120_000 },
      );
      const s = (r.data as { summary?: Record<string, number> })?.summary;
      toast.success(
        `Güncelleme tamamlandı: ${s?.imported ?? 0} eklendi, ${s?.updated ?? 0} güncellendi.`,
        { duration: 5000 },
      );
      onSyncComplete({
        total:    s?.total,
        imported: s?.imported,
        updated:  s?.updated,
        skipped:  s?.skipped,
        failed:   s?.failed,
      });
      void load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err?.response?.data?.error ?? err?.message ?? 'Güncelleme başarısız.');
    } finally {
      setSyncingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500 py-8 text-center">Kayıtlı XML kaynakları yükleniyor…</p>;
  }

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center space-y-3">
        <p className="text-gray-600">Henüz kayıtlı XML entegrasyonu yok.</p>
        <p className="text-sm text-gray-500">
          “Yeni XML ekle” sekmesinden URL ile içe aktarırken kaydı saklayabilir veya{' '}
          <Link to="/dashboard/xml-sources" className="text-indigo-600 font-medium hover:underline">
            XML kaynakları
          </Link>{' '}
          sayfasından ekleyebilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Kayıtlı eşleştirmeniz korunur. Barkod veya SKU ile eşleşen ürünler güncellenir; yeni olanlar eklenir.
      </p>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase">
              <th className="px-4 py-3">Ad</th>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">Son çekim</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.map(row => (
              <tr key={row.id} className="hover:bg-gray-50/80">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{row.name}</span>
                  {!row.isActive && (
                    <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Pasif</span>
                  )}
                  {row.lastSyncError && (
                    <p className="text-xs text-red-600 mt-0.5 truncate max-w-[200px]" title={row.lastSyncError}>
                      {row.lastSyncError}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 max-w-xs truncate text-gray-600" title={row.url}>
                  {isFileLocalUrl(row.url) ? 'Dosya yüklemesi (eşleştirme kaydı)' : row.url}
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {row.lastFetchedAt
                    ? new Date(row.lastFetchedAt).toLocaleString('tr-TR')
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                  <button
                    type="button"
                    disabled={syncingId === row.id || !row.isActive || isFileLocalUrl(row.url)}
                    title={
                      isFileLocalUrl(row.url)
                        ? 'Dosya kaynağında otomatik çekim yok; eşleştirmeyi düzenleyip yeni dosya yükleyin veya feed URL ekleyin.'
                        : undefined
                    }
                    onClick={() => void syncSource(row)}
                    className="text-indigo-600 font-semibold hover:underline disabled:opacity-40"
                  >
                    {syncingId === row.id ? 'Güncelleniyor…' : "XML'i Güncelle"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditMapping(row)}
                    className="text-gray-600 font-medium hover:underline"
                  >
                    Eşleştirme
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Link
          to="/dashboard/xml-sources"
          className="text-sm text-indigo-600 font-medium hover:underline"
        >
          Gelişmiş ayarlar (otomatik çekme, sil) →
        </Link>
      </div>
    </div>
  );
}
