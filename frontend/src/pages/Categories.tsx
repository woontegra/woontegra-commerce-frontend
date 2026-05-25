import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '../services/category.service';
import type { FlatCategoryNode } from '../services/category.service';
import CategoryTreeSelect from '../components/CategoryTreeSelect';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(t: string) {
  return t.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryForm {
  name:            string;
  slug:            string;
  description:     string;
  parentId:        string;
  order:           string;
  isActive:        boolean;
  icon:            string;
  imageUrl:        string;
  metaTitle:       string;
  metaDescription: string;
}

const EMPTY_FORM: CategoryForm = {
  name: '', slug: '', description: '', parentId: '', order: '0',
  isActive: true, icon: '', imageUrl: '', metaTitle: '', metaDescription: '',
};

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const show = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };
  return { msg, success: (t: string) => show('success', t), error: (t: string) => show('error', t) };
}

// ─── Category Row ─────────────────────────────────────────────────────────────

function CategoryRow({
  cat,
  depth,
  selected,
  onToggle,
  onEdit,
  onDelete,
}: {
  cat:      FlatCategoryNode;
  depth:    number;
  selected: boolean;
  onToggle: (id: string) => void;
  onEdit:   (cat: FlatCategoryNode) => void;
  onDelete: (cat: FlatCategoryNode) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-4 border-b border-slate-100 hover:bg-slate-50/60 group transition-colors ${selected ? 'bg-indigo-50/60' : ''}`}
      style={{ paddingLeft: `${16 + depth * 24}px` }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(cat.id)}
        onClick={e => e.stopPropagation()}
        className="w-3.5 h-3.5 rounded border-slate-300 accent-indigo-500 flex-shrink-0 cursor-pointer"
      />

      {/* Indent line */}
      {depth > 0 && (
        <div className="w-4 h-px bg-slate-200 flex-shrink-0"/>
      )}

      {/* Icon / dot */}
      {cat.icon ? (
        <span className="text-base flex-shrink-0">{cat.icon}</span>
      ) : (
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
          depth === 0 ? 'bg-indigo-400' : depth === 1 ? 'bg-blue-300' : 'bg-slate-300'
        }`}/>
      )}

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700 truncate">{cat.name}</span>
          {!cat.isActive && (
            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[10px] font-medium">Pasif</span>
          )}
          {cat.hasChildren && (
            <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-500 text-[10px] font-medium">▾</span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">/{cat.path}</p>
      </div>

      {/* Product count */}
      <div className="flex-shrink-0 text-center w-12">
        <span className={`text-xs font-semibold ${
          (cat._count?.products ?? 0) > 0 ? 'text-emerald-600' : 'text-slate-300'
        }`}>
          {cat._count?.products ?? 0}
        </span>
        <p className="text-[10px] text-slate-400">ürün</p>
      </div>

      {/* Level badge */}
      <div className="flex-shrink-0">
        <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-[11px] text-slate-500 font-mono">
          L{cat.level}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button type="button" onClick={() => onEdit(cat)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button type="button" onClick={() => onDelete(cat)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Category Form Modal ──────────────────────────────────────────────────────

function CategoryModal({
  open,
  editing,
  flatList,
  onClose,
  onSave,
  saving,
}: {
  open:     boolean;
  editing:  FlatCategoryNode | null;
  flatList: FlatCategoryNode[];
  onClose:  () => void;
  onSave:   (form: CategoryForm) => void;
  saving:   boolean;
}) {
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);

  React.useEffect(() => {
    if (editing) {
      setForm({
        name:            editing.name,
        slug:            editing.slug,
        description:     editing.description ?? '',
        parentId:        editing.parentId ?? '',
        order:           String(editing.order),
        isActive:        editing.isActive,
        icon:            editing.icon ?? '',
        imageUrl:        editing.imageUrl ?? '',
        metaTitle:       editing.metaTitle ?? '',
        metaDescription: editing.metaDescription ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editing, open]);

  const set = (k: keyof CategoryForm, v: any) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleNameChange = (name: string) => {
    set('name', name);
    if (!editing) set('slug', slugify(name));  // auto-slug only for new
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">
            {editing ? 'Kategori Düzenle' : 'Yeni Kategori'}
          </h2>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Kategori Adı <span className="text-red-400 normal-case font-normal">*</span>
            </label>
            <input
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Elektronik, Kadın Giyim..."
              className="wn-input w-full"
              required
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">URL Slug</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">/</span>
                <input
                  value={form.slug}
                  onChange={e => set('slug', e.target.value)}
                  placeholder="elektronik"
                  className="wn-input pl-6 font-mono text-sm w-full"
                />
              </div>
              <button type="button" onClick={() => set('slug', slugify(form.name))}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 transition-colors font-semibold whitespace-nowrap">
                ↺ Otomatik
              </button>
            </div>
          </div>

          {/* Parent */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Üst Kategori</label>
            <CategoryTreeSelect
              categories={flatList.filter(c => !editing || c.id !== editing.id)}
              value={form.parentId}
              onChange={v => set('parentId', v)}
              placeholder="— Kök kategori (üst yok) —"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Açıklama</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="Kategori hakkında kısa açıklama..."
              className="wn-input w-full resize-none"
            />
          </div>

          {/* Icon + Order row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">İkon (Emoji)</label>
              <input
                value={form.icon}
                onChange={e => set('icon', e.target.value)}
                placeholder="📱 💻 👗..."
                className="wn-input w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sıra</label>
              <input
                value={form.order}
                onChange={e => set('order', e.target.value)}
                type="number" min="0"
                className="wn-input w-full"
              />
            </div>
          </div>

          {/* Active */}
          <div
            onClick={() => set('isActive', !form.isActive)}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              form.isActive ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors pointer-events-none ${form.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`}/>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{form.isActive ? 'Aktif' : 'Pasif'}</p>
              <p className="text-xs text-slate-500">{form.isActive ? 'Mağazada görünür' : 'Mağazada gizli'}</p>
            </div>
          </div>

          {/* SEO section (collapsible) */}
          <details className="group">
            <summary className="flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-pointer hover:text-indigo-600 transition-colors list-none">
              <svg className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
              SEO Ayarları (Opsiyonel)
            </summary>
            <div className="mt-4 space-y-4 pl-5 border-l-2 border-slate-100">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Meta Başlık</label>
                <input value={form.metaTitle} onChange={e => set('metaTitle', e.target.value)}
                  maxLength={60} placeholder="SEO başlığı (max 60 karakter)" className="wn-input w-full"/>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Meta Açıklama</label>
                <textarea value={form.metaDescription} onChange={e => set('metaDescription', e.target.value)}
                  rows={2} maxLength={160} placeholder="SEO açıklaması (max 160 karakter)" className="wn-input w-full resize-none"/>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Görsel URL</label>
                <input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)}
                  placeholder="https://..." className="wn-input w-full"/>
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white transition-colors">
            İptal
          </button>
          <button type="button" onClick={() => onSave(form)} disabled={saving || !form.name.trim()}
            className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center gap-2">
            {saving && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
            {editing ? 'Güncelle' : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({
  cat,
  onConfirm,
  onCancel,
  deleting,
}: {
  cat:      FlatCategoryNode | null;
  onConfirm:(force: boolean) => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  if (!cat) return null;
  const productCount = cat._count?.products ?? 0;
  const hasChildren  = cat.hasChildren;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Kategoriyi Sil</h3>
            <p className="text-xs text-slate-500">Bu işlem geri alınamaz.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <p className="text-sm font-semibold text-slate-700">"{cat.name}"</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">/{cat.path}</p>
        </div>

        {(hasChildren || productCount > 0) && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 space-y-2">
            <p className="text-xs font-semibold text-amber-700">⚠️ Uyarı</p>
            {hasChildren && <p className="text-xs text-amber-600">Bu kategorinin alt kategorileri var.</p>}
            {productCount > 0 && <p className="text-xs text-amber-600">{productCount} ürün bu kategoride tanımlı.</p>}
            <p className="text-xs text-amber-600">
              <strong>Zorla sil</strong> seçeneği: ürünler üst kategoriye taşınır, alt kategoriler silinmez.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            İptal
          </button>
          {(hasChildren || productCount > 0) ? (
            <button type="button" onClick={() => onConfirm(true)} disabled={deleting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-sm font-bold text-white transition-colors disabled:opacity-50">
              {deleting ? 'Siliniyor...' : 'Zorla Sil'}
            </button>
          ) : (
            <button type="button" onClick={() => onConfirm(false)} disabled={deleting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-bold text-white transition-colors disabled:opacity-50">
              {deleting ? 'Siliniyor...' : 'Sil'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Categories() {
  const qc     = useQueryClient();
  const toast  = useToast();

  const [modalOpen,    setModalOpen]    = useState(false);
  const [editing,      setEditing]      = useState<FlatCategoryNode | null>(null);
  const [toDelete,     setToDelete]     = useState<FlatCategoryNode | null>(null);
  const [searchText,   setSearchText]   = useState('');
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkConfirm,  setBulkConfirm]  = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: flatList = [], isLoading } = useQuery<FlatCategoryNode[]>({
    queryKey: ['categories', 'flat'],
    queryFn:  () => categoryService.getFlat(),
  });

  const filtered = searchText.trim()
    ? flatList.filter(c =>
        c.name.toLowerCase().includes(searchText.toLowerCase()) ||
        c.path.toLowerCase().includes(searchText.toLowerCase())
      )
    : flatList;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['categories'] });
  };

  const createMut = useMutation({
    mutationFn: (f: CategoryForm) => categoryService.create({
      name:            f.name,
      slug:            f.slug || undefined,
      description:     f.description || undefined,
      parentId:        f.parentId || null,
      order:           Number(f.order),
      isActive:        f.isActive,
      icon:            f.icon || undefined,
      imageUrl:        f.imageUrl || undefined,
      metaTitle:       f.metaTitle || undefined,
      metaDescription: f.metaDescription || undefined,
    }),
    onSuccess: () => { invalidate(); toast.success('Kategori oluşturuldu'); setModalOpen(false); },
    onError:   (e: any) => toast.error(e?.response?.data?.error ?? 'Oluşturma başarısız'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, f }: { id: string; f: CategoryForm }) =>
      categoryService.update(id, {
        name:            f.name,
        slug:            f.slug || undefined,
        description:     f.description || undefined,
        parentId:        f.parentId || null,
        order:           Number(f.order),
        isActive:        f.isActive,
        icon:            f.icon || undefined,
        imageUrl:        f.imageUrl || undefined,
        metaTitle:       f.metaTitle || undefined,
        metaDescription: f.metaDescription || undefined,
      }),
    onSuccess: () => { invalidate(); toast.success('Kategori güncellendi'); setModalOpen(false); setEditing(null); },
    onError:   (e: any) => toast.error(e?.response?.data?.error ?? 'Güncelleme başarısız'),
  });

  const deleteMut = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      categoryService.delete(id, force),
    onSuccess: () => { invalidate(); toast.success('Kategori silindi'); setToDelete(null); },
    onError:   (e: any) => toast.error(e?.response?.data?.error ?? 'Silme başarısız'),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSave = useCallback((f: CategoryForm) => {
    if (editing) {
      updateMut.mutate({ id: editing.id, f });
    } else {
      createMut.mutate(f);
    }
  }, [editing]);

  const handleEdit = (cat: FlatCategoryNode) => {
    setEditing(cat);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const handleBulkDelete = async (force: boolean) => {
    setBulkDeleting(true);
    try {
      const res = await categoryService.bulkDelete(Array.from(selectedIds), force);
      invalidate();
      setSelectedIds(new Set());
      setBulkConfirm(false);
      if (res.errors?.length > 0) {
        toast.error(`${res.deleted} silindi, ${res.errors.length} silinemedi.`);
      } else {
        toast.success(`${res.deleted} kategori silindi.`);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'Toplu silme başarısız.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const saving  = createMut.isPending || updateMut.isPending;
  const deleting = deleteMut.isPending;

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filtered.length;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const rootCount    = flatList.filter(c => c.level === 0).length;
  const totalProducts = flatList.reduce((s, c) => s + (c._count?.products ?? 0), 0);
  const maxDepth     = flatList.reduce((m, c) => Math.max(m, c.level), 0);

  return (
    <div className="space-y-6">
      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast.msg && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border pointer-events-auto ${
          toast.msg.type === 'success' ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-white border-red-200 text-red-700'
        }`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
            toast.msg.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
          }`}>
            {toast.msg.type === 'success' ? '✓' : '✕'}
          </span>
          {toast.msg.text}
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kategoriler</h1>
          <p className="text-sm text-slate-500 mt-1">
            {flatList.length} kategori · {rootCount} kök · max {maxDepth} seviye derinlik
          </p>
        </div>
        <button type="button" onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-sm font-bold text-white transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Yeni Kategori
        </button>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Kategori', value: flatList.length,   color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Kök Kategori',    value: rootCount,          color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Max Derinlik',    value: `L${maxDepth}`,     color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Ürün Sayısı',     value: totalProducts,      color: 'text-emerald-600',bg: 'bg-emerald-50'},
        ].map(s => (
          <div key={s.label} className="wn-card p-4">
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${s.bg} mb-3`}>
              <span className={`text-sm font-black ${s.color}`}>{s.value}</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Category Tree ──────────────────────────────────────────────────── */}
      <div className="wn-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Kategori ara..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none"
            />
          </div>

          {/* Bulk actions bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-1 rounded-lg">
                {selectedIds.size} seçili
              </span>
              <button
                type="button"
                onClick={() => setBulkConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Toplu Sil
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs font-medium"
              >
                Seçimi Kaldır
              </button>
            </div>
          )}

          <span className="text-xs text-slate-400 ml-auto">
            {filtered.length} / {flatList.length} gösteriliyor
          </span>
        </div>

        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50/80 border-b border-slate-100">
          {/* Select-all checkbox */}
          <input
            type="checkbox"
            checked={allSelected}
            ref={el => { if (el) el.indeterminate = someSelected; }}
            onChange={toggleSelectAll}
            className="w-3.5 h-3.5 rounded border-slate-300 accent-indigo-500 cursor-pointer flex-shrink-0"
          />
          <div className="flex-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Kategori Adı / Yol</div>
          <div className="w-12 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">Ürün</div>
          <div className="w-12 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Level</div>
          <div className="w-16"/>
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="w-8 h-8 animate-spin text-indigo-300" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-700">
                {searchText ? 'Kategori bulunamadı' : 'Henüz kategori yok'}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {searchText ? `"${searchText}" araması sonuç döndürmedi` : 'İlk kategorinizi oluşturarak başlayın'}
              </p>
            </div>
            {!searchText && (
              <button type="button" onClick={handleNew}
                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-sm font-bold text-white transition-colors">
                + İlk Kategoriyi Oluştur
              </button>
            )}
          </div>
        ) : (
          <div>
            {filtered.map(cat => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                depth={searchText ? 0 : cat.depth}
                selected={selectedIds.has(cat.id)}
                onToggle={toggleSelect}
                onEdit={handleEdit}
                onDelete={setToDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <CategoryModal
        open={modalOpen}
        editing={editing}
        flatList={flatList}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        saving={saving}
      />

      <DeleteConfirm
        cat={toDelete}
        onConfirm={(force) => toDelete && deleteMut.mutate({ id: toDelete.id, force })}
        onCancel={() => setToDelete(null)}
        deleting={deleting}
      />

      {/* ── Bulk Delete Confirm ──────────────────────────────────────────── */}
      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setBulkConfirm(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {selectedIds.size} kategori silinecek
                </h3>
                <p className="text-xs text-slate-500">Bu işlem geri alınamaz.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 space-y-1.5">
              <p className="text-xs font-semibold text-amber-700">⚠️ Dikkat</p>
              <p className="text-xs text-amber-600">
                Seçilen kategorilerin ürünleri ve alt kategorileri varsa <strong>Zorla Sil</strong> seçeneğini kullanın.
                Ürünler üst kategoriye taşınır, alt kategoriler ayrıca silinmez.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setBulkConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => handleBulkDelete(true)}
                disabled={bulkDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bulkDeleting && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                )}
                {bulkDeleting ? 'Siliniyor...' : 'Zorla Sil'}
              </button>
              <button
                type="button"
                onClick={() => handleBulkDelete(false)}
                disabled={bulkDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bulkDeleting ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
