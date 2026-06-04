import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ImageIcon, Trash2 } from 'lucide-react';
import {
  DEFAULT_MEDIA_FOLDER,
  type MediaFolderSlug,
} from '../../constants/mediaFolders';
import { normalizeImageUrl } from '../../utils/imageUtils';
import MediaPickerModal from './MediaPickerModal';

export type MediaImageFieldProps = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  uploadFolder?: MediaFolderSlug;
  pickerTitle?: string;
  emptyHint?: string;
  inputClassName?: string;
};

export default function MediaImageField({
  value,
  onChange,
  label = 'Görsel',
  hint,
  uploadFolder = DEFAULT_MEDIA_FOLDER,
  pickerTitle = 'Görsel seç',
  emptyHint = 'Medya kütüphanesinden seçin veya bilgisayarınızdan yükleyin',
  inputClassName = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400',
}: MediaImageFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showAdvancedUrl, setShowAdvancedUrl] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const trimmed = value.trim();
  const previewSrc = trimmed ? normalizeImageUrl(trimmed) ?? trimmed : null;

  useEffect(() => {
    setPreviewError(false);
  }, [trimmed]);

  useEffect(() => {
    if (trimmed && !showAdvancedUrl) {
      const looksExternal =
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('//');
      if (looksExternal) {
        const inLibraryPath =
          trimmed.includes('/uploads/') ||
          trimmed.includes('/media/') ||
          trimmed.includes('cloudinary');
        if (!inLibraryPath) setShowAdvancedUrl(true);
      }
    }
  }, [trimmed, showAdvancedUrl]);

  return (
    <div className="space-y-3">
      {label && (
        <div>
          <p className="text-[12px] font-medium text-slate-600">{label}</p>
          {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
        </div>
      )}

      <div className="aspect-video rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
        {previewSrc && !previewError ? (
          <img
            src={previewSrc}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setPreviewError(true)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 gap-1.5">
            <ImageIcon className="w-8 h-8 text-slate-300" />
            <p className="text-[12px] text-slate-500">
              {previewError ? 'Görsel önizlenemedi' : 'Görsel önizlemesi'}
            </p>
            {!previewError && <p className="text-[11px] text-slate-400">{emptyHint}</p>}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-[12px] font-medium hover:bg-indigo-500"
        >
          Görsel seç
        </button>
        {trimmed && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setPreviewError(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[12px] font-medium text-slate-600 hover:bg-slate-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Kaldır
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowAdvancedUrl(v => !v)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-indigo-600"
      >
        {showAdvancedUrl ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        Gelişmiş: URL ile ekle
      </button>

      {showAdvancedUrl && (
        <div className="pt-1 space-y-1">
          <label className="block text-[11px] font-medium text-slate-500">Görsel URL</label>
          <input
            type="url"
            className={inputClassName}
            value={value}
            placeholder="https://..."
            onChange={e => {
              setPreviewError(false);
              onChange(e.target.value);
            }}
          />
          <p className="text-[10px] text-slate-400">
            Harici CDN veya eski kayıtlar için. Kayıt sırasında aynı alan kullanılır.
          </p>
        </div>
      )}

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={url => {
          onChange(url);
          setPreviewError(false);
        }}
        title={pickerTitle}
        selectedUrl={trimmed}
        uploadFolder={uploadFolder}
      />
    </div>
  );
}
