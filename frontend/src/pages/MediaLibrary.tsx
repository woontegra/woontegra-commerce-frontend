import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  Copy,
  FolderOpen,
  ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  DEFAULT_MEDIA_FOLDER,
  MEDIA_FOLDERS,
  MEDIA_SORT_OPTIONS,
  mediaFolderLabel,
  type MediaFolderSlug,
  type MediaSortValue,
} from '../constants/mediaFolders';
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
    <div className="wn-card px-4 py-3 min-w-0 flex-1">
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

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="wn-card overflow-hidden animate-pulse">
          <div className="aspect-[4/3] bg-slate-100" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-slate-100 rounded w-3/4" />
            <div className="h-2.5 bg-slate-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MediaLibrary() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [uploadFolder, setUploadFolder] = useState<MediaFolderSlug>(DEFAULT_MEDIA_FOLDER);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<MediaSortValue>('newest');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchMediaAssets({
        folder: activeFolder,
        search,
        sort,
        limit: 500,
      });
      setAssets(data.assets);
      setTotal(data.total);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Medya dosyaları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [activeFolder, search, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

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
        const asset = await uploadMediaAsset(file, uploadFolder);
        if (activeFolder === 'all' || activeFolder === uploadFolder) {
          setAssets(prev => [asset, ...prev.filter(a => a.id !== asset.id)]);
          setTotal(prev => prev + 1);
        } else {
          void load();
        }
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
      storageLabel: assets.length > 0 ? formatMediaBytes(storageBytes) : '—',
    };
  }, [assets]);

  const folderLabel = activeFolder === 'all' ? 'Tüm Görseller' : mediaFolderLabel(activeFolder);

  if (loadError && !loading && assets.length === 0) {
    return (
      <div className="w-full max-w-lg mx-auto wn-card p-8 text-center">
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
    <div className="w-full min-h-[calc(100vh-8rem)] flex flex-col gap-5">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">Medya Kütüphanesi</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Görsellerinizi klasörler halinde yönetin, vitrin tasarımlarında kullanın.
          </p>
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-500 disabled:opacity-50 shrink-0"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Görsel Yükle
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryMetric label="Toplam Görsel" value={String(total)} sub={folderLabel} />
        <SummaryMetric label="Bu Ay Yüklenen" value={String(stats.thisMonth)} />
        <SummaryMetric label="Kullanılan Depolama" value={stats.storageLabel} />
        <SummaryMetric label="Desteklenen Formatlar" value="JPG, PNG, WEBP, SVG" sub="Maks. 5 MB" />
      </div>

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
        <aside className="lg:w-56 xl:w-64 shrink-0">
          <div className="wn-card p-3">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide px-2 pb-2 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              Klasörler
            </p>
            <nav className="space-y-0.5">
              {MEDIA_FOLDERS.map(folder => (
                <button
                  key={folder.slug}
                  type="button"
                  onClick={() => setActiveFolder(folder.slug)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    activeFolder === folder.slug
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {folder.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Dosya adı ile ara…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as MediaSortValue)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              {MEDIA_SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </button>
          </div>

          <div
            className={`wn-card border-2 border-dashed px-5 py-5 transition-colors ${
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-slate-700">Görselleri buraya sürükleyin</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">JPG, PNG, WEBP, SVG · max 5 MB</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <select
                  value={uploadFolder}
                  onChange={e => setUploadFolder(e.target.value as MediaFolderSlug)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700"
                >
                  {MEDIA_FOLDERS.filter(f => f.slug !== 'all').map(folder => (
                    <option key={folder.slug} value={folder.slug}>{folder.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Dosya Seç
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <GridSkeleton />
          ) : assets.length === 0 ? (
            <div className="wn-card border border-dashed border-slate-200 bg-slate-50/40 px-6 py-10 text-center">
              <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-[14px] font-medium text-slate-600">
                {search ? 'Arama sonucu bulunamadı.' : 'Bu klasörde henüz görsel yok.'}
              </p>
              <p className="text-[13px] text-slate-500 mt-1.5">
                {search
                  ? 'Farklı bir arama terimi deneyin veya filtreyi temizleyin.'
                  : 'Yukarıdaki alandan görsel yükleyerek başlayın.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {assets.map(asset => {
                const preview = normalizeImageUrl(asset.url) ?? asset.url;
                return (
                  <article key={asset.id} className="wn-card overflow-hidden flex flex-col">
                    <div className="aspect-[4/3] bg-slate-100 relative">
                      <img
                        src={preview}
                        alt={asset.originalName}
                        className="w-full h-full object-cover"
                        loading="lazy"
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
                      <p className="text-[10px] text-indigo-600 font-medium">
                        {mediaFolderLabel(asset.folder || DEFAULT_MEDIA_FOLDER)}
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
      </div>
    </div>
  );
}
