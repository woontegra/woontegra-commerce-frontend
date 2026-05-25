import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import apiClient from '../../services/apiClient';
import { BulkPriceAdjustInputs } from './BulkPriceAdjustInputs';
import { hasPriceAdjustment, parseOptionalSigned } from '../../utils/priceAdjustInput';

type Scope = 'selected' | 'all' | 'category';

interface LocalCategory {
  id: string;
  name: string;
  level?: number;
}

interface PreviewItem {
  productId: string;
  name: string;
  barcode: string | null;
  currentPrice: number;
  newPrice: number;
}

interface PricingRuleRow {
  id: string;
  name: string | null;
  type: string;
  value: number;
  applyTo: string;
  categoryId: string | null;
  brand: string | null;
  isActive: boolean;
  priority: number;
  category?: { id: string; name: string } | null;
}

interface BulkCatalogPricePanelProps {
  selectedProductIds: string[];
  onUpdated?: () => void;
}

export function BulkCatalogPricePanel({
  selectedProductIds,
  onUpdated,
}: BulkCatalogPricePanelProps) {
  const qc = useQueryClient();
  const [scope, setScope] = useState<Scope>('selected');
  const [categoryId, setCategoryId] = useState('');
  const [percentRaw, setPercentRaw] = useState('');
  const [fixedRaw, setFixedRaw] = useState('');
  const [preview, setPreview] = useState<{
    items: PreviewItem[];
    totalCount: number;
    previewCount: number;
  } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);

  const hasChange = hasPriceAdjustment(percentRaw, fixedRaw);

  const { data: categories = [] } = useQuery({
    queryKey: ['local-categories-bulk-price'],
    queryFn: async () => {
      const r = await apiClient.get('/trendyol/local-categories');
      const d = r.data;
      return (Array.isArray(d) ? d : (d?.data ?? d?.categories ?? [])) as LocalCategory[];
    },
  });

  const { data: rules = [], refetch: refetchRules } = useQuery({
    queryKey: ['pricing-rules'],
    queryFn: async () => {
      try {
        const r = await apiClient.get('/pricing-rules', { skipErrorToast: true } as { skipErrorToast?: boolean });
        return (Array.isArray(r.data) ? r.data : []) as PricingRuleRow[];
      } catch {
        return [];
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [ruleForm, setRuleForm] = useState({
    name: '',
    type: 'PERCENT' as 'PERCENT' | 'FIXED',
    value: '10',
    applyTo: 'ALL' as 'ALL' | 'CATEGORY' | 'BRAND',
    categoryId: '',
    brand: '',
  });
  const [ruleSaving, setRuleSaving] = useState(false);

  const buildPayload = useCallback(() => {
    const percent = parseOptionalSigned(percentRaw);
    const fixed = parseOptionalSigned(fixedRaw);
    return {
      scope,
      categoryId: scope === 'category' ? categoryId : undefined,
      productIds: scope === 'selected' ? selectedProductIds : undefined,
      ...(percent != null && percent !== 0 ? { percent } : {}),
      ...(fixed != null && fixed !== 0 ? { fixed } : {}),
      applyTo: 'product' as const,
    };
  }, [scope, categoryId, selectedProductIds, percentRaw, fixedRaw]);

  const validateScope = (): boolean => {
    if (scope === 'selected' && selectedProductIds.length === 0) {
      toast.error('Ürün seçin veya kapsamı değiştirin.');
      return false;
    }
    if (scope === 'category' && !categoryId) {
      toast.error('Kategori seçin.');
      return false;
    }
    if (!hasChange) {
      toast.error('Yüzde veya sabit değişim girin.');
      return false;
    }
    return true;
  };

  const runPreview = async () => {
    if (!validateScope()) return;
    setPreviewing(true);
    try {
      const r = await apiClient.post('/products/bulk-price-update/preview', buildPayload());
      setPreview({
        items: r.data.items ?? [],
        totalCount: r.data.totalCount ?? 0,
        previewCount: r.data.previewCount ?? 0,
      });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Önizleme oluşturulamadı.');
    } finally {
      setPreviewing(false);
    }
  };

  const applyBulk = async () => {
    if (!validateScope()) return;
    if (!window.confirm('Katalog fiyatları güncellenecek. Devam edilsin mi?')) return;

    setApplying(true);
    try {
      const r = await apiClient.post('/products/bulk-price-update', buildPayload());
      toast.success(`${r.data.updatedCount ?? 0} ürün fiyatı güncellendi.`);
      setPreview(null);
      await qc.invalidateQueries({ queryKey: ['trendyol-mapped-variants'] });
      await qc.invalidateQueries({ queryKey: ['products'] });
      onUpdated?.();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Toplu güncelleme başarısız.');
    } finally {
      setApplying(false);
    }
  };

  const clearPreview = () => setPreview(null);

  const saveRule = async () => {
    const v = parseFloat(ruleForm.value);
    if (!ruleForm.value || isNaN(v) || v === 0) {
      toast.error('Kural değeri geçersiz.');
      return;
    }
    if (ruleForm.applyTo === 'CATEGORY' && !ruleForm.categoryId) {
      toast.error('Kategori seçin.');
      return;
    }
    if (ruleForm.applyTo === 'BRAND' && !ruleForm.brand.trim()) {
      toast.error('Marka adı girin.');
      return;
    }
    setRuleSaving(true);
    try {
      await apiClient.post('/pricing-rules', {
        name: ruleForm.name.trim() || undefined,
        type: ruleForm.type,
        value: v,
        applyTo: ruleForm.applyTo,
        categoryId: ruleForm.applyTo === 'CATEGORY' ? ruleForm.categoryId : undefined,
        brand: ruleForm.applyTo === 'BRAND' ? ruleForm.brand.trim() : undefined,
      });
      toast.success('Fiyat kuralı kaydedildi. XML/senkron sırasında otomatik uygulanır.');
      setRuleForm(f => ({ ...f, name: '', brand: '' }));
      refetchRules();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Kural kaydedilemedi.');
    } finally {
      setRuleSaving(false);
    }
  };

  const toggleRule = async (rule: PricingRuleRow) => {
    try {
      await apiClient.patch(`/pricing-rules/${rule.id}`, { isActive: !rule.isActive });
      refetchRules();
    } catch {
      toast.error('Kural güncellenemedi.');
    }
  };

  const deleteRule = async (id: string) => {
    if (!window.confirm('Bu kural silinsin mi?')) return;
    try {
      await apiClient.delete(`/pricing-rules/${id}`);
      refetchRules();
      toast.success('Kural silindi.');
    } catch {
      toast.error('Kural silinemedi.');
    }
  };

  return (
    <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-100">
        <h3 className="font-semibold text-emerald-900">Toplu Katalog Fiyatı</h3>
        <p className="text-sm text-emerald-800/90 mt-1">
          Yüzde ve/veya TL ile güncelleyin; ardından Trendyol&apos;a göndermek için alttaki tabloyu kullanın.
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Kapsam</p>
          <div className="flex flex-wrap gap-2">
            {([
              { v: 'selected' as Scope, label: `Seçili (${selectedProductIds.length})` },
              { v: 'all' as Scope, label: 'Tümü' },
              { v: 'category' as Scope, label: 'Kategori' },
            ]).map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => { setScope(opt.v); clearPreview(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  scope === opt.v
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-slate-200 text-slate-600 hover:border-emerald-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {scope === 'category' && (
            <select
              value={categoryId}
              onChange={e => { setCategoryId(e.target.value); clearPreview(); }}
              className="mt-2 w-full max-w-md px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">— Kategori seçin —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {'  '.repeat(c.level ?? 0)}{c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <BulkPriceAdjustInputs
          percent={percentRaw}
          fixed={fixedRaw}
          onPercentChange={v => { setPercentRaw(v); clearPreview(); }}
          onFixedChange={v => { setFixedRaw(v); clearPreview(); }}
        />

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={runPreview}
            disabled={previewing || applying || !hasChange}
            className="px-4 py-2 rounded-lg border border-emerald-300 text-emerald-800 text-sm font-medium hover:bg-emerald-50 disabled:opacity-40"
          >
            {previewing ? 'Önizleniyor…' : 'Önizleme'}
          </button>
          <button
            type="button"
            onClick={applyBulk}
            disabled={applying || previewing || !hasChange}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-40"
          >
            {applying ? 'Güncelleniyor…' : 'Toplu Güncelle'}
          </button>
        </div>

        {preview && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-600">
              Önizleme: {preview.previewCount} / {preview.totalCount} ürün
              {preview.totalCount > preview.previewCount && ' (ilk 100)'}
            </div>
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-500">Ürün</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-500">Mevcut</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-500">Yeni</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map(row => (
                    <tr key={row.productId} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-800 truncate max-w-[200px]" title={row.name}>
                        {row.name}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500">₺{row.currentPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                        ₺{row.newPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <details className="border-t border-slate-100 pt-3">
          <summary className="text-sm font-semibold text-slate-600 cursor-pointer select-none">
            Otomatik fiyat kuralları (XML / senkron)
          </summary>
          <div className="mt-3 space-y-3 text-xs">
            <p className="text-slate-500">
              XML içe aktarmada ham fiyata uygulanır. Öncelik: marka → kategori → tümü.
            </p>
            {rules.length > 0 && (
              <ul className="space-y-1.5">
                {rules.map(rule => (
                  <li key={rule.id} className="flex justify-between gap-2 p-2 rounded-lg bg-slate-50">
                    <span className={rule.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}>
                      {rule.name || 'Kural'} — {rule.type} {rule.value} ({rule.applyTo})
                    </span>
                    <span className="flex gap-2 shrink-0">
                      <button type="button" onClick={() => toggleRule(rule)} className="text-indigo-600">
                        {rule.isActive ? 'Kapat' : 'Aç'}
                      </button>
                      <button type="button" onClick={() => deleteRule(rule.id)} className="text-red-600">
                        Sil
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Kural adı"
                value={ruleForm.name}
                onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))}
                className="px-2 py-1.5 border rounded-lg"
              />
              <select
                value={ruleForm.applyTo}
                onChange={e => setRuleForm(f => ({ ...f, applyTo: e.target.value as typeof f.applyTo }))}
                className="px-2 py-1.5 border rounded-lg"
              >
                <option value="ALL">Tümü</option>
                <option value="CATEGORY">Kategori</option>
                <option value="BRAND">Marka</option>
              </select>
              <select
                value={ruleForm.type}
                onChange={e => setRuleForm(f => ({ ...f, type: e.target.value as 'PERCENT' | 'FIXED' }))}
                className="px-2 py-1.5 border rounded-lg"
              >
                <option value="PERCENT">%</option>
                <option value="FIXED">₺</option>
              </select>
              <input
                type="text"
                placeholder="Değer"
                value={ruleForm.value}
                onChange={e => setRuleForm(f => ({ ...f, value: e.target.value }))}
                className="px-2 py-1.5 border rounded-lg"
              />
            </div>
            <button
              type="button"
              onClick={saveRule}
              disabled={ruleSaving}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              Kural Ekle
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
