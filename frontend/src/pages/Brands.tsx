import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
import toast from 'react-hot-toast';
import { categoryService } from '../services/category.service';
import type { FlatCategoryNode } from '../services/category.service';

interface Brand {
  id:           string;
  name:         string;
  slug:         string;
  description:  string | null;
  logoUrl:      string | null;
  website:      string | null;
  isActive:     boolean;
  productCount: number;
  createdAt:    string;
}

// ── Modal ────────────────────────────────────────────────────────────────────

interface BrandModalProps {
  brand:    Brand | null;  // null = create mode
  onClose:  () => void;
  onSaved:  () => void;
}

function BrandModal({ brand, onClose, onSaved }: BrandModalProps) {
  const isEdit = !!brand;
  const [form, setForm] = useState({
    name:        brand?.name        ?? '',
    description: brand?.description ?? '',
    logoUrl:     brand?.logoUrl     ?? '',
    website:     brand?.website     ?? '',
  });
  const [saving,        setSaving]        = useState(false);
  const [assignToAll,   setAssignToAll]   = useState(false);
  const [assignEnabled, setAssignEnabled] = useState(false);
  const [selectedCats,  setSelectedCats]  = useState<Set<string>>(new Set());
  const [catSearch,     setCatSearch]     = useState('');
  const [categories,    setCategories]    = useState<FlatCategoryNode[]>([]);
  const [catsLoading,   setCatsLoading]   = useState(false);

  // Load categories when assign section is opened
  useEffect(() => {
    if (!assignEnabled || categories.length > 0) return;
    setCatsLoading(true);
    categoryService.getFlat()
      .then(setCategories)
      .catch(() => toast.error('Kategoriler yüklenemedi.'))
      .finally(() => setCatsLoading(false));
  }, [assignEnabled]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const toggleCat = (id: string) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredCats = categories.filter(c =>
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Marka adı zorunludur.'); return; }
    setSaving(true);
    try {
      let brandId: string;
      if (isEdit) {
        await apiClient.put(`/brands/${brand.id}`, form);
        brandId = brand.id;
        toast.success('Marka güncellendi.');
      } else {
        const res = await apiClient.post('/brands', form);
        const raw = res.data as any;
        brandId = (raw?.data ?? raw)?.id;
        toast.success('Marka oluşturuldu.');
      }

      // Assign brand to products if requested
      if (assignEnabled && brandId) {
        if (!assignToAll && selectedCats.size === 0) {
          toast('Kategori seçilmedi, marka yalnızca oluşturuldu.', { icon: 'ℹ️' });
        } else {
          const assignRes = await apiClient.post(`/brands/${brandId}/assign`, {
            assignToAll,
            categoryIds: assignToAll ? [] : Array.from(selectedCats),
          });
          const assignData = (assignRes.data as any)?.data ?? assignRes.data;
          toast.success(`${assignData?.updatedCount ?? 0} ürüne marka atandı.`);
        }
      }

      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Markayı Düzenle' : 'Yeni Marka'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marka Adı *</label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="örn. Nike, Adidas, Optimoon"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={2}
              placeholder="Marka hakkında kısa açıklama..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input
              type="text"
              value={form.logoUrl}
              onChange={set('logoUrl')}
              placeholder="https://ornek.com/logo.png"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
            {form.logoUrl && (
              <div className="mt-2 w-12 h-12 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                <img
                  src={form.logoUrl}
                  alt="logo"
                  className="max-w-full max-h-full object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Web Sitesi</label>
            <input
              type="text"
              value={form.website}
              onChange={set('website')}
              placeholder="https://markawebsitesi.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          {/* ── Kategorilere Ata section ────────────────────────────────────── */}
          <div className="border border-dashed border-gray-200 rounded-xl overflow-hidden">
            {/* Toggle header */}
            <button
              type="button"
              onClick={() => setAssignEnabled(v => !v)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                assignEnabled ? 'bg-indigo-50' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  assignEnabled ? 'bg-indigo-600 border-indigo-600' : 'border-gray-400'
                }`}>
                  {assignEnabled && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                </div>
                <span className={`text-sm font-semibold ${assignEnabled ? 'text-indigo-700' : 'text-gray-600'}`}>
                  Kategorilere Ata
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {assignEnabled ? 'Kapat' : 'Seçili kategorilerin ürünlerine markayı yaz'}
              </span>
            </button>

            {/* Expanded section */}
            {assignEnabled && (
              <div className="p-4 space-y-3 border-t border-dashed border-gray-200">
                {/* Tüm kategoriler toggle */}
                <label className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={assignToAll}
                    onChange={e => setAssignToAll(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Tüm Kategoriler</p>
                    <p className="text-xs text-amber-600">Mağazadaki tüm ürünlere bu marka yazılır</p>
                  </div>
                </label>

                {/* Per-category selection */}
                {!assignToAll && (
                  <>
                    <p className="text-xs text-gray-500 font-medium">veya belirli kategoriler seçin:</p>

                    {/* Search */}
                    <div className="relative">
                      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                      </svg>
                      <input
                        type="text"
                        value={catSearch}
                        onChange={e => setCatSearch(e.target.value)}
                        placeholder="Kategori ara..."
                        className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      />
                    </div>

                    {/* Category list */}
                    <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                      {catsLoading ? (
                        <div className="py-6 text-center text-xs text-gray-400">Yükleniyor...</div>
                      ) : filteredCats.length === 0 ? (
                        <div className="py-6 text-center text-xs text-gray-400">Kategori bulunamadı</div>
                      ) : (
                        filteredCats.map(cat => (
                          <label
                            key={cat.id}
                            className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                              selectedCats.has(cat.id) ? 'bg-indigo-50' : ''
                            }`}
                            style={{ paddingLeft: `${12 + cat.depth * 16}px` }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedCats.has(cat.id)}
                              onChange={() => toggleCat(cat.id)}
                              className="w-3.5 h-3.5 rounded accent-indigo-600 flex-shrink-0"
                            />
                            <span className="text-xs text-gray-700 truncate">{cat.name}</span>
                            {(cat._count?.products ?? 0) > 0 && (
                              <span className="ml-auto text-[10px] text-indigo-500 font-medium flex-shrink-0">
                                {cat._count!.products} ürün
                              </span>
                            )}
                          </label>
                        ))
                      )}
                    </div>

                    {selectedCats.size > 0 && (
                      <p className="text-xs text-indigo-600 font-medium">
                        {selectedCats.size} kategori seçili — alt kategoriler de dahil edilir
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            >
              {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
              {isEdit ? 'Güncelle' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ brand, onClose, onDeleted }: { brand: Brand; onClose: () => void; onDeleted: () => void }) {
  const [clearProducts, setClearProducts] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/brands/${brand.id}?clearProducts=${clearProducts}`);
      toast.success('Marka silindi.');
      onDeleted();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Silinemedi.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.062 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-900">"{brand.name}" silinecek</h3>
            <p className="text-sm text-gray-500">Bu işlem geri alınamaz.</p>
          </div>
        </div>

        {brand.productCount > 0 && (
          <label className="flex items-start gap-3 p-3 border border-amber-200 bg-amber-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={clearProducts}
              onChange={e => setClearProducts(e.target.checked)}
              className="mt-0.5 accent-amber-600"
            />
            <div>
              <p className="text-sm font-medium text-amber-800">{brand.productCount} üründen markayı kaldır</p>
              <p className="text-xs text-amber-600">İşaretlenmezse ürünlerin marka alanı korunur.</p>
            </div>
          </label>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            İptal
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          >
            {deleting && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Brands() {
  const [brands,    setBrands]    = useState<Brand[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState<{ type: 'create' | 'edit'; brand: Brand | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/brands');
      const raw = res.data as any;
      setBrands(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
    } catch {
      toast.error('Markalar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const filtered = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Markalar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ürünlerinizde kullanılan markaları yönetin</p>
        </div>
        <button
          onClick={() => setModal({ type: 'create', brand: null })}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Yeni Marka
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Marka ara..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse"/>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
            </svg>
          </div>
          <p className="text-gray-700 font-medium">{search ? 'Arama sonucu bulunamadı' : 'Henüz marka yok'}</p>
          <p className="text-gray-400 text-sm mt-1">
            {search ? 'Farklı bir arama deneyin.' : 'Ürünlerinizde kullanmak için marka ekleyin.'}
          </p>
          {!search && (
            <button
              onClick={() => setModal({ type: 'create', brand: null })}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
            >
              İlk Markayı Ekle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(brand => (
            <BrandCard
              key={brand.id}
              brand={brand}
              onEdit={() => setModal({ type: 'edit', brand })}
              onDelete={() => setDeleteTarget(brand)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {modal && (
        <BrandModal
          brand={modal.brand}
          onClose={() => setModal(null)}
          onSaved={fetchBrands}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          brand={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={fetchBrands}
        />
      )}
    </div>
  );
}

// ── Brand Card ───────────────────────────────────────────────────────────────

function BrandCard({ brand, onEdit, onDelete }: { brand: Brand; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start gap-3">
        {/* Logo or initials */}
        <div className="w-12 h-12 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
          {brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt={brand.name}
              className="max-w-full max-h-full object-contain"
              onError={e => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
                const parent = img.parentElement!;
                parent.textContent = brand.name.slice(0, 2).toUpperCase();
                parent.className += ' text-gray-600 font-bold text-sm';
              }}
            />
          ) : (
            <span className="text-gray-600 font-bold text-sm">{brand.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{brand.name}</h3>
            {!brand.isActive && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                Pasif
              </span>
            )}
          </div>
          {brand.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{brand.description}</p>
          )}
          <p className="text-xs text-indigo-600 font-medium mt-1">
            {brand.productCount} ürün
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        {brand.website && (
          <a
            href={brand.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs text-gray-400 hover:text-indigo-600 truncate"
            title={brand.website}
          >
            🌐 Siteye git
          </a>
        )}
        <div className={`flex gap-1 ${brand.website ? '' : 'ml-auto'}`}>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
            title="Düzenle"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
            title="Sil"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
