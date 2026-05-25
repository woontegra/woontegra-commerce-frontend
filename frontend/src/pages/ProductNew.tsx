import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/product.service';
import { categoryService } from '../services/category.service';
import { refreshOnboardingUserInStore } from '../utils/onboardingClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormValues {
  name:        string;
  description: string;
  price:       string;
  stock:       string;
  sku:         string;
  categoryId:  string;
  isActive:    boolean;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast { id: number; type: 'success' | 'error'; msg: string }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = (type: Toast['type'], msg: string) => {
    const id = Date.now();
    setToasts(t => [...t, { id, type, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };
  return { toasts, success: (m: string) => add('success', m), error: (m: string) => add('error', m) };
}

// ─── Image upload zone ────────────────────────────────────────────────────────

interface ImageItem { url: string; uploading?: boolean; error?: string }

function ImageUploadZone({
  images, onAdd, onRemove,
}: {
  images:   ImageItem[];
  onAdd:    (file: File) => void;
  onRemove: (url: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    Array.from(e.dataTransfer.files).forEach(f => {
      if (f.type.startsWith('image/')) onAdd(f);
    });
  }, [onAdd]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(f => onAdd(f));
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragEnter={e => { e.preventDefault(); setDragging(true); }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 ${
          dragging
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-700">Görsel ekle</p>
        <p className="text-xs text-slate-400 mt-1">Sürükle & bırak veya tıkla · PNG, JPG, WEBP · max 10 MB</p>
      </div>

      {/* Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map(img => (
            <div key={img.url} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              {img.uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                  <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : img.error ? (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-xs text-red-500 p-2 text-center">
                  {img.error}
                </div>
              ) : (
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              )}
              {!img.uploading && (
                <button
                  type="button"
                  onClick={() => onRemove(img.url)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-white/90 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                >
                  <svg className="w-3.5 h-3.5 text-slate-600 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
  label:     string;
  required?: boolean;
  error?:    string;
  children:  React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label} {required && <span className="text-red-400 normal-case font-normal">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── ProductNew page ──────────────────────────────────────────────────────────

export default function ProductNew() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const toast        = useToast();
  const [images, setImages]   = useState<ImageItem[]>([]);
  const [saving, setSaving]   = useState(false);

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: '', description: '', price: '', stock: '0',
      sku: '', categoryId: '', isActive: true,
    },
  });

  // Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const list = await categoryService.getAll();
      return Array.isArray(list) ? list : (list as any)?.data ?? [];
    },
  });

  // Handle image upload
  const handleAddImage = useCallback(async (file: File) => {
    const tempUrl = URL.createObjectURL(file);
    setImages(prev => [...prev, { url: tempUrl, uploading: true }]);
    try {
      const remoteUrl = await productService.uploadImage(file);
      setImages(prev => prev.map(img =>
        img.url === tempUrl ? { url: remoteUrl, uploading: false } : img
      ));
    } catch {
      setImages(prev => prev.map(img =>
        img.url === tempUrl ? { url: tempUrl, uploading: false, error: 'Yükleme başarısız' } : img
      ));
    }
  }, []);

  const handleRemoveImage = useCallback((url: string) => {
    setImages(prev => prev.filter(img => img.url !== url));
  }, []);

  // Submit
  const onSubmit = async (values: FormValues) => {
    const uploadedImages = images.filter(i => !i.uploading && !i.error).map(i => i.url);

    if (!values.name.trim()) return;
    if (!values.price || Number(values.price) <= 0) return;

    setSaving(true);
    try {
      const payload = {
        name:        values.name.trim(),
        description: values.description.trim() || undefined,
        price:       Number(values.price),
        stock:       Number(values.stock ?? 0),
        sku:         values.sku.trim() || undefined,
        categoryId:  values.categoryId || null,
        isActive:    values.isActive,
        images:      uploadedImages,
      };

      await productService.create(payload);
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await refreshOnboardingUserInStore();

      toast.success('Ürün başarıyla oluşturuldu!');
      setTimeout(() => navigate('/dashboard/products'), 800);
    } catch (err: any) {
      const d    = err?.response?.data;
      const code = d?.code ?? d?.error;
      if (code === 'PLAN_LIMIT_EXCEEDED' || code === 'PLAN_LIMIT_REACHED') {
        // services/api.ts: react-hot-toast + plan-limit-reached → PlanLimitModal
        return;
      }
      const msg = d?.message ?? d?.error ?? 'Ürün oluşturulamadı';
      toast.error(typeof msg === 'string' ? msg : 'Ürün oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  const pendingUploads = images.some(i => i.uploading);

  return (
    <div className="max-w-6xl mx-auto page-enter">

      {/* Toast */}
      <div className="fixed top-6 right-6 z-50 space-y-2 pointer-events-none">
        {toast.toasts.map(t => (
          <div key={t.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up pointer-events-auto max-w-sm ${
            t.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {t.type === 'success' ? (
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {t.msg}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard/products')}
              className="btn-icon btn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="page-title">Yeni Ürün</h1>
              <p className="page-subtitle">Ürün bilgilerini doldurarak kaydedin</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard/products')}
              className="btn-secondary btn"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving || pendingUploads}
              className="btn-primary btn"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Kaydediliyor...
                </>
              ) : pendingUploads ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Görseller yükleniyor...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Ürünü Kaydet
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Name + Description ─────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Basic info */}
            <div className="wn-card p-6 space-y-5">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs">1</span>
                Temel Bilgiler
              </h2>

              <Field label="Ürün Adı" required error={errors.name?.message}>
                <input
                  {...register('name', {
                    required: 'Ürün adı zorunludur',
                    minLength: { value: 2, message: 'En az 2 karakter giriniz' },
                  })}
                  placeholder="Örn: Pamuklu Tişört"
                  className={`wn-input ${errors.name ? 'border-red-300 focus:border-red-400' : ''}`}
                />
              </Field>

              <Field label="Açıklama" error={errors.description?.message}>
                <textarea
                  {...register('description')}
                  rows={6}
                  placeholder="Ürünün detaylı açıklamasını buraya yazın..."
                  className="wn-input resize-y min-h-[120px]"
                />
              </Field>
            </div>

            {/* Pricing & inventory */}
            <div className="wn-card p-6 space-y-5">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs">2</span>
                Fiyatlandırma ve Stok
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Fiyat (₺)" required error={errors.price?.message}>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₺</span>
                    <input
                      {...register('price', {
                        required: 'Fiyat zorunludur',
                        validate: v => Number(v) > 0 || 'Fiyat 0\'dan büyük olmalıdır',
                      })}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className={`wn-input pl-8 ${errors.price ? 'border-red-300' : ''}`}
                    />
                  </div>
                </Field>

                <Field label="Stok Adedi" error={errors.stock?.message}>
                  <input
                    {...register('stock', {
                      validate: v => !v || Number(v) >= 0 || 'Stok negatif olamaz',
                    })}
                    type="number"
                    min="0"
                    placeholder="0"
                    className={`wn-input ${errors.stock ? 'border-red-300' : ''}`}
                  />
                </Field>
              </div>

              <Field label="SKU / Stok Kodu">
                <input
                  {...register('sku')}
                  placeholder="Örn: TSH-001-M-RED"
                  className="wn-input"
                />
              </Field>
            </div>

            {/* Organization */}
            <div className="wn-card p-6 space-y-5">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center text-amber-600 text-xs">3</span>
                Kategori ve Durum
              </h2>

              <Field label="Kategori">
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className="wn-select">
                      <option value="">— Kategori seçin —</option>
                      {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  )}
                />
              </Field>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={field.value}
                      onClick={() => field.onChange(!field.value)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-0.5 ${
                        field.value ? 'bg-indigo-500' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        field.value ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  )}
                />
                <div>
                  <p className="text-sm font-medium text-slate-800">Aktif ürün</p>
                  <p className="text-xs text-slate-400 mt-0.5">Aktif ürünler mağazanızda görünür</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Images ─────────────────────────────────────────────── */}
          <div className="space-y-5">
            <div className="wn-card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-purple-100 flex items-center justify-center text-purple-600 text-xs">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                Görseller
              </h2>
              <ImageUploadZone
                images={images}
                onAdd={handleAddImage}
                onRemove={handleRemoveImage}
              />
              {images.length > 0 && (
                <p className="text-xs text-slate-400 text-center">
                  {images.filter(i => !i.uploading && !i.error).length} görsel yüklendi
                </p>
              )}
            </div>

            {/* Tips */}
            <div className="wn-card p-5 bg-indigo-50 border-indigo-100">
              <h3 className="text-xs font-semibold text-indigo-700 mb-3">İpuçları</h3>
              <ul className="space-y-2">
                {[
                  'Ürün adı arama sonuçlarında görünür',
                  'Birden fazla görsel ekleyebilirsiniz',
                  'Stok 0 olarak bırakılabilir',
                  'Kategori sonradan değiştirilebilir',
                ].map(tip => (
                  <li key={tip} className="flex items-start gap-2 text-xs text-indigo-600">
                    <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Mobile sticky footer */}
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-slate-200 p-4 flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/products')}
            className="btn-secondary btn flex-1"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={saving || pendingUploads}
            className="btn-primary btn flex-1"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
