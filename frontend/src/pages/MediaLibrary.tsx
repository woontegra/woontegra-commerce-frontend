import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  Copy,
  ImageIcon,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  deleteMediaAsset,
  fetchMediaAssets,
  formatMediaBytes,
  uploadMediaAsset,
  validateMediaFile,
  type MediaAsset,
} from '../services/media.service';
import { normalizeImageUrl } from '../utils/imageUtils';

function SummaryMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="wn-card px-4 py-3 min-w-[120px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-[15px] font-semibold mt-1 text-slate-900">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MediaLibrary() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchMediaAssets();
      setAssets(data.assets);
      setTotal(data.total);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Medya dosyaları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setUploading(true);
    let successCount = 0;
    for (const file of list) {
      const err = validateMediaFile(file);
      if (err) {
        toast.error(`${file.name}: ${err}`);
        continue;
      }
      try {
        const asset = await uploadMediaAsset(file);
        setAssets(prev => [asset, ...prev.filter(a => a.id !== asset.id)]);
        setTotal(prev => prev + 1);
        successCount += 1;
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Medya yüklenemedi.');
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (successCount > 0) toast.success(`${successCount} görsel yüklendi.`);
  };

  const handleDelete = async (asset: MediaAsset) => {
    if (!window.confirm('Bu görseli silmek istediğinize emin misiniz?')) return;
    setDeletingId(asset.id);
    try {
      await deleteMediaAsset(asset.id);
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      setTotal(prev => Math.max(0, prev - 1));
      toast.success('Görsel silindi.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Görsel silinemedi.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL kopyalandı.');
    } catch {
      toast.error('URL kopyalanamadı.');
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = assets.filter(a => new Date(a.createdAt) >= monthStart).length;
    const storageBytes = assets.reduce((sum, a) => sum + (a.size || 0), 0);
    return {
      thisMonth,
      storageLabel: assets.length > 0 ? formatMediaBytes(storageBytes) : 'Hesaplanmadı',
    };
  }, [assets]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-[14px]">Medya kütüphanesi yükleniyor…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto wn-card p-8 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h1 className="text-[16px] font-semibold text-slate-900">Medya dosyaları yüklenemedi.</h1>
        <p className="text-[13px] text-slate-500 mt-2">{loadError}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-500"
        >
          <RefreshCw className="w-4 h-4" />
          Tekrar dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">Medya Kütüphanesi</h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-xl">
            Görsellerinizi yükleyin, yönetin ve vitrin tasarımlarında kullanın.
          </p>
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Görsel Yükle
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <SummaryMetric label="Toplam Görsel" value={String(total)} />
        <SummaryMetric label="Bu Ay Yüklenen" value={String(stats.thisMonth)} />
        <SummaryMetric label="Kullanılan Depolama" value={stats.storageLabel} />
        <SummaryMetric label="Desteklenen Formatlar" value="JPG, PNG, WEBP, SVG" sub="Maks. 5 MB" />
      </div>

      <div
        className={`wn-card border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/50'
        }`}
        onDragOver={e => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          void uploadFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={e => void uploadFiles(e.target.files)}
        />
        <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <p className="text-[14px] font-medium text-slate-700">Görselleri buraya sürükleyin</p>
        <p className="text-[12px] text-slate-500 mt-1">veya bilgisayarınızdan seçin · JPG, PNG, WEBP, SVG · max 5 MB</p>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Dosya Seç
        </button>
      </div>

      {assets.length === 0 ? (
        <div className="wn-card py-14 text-center px-4">
          <p className="text-[14px] font-medium text-slate-600">Henüz medya dosyası yüklenmedi.</p>
          <p className="text-[13px] text-slate-500 mt-1.5">
            İlk görselinizi yükleyerek vitrin tasarımlarında kullanmaya başlayın.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {assets.map(asset => {
            const preview = normalizeImageUrl(asset.url) ?? asset.url;
            return (
              <article key={asset.id} className="wn-card overflow-hidden flex flex-col">
                <div className="aspect-[4/3] bg-slate-100 relative">
                  <img
                    src={preview}
                    alt={asset.originalName}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <p className="text-[12px] font-medium text-slate-800 truncate" title={asset.originalName}>
                    {asset.originalName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatMediaBytes(asset.size)} · {formatDate(asset.createdAt)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-auto pt-1">
                    <button
                      type="button"
                      onClick={() => void handleCopyUrl(asset.url)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <Copy className="w-3 h-3" />
                      URL
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === asset.id}
                      onClick={() => void handleDelete(asset)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-rose-200 text-[11px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      {deletingId === asset.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Sil
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
