import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { inputCls } from './builderSettingsUi';
import { normalizeImageUrl } from '../../utils/imageUtils';
import {
  isBuilderImageUploadAvailable,
  uploadBuilderImage,
  validateBuilderImageFile,
} from '../../services/storeMediaUpload.service';
import type { MediaFolderSlug } from '../../constants/mediaFolders';

type BuilderImageFieldProps = {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  onUploadComplete?: (url: string) => void;
  helperText?: string;
  recommendedSize?: string;
  usageHint?: string;
  acceptedFormats?: string;
  accept?: string;
  maxSizeMb?: number;
  folder?: MediaFolderSlug;
};

export default function BuilderImageField({
  label = 'Görsel',
  value,
  onChange,
  onUploadComplete,
  helperText,
  recommendedSize,
  usageHint,
  acceptedFormats = 'JPG, PNG, WEBP, SVG',
  accept = 'image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg',
  maxSizeMb = 5,
  folder = 'builder',
}: BuilderImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

  const uploadAvailable = isBuilderImageUploadAvailable();
  const trimmed = value.trim();
  const previewSrc = trimmed ? normalizeImageUrl(trimmed) : null;

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setPreviewError(false);
    const validationError = validateBuilderImageFile(file, maxSizeMb);
    if (validationError) {
      setError(validationError);
      return;
    }
    const previous = trimmed;
    setUploading(true);
    try {
      const url = await uploadBuilderImage(file, folder);
      onChange(url);
      onUploadComplete?.(url);
      toast.success('Görsel yüklendi ve medya kütüphanesine eklendi.');
    } catch (e: unknown) {
      onChange(previous);
      setError(e instanceof Error ? e.message : 'Görsel yüklenemedi.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[12px] font-medium text-slate-600 mb-1">{label}</label>
        {(helperText || recommendedSize || usageHint) && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 space-y-1 mb-2">
            {helperText && <p className="text-[11px] text-slate-600">{helperText}</p>}
            {recommendedSize && (
              <p className="text-[11px] text-slate-700">
                <span className="font-medium">Önerilen ölçü:</span> {recommendedSize}
              </p>
            )}
            {usageHint && <p className="text-[11px] text-slate-500">{usageHint}</p>}
            <p className="text-[10px] text-slate-400">
              Format: {acceptedFormats} · Maks. {maxSizeMb} MB
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
        {previewSrc && !previewError ? (
          <img
            src={previewSrc}
            alt=""
            className="w-full h-32 object-cover bg-slate-100"
            onError={() => setPreviewError(true)}
          />
        ) : (
          <div className="h-32 flex flex-col items-center justify-center gap-1.5 text-slate-400">
            <ImageIcon className="w-6 h-6" />
            <span className="text-[12px]">
              {previewError ? 'Görsel yüklenemedi' : 'Görsel önizlemesi'}
            </span>
          </div>
        )}
      </div>

      {uploadAvailable ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={uploading}
            onChange={e => void handleFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-[12px] font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {uploading ? 'Yükleniyor…' : 'Bilgisayardan Yükle'}
          </button>
          {trimmed && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => {
                onChange('');
                setError(null);
                setPreviewError(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Kaldır
            </button>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Bilgisayardan yükleme için medya altyapısı gerekli. Manuel URL kullanabilirsiniz.
        </p>
      )}

      {error && (
        <p className="text-[12px] text-rose-600">{error}</p>
      )}

      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1">Manuel URL</label>
        <input
          type="url"
          className={inputCls}
          value={value}
          placeholder="https://..."
          disabled={uploading}
          onChange={e => {
            setError(null);
            setPreviewError(false);
            onChange(e.target.value);
          }}
        />
      </div>
    </div>
  );
}
