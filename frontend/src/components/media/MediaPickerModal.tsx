import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Check,
  ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  Upload,
  X,
} from 'lucide-react';
import {
  DEFAULT_MEDIA_FOLDER,
  MEDIA_FOLDERS,
  MEDIA_SORT_OPTIONS,
  mediaFolderLabel,
  type MediaFolderSlug,
  type MediaSortValue,
} from '../../constants/mediaFolders';
import {
  fetchMediaAssets,
  formatMediaBytes,
  mediaAssetUrl,
  uploadMediaAsset,
  validateMediaFile,
  type MediaAsset,
} from '../../services/media.service';
import { normalizeImageUrl } from '../../utils/imageUtils';

export type MediaPickerModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, asset?: MediaAsset) => void;
  title?: string;
  selectedUrl?: string;
  uploadFolder?: MediaFolderSlug;
};

function assetMatchesUrl(asset: MediaAsset, url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  const a = mediaAssetUrl(asset);
  return u === a || u === asset.url || u === (asset.secureUrl ?? '');
}

export default function MediaPickerModal({
  open,
  onClose,
  onSelect,
  title = 'Görsel seç',
  selectedUrl = '',
  uploadFolder = DEFAULT_MEDIA_FOLDER,
}: MediaPickerModalProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<MediaSortValue>('newest');
  const [picked, setPicked] = useState<MediaAsset | null>(null);
  const [dragOver, setDragOver] = useState(false);
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
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Görseller yüklenemedi.');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [activeFolder, search, sort]);

  useEffect(() => {
    if (!open) return;
    setPicked(null);
    setSearchInput('');
    setSearch('');
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, open]);

  useEffect(() => {
    if (!open || !selectedUrl.trim() || assets.length === 0) return;
    const match = assets.find(a => assetMatchesUrl(a, selectedUrl));
    if (match) setPicked(match);
  }, [open, selectedUrl, assets]);

  const confirmSelection = (asset: MediaAsset) => {
    onSelect(mediaAssetUrl(asset), asset);
    onClose();
  };

  const uploadFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setUploading(true);
    let lastAsset: MediaAsset | null = null;
    for (const file of list) {
      const err = validateMediaFile(file);
      if (err) {
        toast.error(`${file.name}: ${err}`);
        continue;
      }
      try {
        const asset = await uploadMediaAsset(file, uploadFolder);
        lastAsset = asset;
        setAssets(prev => [asset, ...prev.filter(a => a.id !== asset.id)]);
        setPicked(asset);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Görsel yüklenemedi.');
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (lastAsset) {
      toast.success('Görsel yüklendi ve seçildi.');
      confirmSelection(lastAsset);
    }
  };

  if (!open) return null;

  const pickedUrl = picked ? mediaAssetUrl(picked) : selectedUrl.trim();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-picker-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 id="media-picker-title" className="text-[16px] font-semibold text-slate-900">
              {title}
            </h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Kütüphaneden seçin veya bilgisayarınızdan yükleyin
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Dosya adı ile ara…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>
          <select
            value={activeFolder}
            onChange={e => setActiveFolder(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            {MEDIA_FOLDERS.map(f => (
              <option key={f.slug} value={f.slug}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as MediaSortValue)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            {MEDIA_SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>

        <div
          className={`mx-5 mt-3 rounded-xl border-2 border-dashed px-4 py-3 transition-colors shrink-0 ${
            dragOver ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 bg-slate-50/80'
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[12px] text-slate-600">
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>
                Yükleme klasörü: <strong>{mediaFolderLabel(uploadFolder)}</strong> · JPG, PNG, WEBP, SVG ·
                maks. 5 MB
              </span>
            </div>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[12px] font-medium hover:bg-indigo-500 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? 'Yükleniyor…' : 'Bilgisayardan yükle'}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {loading && assets.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : loadError && assets.length === 0 ? (
            <p className="text-center text-[13px] text-rose-600 py-12">{loadError}</p>
          ) : assets.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-[13px] text-slate-600">Bu aramada görsel bulunamadı.</p>
              <p className="text-[12px] text-slate-400 mt-1">Yukarıdan yeni görsel yükleyebilirsiniz.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {assets.map(asset => {
                const url = mediaAssetUrl(asset);
                const src = normalizeImageUrl(url) ?? url;
                const isPicked = picked?.id === asset.id;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setPicked(asset)}
                    onDoubleClick={() => confirmSelection(asset)}
                    className={`group text-left rounded-xl border overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                      isPicked
                        ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-md'
                        : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-slate-100 relative">
                      <img
                        src={src}
                        alt={asset.originalName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isPicked && (
                        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="p-2 bg-white">
                      <p className="text-[11px] font-medium text-slate-800 truncate" title={asset.originalName}>
                        {asset.originalName}
                      </p>
                      <p className="text-[10px] text-slate-400">{formatMediaBytes(asset.size)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <p className="text-[12px] text-slate-500 min-w-0 truncate flex-1">
            {picked
              ? `Seçili: ${picked.originalName}`
              : pickedUrl
                ? 'Mevcut görsel korunacak — yeni seçim yapın veya iptal edin'
                : 'Listeden bir görsel seçin'}
          </p>
          <div className="flex gap-2 shrink-0">
            <button type="button" className="btn btn-secondary text-[13px]" onClick={onClose}>
              İptal
            </button>
            <button
              type="button"
              className="btn btn-primary text-[13px]"
              disabled={!picked}
              onClick={() => picked && confirmSelection(picked)}
            >
              Bu görseli kullan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
