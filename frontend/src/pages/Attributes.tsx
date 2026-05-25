import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import attributeService from '../services/attribute.service';
import type { Attribute, AttributeType, CategoryAttribute } from '../services/attribute.service';
import { categoryService } from '../services/category.service';
import type { FlatCategoryNode } from '../services/category.service';

// ─── Types & constants ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<AttributeType, string> = {
  select:      'Tekli Seçim',
  multiselect: 'Çoklu Seçim',
  text:        'Metin',
  number:      'Sayı',
  boolean:     'Evet/Hayır',
  color:       'Renk',
};

const TYPE_COLORS: Record<AttributeType, string> = {
  select:      'bg-indigo-100 text-indigo-700',
  multiselect: 'bg-purple-100 text-purple-700',
  text:        'bg-gray-100 text-gray-700',
  number:      'bg-blue-100 text-blue-700',
  boolean:     'bg-green-100 text-green-700',
  color:       'bg-pink-100 text-pink-700',
};

const HAS_VALUES = (type: AttributeType) => ['select', 'multiselect', 'color'].includes(type);

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ValueRowProps {
  value: { label: string; color?: string };
  index: number;
  onUpdate: (i: number, field: string, val: string) => void;
  onRemove: (i: number) => void;
  showColor: boolean;
}

function ValueRow({ value, index, onUpdate, onRemove, showColor }: ValueRowProps) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-3 bg-gray-50 rounded-lg border border-gray-200">
      {showColor && (
        <input
          type="color"
          value={value.color || '#6366f1'}
          onChange={e => onUpdate(index, 'color', e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-gray-300 p-0.5"
        />
      )}
      <input
        type="text"
        value={value.label}
        onChange={e => onUpdate(index, 'label', e.target.value)}
        placeholder="Değer adı (ör: Kırmızı)"
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="text-gray-400 hover:text-red-500 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Attribute Form Modal ─────────────────────────────────────────────────────

interface AttributeModalProps {
  attr?: Attribute | null;
  onClose: () => void;
  onSave: (data: any) => void;
  saving: boolean;
}

function AttributeModal({ attr, onClose, onSave, saving }: AttributeModalProps) {
  const [name, setName]             = useState(attr?.name ?? '');
  const [type, setType]             = useState<AttributeType>(attr?.type ?? 'select');
  const [unit, setUnit]             = useState(attr?.unit ?? '');
  const [isFilterable, setFilter]   = useState(attr?.isFilterable ?? true);
  const [isRequired, setRequired]   = useState(attr?.isRequired ?? false);
  const [values, setValues]         = useState<Array<{ label: string; color?: string }>>(
    attr?.values.map(v => ({ label: v.label, color: v.color ?? undefined })) ?? []
  );
  const [newLabel, setNewLabel]     = useState('');

  const addValue = () => {
    const label = newLabel.trim();
    if (!label) return;
    setValues(prev => [...prev, { label }]);
    setNewLabel('');
  };

  const updateValue = (i: number, field: string, val: string) => {
    setValues(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: val } : v));
  };

  const removeValue = (i: number) => {
    setValues(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      type,
      unit: unit || null,
      isFilterable,
      isRequired,
      values: HAS_VALUES(type) ? values.map((v, i) => ({ ...v, displayOrder: i })) : [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {attr ? 'Özelliği Düzenle' : 'Yeni Özellik'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Özellik Adı *</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ör: Renk, Numara, Malzeme"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tip *</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_LABELS) as AttributeType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`text-xs px-3 py-2 rounded-lg border-2 transition-all font-medium ${
                    type === t
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Unit (only for number) */}
          {type === 'number' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birim (opsiyonel)</label>
              <input
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="ör: cm, kg, adet"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Flags */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setFilter(p => !p)}
                className={`w-10 h-5 rounded-full transition-colors relative ${isFilterable ? 'bg-indigo-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isFilterable ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm text-gray-700">Filtrelenebilir</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setRequired(p => !p)}
                className={`w-10 h-5 rounded-full transition-colors relative ${isRequired ? 'bg-indigo-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isRequired ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm text-gray-700">Zorunlu</span>
            </label>
          </div>

          {/* Values (for select / multiselect / color) */}
          {HAS_VALUES(type) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Değerler {values.length > 0 && <span className="text-gray-400">({values.length})</span>}
              </label>
              <div className="space-y-1.5 mb-2">
                {values.map((v, i) => (
                  <ValueRow
                    key={i}
                    value={v}
                    index={i}
                    onUpdate={updateValue}
                    onRemove={removeValue}
                    showColor={type === 'color'}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addValue())}
                  placeholder="Yeni değer ekle (Enter)"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={addValue}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Ekle
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Category ↔ Attribute Assignment Panel ────────────────────────────────────

function CategoryAssignPanel({ attributes }: { attributes: Attribute[] }) {
  const { data: cats = [] } = useQuery<FlatCategoryNode[]>({
    queryKey: ['categories', 'flat'],
    queryFn:  () => categoryService.getFlat(),
    staleTime: 60_000,
  });

  const [selectedCat, setSelectedCat] = useState<string>('');
  // local override map: attributeId → { assigned, required, isVariant }
  const [overrides, setOverrides] = useState<Record<string, { assigned: boolean; required: boolean; isVariant: boolean }>>({});

  const { data: catAttrs = [], refetch: refetchCatAttrs } = useQuery<CategoryAttribute[]>({
    queryKey: ['category-attrs-manage', selectedCat],
    queryFn:  () => attributeService.getCategoryAttributes(selectedCat, false),
    enabled:  !!selectedCat,
    staleTime: 0,
  });

  // Sync overrides from server data whenever catAttrs change
  React.useEffect(() => {
    const next: Record<string, { assigned: boolean; required: boolean; isVariant: boolean }> = {};
    for (const ca of catAttrs) {
      next[ca.attributeId] = { assigned: true, required: ca.required, isVariant: ca.isVariant };
    }
    setOverrides(next);
  }, [catAttrs]);

  const assignMut = useMutation({
    mutationFn: ({ attrId, required, isVariant }: { attrId: string; required: boolean; isVariant: boolean }) =>
      attributeService.assignToCategory(selectedCat, attrId, { required, isVariant }),
    onSuccess: () => refetchCatAttrs(),
  });

  const removeMut = useMutation({
    mutationFn: ({ attrId }: { attrId: string }) =>
      attributeService.removeFromCategory(selectedCat, attrId),
    onSuccess: () => refetchCatAttrs(),
  });

  const getState = (attrId: string) =>
    overrides[attrId] ?? { assigned: false, required: false, isVariant: false };

  const toggleAssign = (attrId: string) => {
    const cur = getState(attrId);
    if (cur.assigned) {
      setOverrides(p => { const n = { ...p }; delete n[attrId]; return n; });
      removeMut.mutate({ attrId });
    } else {
      setOverrides(p => ({ ...p, [attrId]: { assigned: true, required: false, isVariant: false } }));
      assignMut.mutate({ attrId, required: false, isVariant: false });
    }
  };

  const toggleFlag = (attrId: string, flag: 'required' | 'isVariant', val: boolean) => {
    const cur = getState(attrId);
    const next = { ...cur, [flag]: val };
    setOverrides(p => ({ ...p, [attrId]: next }));
    assignMut.mutate({ attrId, required: next.required, isVariant: next.isVariant });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Kategoriye Özellik Ata</h3>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Kategori Seç</label>
        <select
          value={selectedCat}
          onChange={e => { setSelectedCat(e.target.value); setOverrides({}); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">-- Kategori seç --</option>
          {cats.map(c => (
            <option key={c.id} value={c.id}>
              {'—'.repeat(c.depth ?? c.level ?? 0)}{(c.depth ?? c.level ?? 0) > 0 ? ' ' : ''}{c.label ?? c.name}
            </option>
          ))}
        </select>
      </div>

      {selectedCat && (
        <div className="space-y-2">
          {/* Legend */}
          <div className="flex items-center gap-4 pb-2 border-b border-gray-100 text-[11px] text-gray-400 font-medium">
            <span className="flex-1">Özellik</span>
            <span className="w-16 text-center">Zorunlu</span>
            <span className="w-16 text-center">Varyant</span>
          </div>

          {attributes.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Henüz özellik tanımlanmamış</p>
          )}

          {attributes.map(attr => {
            const state = getState(attr.id);
            return (
              <div
                key={attr.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  state.assigned
                    ? state.isVariant
                      ? 'border-purple-400 bg-purple-50'
                      : 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-200'
                }`}
              >
                {/* Checkbox */}
                <div
                  onClick={() => toggleAssign(attr.id)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer ${
                    state.assigned ? 'border-indigo-500 bg-indigo-500' : 'border-gray-400 hover:border-indigo-400'
                  }`}
                >
                  {state.assigned && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Name + type */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleAssign(attr.id)}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{attr.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[attr.type]}`}>
                      {TYPE_LABELS[attr.type]}
                    </span>
                    {state.isVariant && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                        ⚡ Varyant
                      </span>
                    )}
                  </div>
                  {attr.values.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {attr.values.slice(0, 4).map(v => v.label).join(', ')}
                      {attr.values.length > 4 && ` +${attr.values.length - 4}`}
                    </p>
                  )}
                </div>

                {/* Zorunlu toggle */}
                <div className="w-16 flex justify-center">
                  {state.assigned && (
                    <div
                      onClick={() => toggleFlag(attr.id, 'required', !state.required)}
                      className={`w-8 h-4 rounded-full cursor-pointer relative transition-colors ${state.required ? 'bg-orange-400' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${state.required ? 'translate-x-4' : ''}`} />
                    </div>
                  )}
                </div>

                {/* isVariant toggle */}
                <div className="w-16 flex justify-center">
                  {state.assigned && (HAS_VALUES(attr.type)) && (
                    <div
                      onClick={() => toggleFlag(attr.id, 'isVariant', !state.isVariant)}
                      className={`w-8 h-4 rounded-full cursor-pointer relative transition-colors ${state.isVariant ? 'bg-purple-500' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${state.isVariant ? 'translate-x-4' : ''}`} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {Object.values(overrides).some(o => o.isVariant) && (
            <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-700">
              ⚡ <strong>Varyant özellikleri</strong> ürün sayfasında seçildiğinde, kombinasyonlar otomatik oluşturulacak.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Attribute Card ───────────────────────────────────────────────────────────

function AttributeCard({ attr, onEdit, onDelete }: { attr: Attribute; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{attr.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${TYPE_COLORS[attr.type]}`}>
              {TYPE_LABELS[attr.type]}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{attr.slug}</span>
            {attr.unit && <span>{attr.unit}</span>}
            {attr.isRequired && <span className="text-orange-600 font-medium">Zorunlu</span>}
            {attr.isFilterable && <span className="text-green-600">Filtrelenebilir</span>}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Values preview */}
      {attr.values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {attr.values.slice(0, 8).map(v => (
            <span key={v.id} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
              {v.color && (
                <span
                  className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                  style={{ background: v.color }}
                />
              )}
              {v.label}
            </span>
          ))}
          {attr.values.length > 8 && (
            <span className="text-xs text-gray-400">+{attr.values.length - 8} daha</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Attributes() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Attribute | null>(null);
  const [confirmDelete, setConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<'list' | 'assign'>('list');

  const { data: attributes = [], isLoading } = useQuery<Attribute[]>({
    queryKey: ['attributes'],
    queryFn:  attributeService.getAll,
  });

  const createMut = useMutation({
    mutationFn: attributeService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes'] }); setModalOpen(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...dto }: any) => attributeService.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes'] }); setModalOpen(false); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: attributeService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes'] }); setConfirm(null); },
  });

  const handleSave = (data: any) => {
    if (editing) {
      updateMut.mutate({ id: editing.id, ...data });
    } else {
      createMut.mutate(data);
    }
  };

  const openEdit = (attr: Attribute) => { setEditing(attr); setModalOpen(true); };
  const openNew  = () => { setEditing(null); setModalOpen(true); };

  const saving = createMut.isPending || updateMut.isPending;

  // Stats
  const typeCount = attributes.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ürün Özellikleri</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kategorilere bağlı dinamik ürün özellik tanımları (renk, numara, malzeme...)
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Özellik
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Özellik', value: attributes.length, icon: '🏷️' },
          { label: 'Seçim Tipli',    value: (typeCount['select'] ?? 0) + (typeCount['multiselect'] ?? 0), icon: '☑️' },
          { label: 'Filtrelenebilir', value: attributes.filter(a => a.isFilterable).length, icon: '🔍' },
          { label: 'Zorunlu',         value: attributes.filter(a => a.isRequired).length, icon: '⚠️' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['list', 'assign'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'list' ? '📋 Özellik Listesi' : '🔗 Kategoriye Ata'}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'list' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : attributes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
              <div className="text-5xl mb-4">🏷️</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Henüz özellik yok</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                Ürün özellikleri, müşterilerin ürünleri filtrelemesini ve karşılaştırmasını sağlar.
                <br />Renk, numara, malzeme gibi özellikler ekleyin.
              </p>
              <button
                onClick={openNew}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                İlk Özelliği Oluştur
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {attributes.map(attr => (
                <AttributeCard
                  key={attr.id}
                  attr={attr}
                  onEdit={() => openEdit(attr)}
                  onDelete={() => setConfirm(attr.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'assign' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryAssignPanel attributes={attributes} />
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">💡 Nasıl Çalışır?</h3>
            <ul className="space-y-2 text-sm text-blue-700">
              <li className="flex gap-2">
                <span className="text-blue-400 flex-shrink-0">1.</span>
                Sol panelden bir kategori seçin
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400 flex-shrink-0">2.</span>
                O kategorideki ürünlerin göstermesi gereken özellikleri işaretleyin
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400 flex-shrink-0">3.</span>
                Ürün oluştururken o kategoriyi seçince özellik alanları otomatik çıkar
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400 flex-shrink-0">4.</span>
                Üst kategorideki özellikler alt kategorilere de otomatik miras alınır
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Attribute Modal */}
      {modalOpen && (
        <AttributeModal
          attr={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="text-base font-semibold text-gray-900">Bu özelliği sil?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Bu özelliğe ait tüm değerler ve kategori atamaları da silinecek.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => deleteMut.mutate(confirmDelete)}
                disabled={deleteMut.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deleteMut.isPending ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
