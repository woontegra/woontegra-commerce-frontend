import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  fetchShippingSettings,
  saveShippingSettings,
} from '../services/shippingSettings.service';
import type { TenantShippingSettings } from '../types/shippingSettings.types';
import { getErrorMessage } from '../utils/errorMessages';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500';

export default function ShippingSettingsPage() {
  const [form, setForm] = useState<TenantShippingSettings>({
    isActive:              true,
    displayName:           'Standart Kargo',
    standardShippingCost:  0,
    freeShippingThreshold: null,
    description:           null,
  });
  const [thresholdInput, setThresholdInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const s = await fetchShippingSettings();
      setForm(s);
      setThresholdInput(s.freeShippingThreshold != null ? String(s.freeShippingThreshold) : '');
    } catch (e: unknown) {
      setLoadError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const thresholdTrim = thresholdInput.trim();
      const updated = await saveShippingSettings({
        isActive:              form.isActive,
        displayName:           form.displayName.trim() || 'Standart Kargo',
        standardShippingCost:  Number(form.standardShippingCost) || 0,
        freeShippingThreshold: thresholdTrim === '' ? null : Number(thresholdTrim),
        description:           form.description?.trim() || null,
      });
      setForm(updated);
      setThresholdInput(
        updated.freeShippingThreshold != null ? String(updated.freeShippingThreshold) : '',
      );
      toast.success('Kargo ayarları kaydedildi.');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-24">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Kargo Ayarları</h1>
        <p className="text-slate-600 mt-2 text-sm max-w-xl">
          Vitrin ödemesinde kullanılacak sabit kargo ücreti ve ücretsiz kargo limitini yapılandırın.
          Canlı kargo firması API entegrasyonu bu adımda yoktur.
        </p>
      </div>

      {loadError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
          <button type="button" onClick={load} className="ml-3 font-semibold underline">
            Tekrar dene
          </button>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Standart kargo</h2>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              form.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {form.isActive ? 'Aktif' : 'Pasif'}
          </span>
        </div>

        <div className="p-5 space-y-4">
          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <span>
              <span className="text-sm font-medium text-slate-800">Kargo aktif</span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Kapalıyken vitrin checkout kargo hesaplaması yapılamaz.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                form.isActive ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                  form.isActive ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Görünen ad</label>
            <input
              className={inputClass}
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Standart kargo ücreti (₺)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              className={inputClass}
              value={form.standardShippingCost}
              onChange={e =>
                setForm(f => ({ ...f, standardShippingCost: Number(e.target.value) || 0 }))
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ücretsiz kargo limiti (₺)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              className={inputClass}
              value={thresholdInput}
              onChange={e => setThresholdInput(e.target.value)}
              placeholder="Boş bırakılırsa limit uygulanmaz"
            />
            <p className="text-xs text-slate-500 mt-1">
              Sepet ara toplamı bu tutara ulaşınca kargo ücreti 0 ₺ olur.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Örn. 1–3 iş günü içinde kargoya verilir."
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </section>
    </div>
  );
}
