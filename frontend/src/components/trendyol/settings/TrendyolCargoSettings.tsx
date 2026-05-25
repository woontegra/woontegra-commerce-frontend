/**
 * TrendyolCargoSettings
 * Global kargo şirketi, teslimat süresi ve desi ayarları.
 * TrendyolIntegration.tsx#ShippingDefaultsPanel'ın bağımsız kardeşidir.
 */

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi, CARGO_COMPANIES } from './trendyol-settings-api';

export default function TrendyolCargoSettings() {
  const qc = useQueryClient();

  const { data: defaults, isLoading } = useQuery({
    queryKey: ['trendyol-shipping-defaults'],
    queryFn:  settingsApi.getShippingDefaults,
    staleTime: 0,
  });

  const [form, setForm] = useState({ cargoCompanyId: 10, deliveryDuration: 3, dimensionalWeight: 1 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (defaults) setForm({
      cargoCompanyId:    defaults.cargoCompanyId    ?? 10,
      deliveryDuration:  defaults.deliveryDuration  ?? 3,
      dimensionalWeight: defaults.dimensionalWeight ?? 1,
    });
  }, [defaults]);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.saveShippingDefaults(form);
      qc.invalidateQueries({ queryKey: ['trendyol-shipping-defaults'] });
      toast.success('Kargo varsayılanları kaydedildi.');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const selectedCargoName = CARGO_COMPANIES.find(c => c.id === form.cargoCompanyId)?.name ?? '—';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Kargo Ayarları</h3>
            <p className="text-[11px] text-gray-400">Ürünlerde kargo ayarı yoksa bu değerler kullanılır</p>
          </div>
        </div>
        <button onClick={save} disabled={saving || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors flex-shrink-0">
          {saving && <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>

      <div className="p-6 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse"/>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Cargo company */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Kargo Firması</label>
              <select value={form.cargoCompanyId}
                onChange={e => setForm(f => ({ ...f, cargoCompanyId: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                {CARGO_COMPANIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                ))}
              </select>
            </div>

            {/* Delivery duration */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Teslimat Süresi (gün)</label>
              <div className="relative">
                <input type="number" min="1" max="30"
                  value={form.deliveryDuration}
                  onChange={e => setForm(f => ({ ...f, deliveryDuration: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">gün</span>
              </div>
            </div>

            {/* Dimensional weight */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Varsayılan Desi</label>
              <div className="relative">
                <input type="number" min="0.1" step="0.1"
                  value={form.dimensionalWeight}
                  onChange={e => setForm(f => ({ ...f, dimensionalWeight: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">desi</span>
              </div>
            </div>
          </div>
        )}

        {/* Active cargo info */}
        {!isLoading && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Seçili kargo: <strong className="ml-0.5">{selectedCargoName}</strong> — {form.deliveryDuration} gün, {form.dimensionalWeight} desi
          </div>
        )}

        {/* Company table (collapsible) */}
        <details className="group">
          <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 transition-colors list-none flex items-center gap-1 select-none">
            <svg className="w-3 h-3 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            Tüm kargo şirketleri listesi
          </summary>
          <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-500 font-semibold">ID</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-semibold">Şirket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {CARGO_COMPANIES.map(c => (
                  <tr key={c.id} className={form.cargoCompanyId === c.id ? 'bg-orange-50' : 'bg-white'}>
                    <td className="px-3 py-1.5 font-mono font-bold text-orange-600">{c.id}</td>
                    <td className="px-3 py-1.5 text-gray-700">{c.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}
