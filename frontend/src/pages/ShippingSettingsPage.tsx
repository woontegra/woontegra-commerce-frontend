import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  Info,
  Loader2,
  Package,
  Truck,
} from 'lucide-react';
import {
  fetchShippingSettings,
  saveShippingSettings,
} from '../services/shippingSettings.service';
import type { TenantShippingSettings } from '../types/shippingSettings.types';
import { getErrorMessage } from '../utils/errorMessages';
import {
  buildShippingPreview,
  buildShippingSetupChecklist,
  integrationBadgeClass,
  isShippingCostValid,
  isThresholdInputValid,
  PLANNED_SHIPPING_FEATURES,
  safeNumber,
  SHIPPING_INTEGRATIONS,
  summaryDeliveryInfoLabel,
  summaryShippingFeeLabel,
  summaryThresholdLabel,
  type ShippingFormState,
} from './shippingSettingsPageHelpers';

const inputCls =
  'w-full bg-white border border-slate-200 text-slate-900 text-[13px] px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300';

function SummaryMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="wn-card px-4 py-3 min-w-[120px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-[15px] font-semibold mt-1 text-slate-900 leading-snug">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Panel({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="wn-card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-[13px] font-semibold text-slate-800">{title}</h2>
        {desc && <p className="text-[12px] text-slate-500 mt-0.5">{desc}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <span>
        <span className="text-[13px] font-medium text-slate-800">{label}</span>
        {description && (
          <span className="block text-[11px] text-slate-500 mt-0.5">{description}</span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-indigo-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

function SaveButton({ saving, onClick, disabled }: { saving: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving || disabled}
      className="btn btn-primary text-[13px] inline-flex items-center gap-2"
    >
      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
      {saving ? 'Kaydediliyor…' : 'Kaydet'}
    </button>
  );
}

function ShippingPreviewPanel({ state }: { state: ShippingFormState }) {
  const preview = buildShippingPreview(state);

  return (
    <Panel title="Kargo önizleme" desc="Checkout’ta müşterinin göreceği özet">
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-slate-900">{preview.title}</p>
            {preview.inactive ? (
              <p className="text-[12px] text-slate-500 mt-1">{preview.deliveryLabel}</p>
            ) : (
              <div className="mt-2 space-y-1.5 text-[12px] text-slate-600">
                <p>
                  <span className="text-slate-400">Ücret: </span>
                  <span className="font-semibold text-slate-800">{preview.feeLabel}</span>
                </p>
                <p>
                  <span className="text-slate-400">Ücretsiz kargo limiti: </span>
                  {preview.thresholdLabel}
                </p>
                <p>
                  <span className="text-slate-400">Teslimat: </span>
                  {preview.deliveryLabel}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function SetupChecklistPanel({ state }: { state: ShippingFormState }) {
  const items = buildShippingSetupChecklist(state);
  return (
    <Panel title="Kurulum kontrol listesi">
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.key} className="flex items-center gap-2.5 text-[13px]">
            <CheckCircle
              className={`w-4 h-4 shrink-0 ${item.done ? 'text-emerald-500' : 'text-slate-300'}`}
            />
            <span className={item.done ? 'text-slate-700' : 'text-slate-500'}>{item.label}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function ShippingIntegrationsPanel() {
  return (
    <Panel title="Kargo entegrasyonları" desc="Mevcut ve planlanan kargo yetenekleri">
      <ul className="space-y-2">
        {SHIPPING_INTEGRATIONS.map(item => (
          <li key={item.name} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="text-slate-700">{item.name}</span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full text-right max-w-[160px] leading-snug ${integrationBadgeClass(item.support)}`}
            >
              {item.support}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
          Gelecek faz
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PLANNED_SHIPPING_FEATURES.map(feature => (
            <span
              key={feature}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500"
            >
              {feature} · Planlandı
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function ShippingInfoPanel() {
  return (
    <Panel title="Bilgilendirme">
      <div className="flex gap-3">
        <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <ul className="space-y-2 text-[12px] text-slate-600 leading-relaxed">
          <li>Kargo ücretleri checkout sırasında sepet toplamına göre hesaplanır.</li>
          <li>Kapıda ödeme ek ücreti ödeme ayarlarından yönetilir.</li>
          <li>Pazaryeri kargo süreçleri ilgili pazaryeri entegrasyonundan yönetilir.</li>
        </ul>
      </div>
    </Panel>
  );
}

export default function ShippingSettingsPage() {
  const [form, setForm] = useState<TenantShippingSettings>({
    isActive: true,
    displayName: 'Standart Kargo',
    standardShippingCost: 0,
    freeShippingThreshold: null,
    description: null,
  });
  const [thresholdInput, setThresholdInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const formState: ShippingFormState = useMemo(
    () => ({ ...form, thresholdInput }),
    [form, thresholdInput],
  );

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

  const costValid = isShippingCostValid(safeNumber(form.standardShippingCost));
  const thresholdValid = isThresholdInputValid(thresholdInput);
  const canSave = costValid && thresholdValid;

  const save = async () => {
    if (!costValid) {
      toast.error('Kargo ücreti negatif olamaz.');
      return;
    }
    if (!thresholdValid) {
      toast.error('Ücretsiz kargo limiti geçersiz.');
      return;
    }
    if (!form.displayName.trim()) {
      toast('Görünen ad boş; kayıtta "Standart Kargo" kullanılacak.', { icon: 'ℹ️' });
    }

    setSaving(true);
    try {
      const thresholdTrim = thresholdInput.trim();
      const updated = await saveShippingSettings({
        isActive: form.isActive,
        displayName: form.displayName.trim() || 'Standart Kargo',
        standardShippingCost: safeNumber(form.standardShippingCost, 0),
        freeShippingThreshold: thresholdTrim === '' ? null : safeNumber(thresholdTrim),
        description: form.description?.trim() || null,
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

  return (
    <div className="w-full space-y-6 pb-10 page-enter">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
          Kargo Ayarları
        </h1>
        <p className="text-[13px] text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Mağazanızın kargo ücretlerini, ücretsiz kargo limitini ve teslimat açıklamalarını yönetin.
        </p>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {loadError}
          <button type="button" onClick={load} className="ml-3 font-semibold underline hover:no-underline">
            Tekrar dene
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryMetric
          label="Kargo Durumu"
          value={loading ? '…' : form.isActive ? 'Aktif' : 'Pasif'}
          sub={form.isActive ? 'Vitrinde hesaplanır' : 'Checkout’ta uygulanmaz'}
        />
        <SummaryMetric
          label="Standart Kargo Ücreti"
          value={loading ? '…' : summaryShippingFeeLabel(safeNumber(form.standardShippingCost))}
          sub={safeNumber(form.standardShippingCost) > 0 ? 'Sabit ücret' : 'Ücretsiz kargo'}
        />
        <SummaryMetric
          label="Ücretsiz Kargo Limiti"
          value={loading ? '…' : summaryThresholdLabel(thresholdInput)}
          sub={thresholdInput.trim() === '' ? 'Limit tanımlı değil' : 'Sepet ara toplamına göre'}
        />
        <SummaryMetric
          label="Teslimat Bilgisi"
          value={loading ? '…' : summaryDeliveryInfoLabel(form.description)}
          sub={form.description?.trim() ? 'Müşteriye gösterilir' : 'Henüz tanımlı değil'}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2 space-y-6">
            <Panel
              title="Standart Kargo Ayarı"
              desc="Vitrin checkout’ta kullanılan sabit kargo ücreti ve görünen ad"
            >
              <div className="space-y-6">
                <Toggle
                  checked={form.isActive}
                  onChange={v => setForm(f => ({ ...f, isActive: v }))}
                  label="Kargo aktif"
                  description="Kargo pasif olduğunda checkout’ta standart kargo ücreti uygulanmaz."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Görünen ad">
                    <input
                      className={inputCls}
                      value={form.displayName}
                      onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                      placeholder="Standart Kargo"
                    />
                  </Field>
                  <Field
                    label="Standart kargo ücreti (₺)"
                    hint={safeNumber(form.standardShippingCost) <= 0 ? 'Ücretsiz kargo' : undefined}
                  >
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className={inputCls}
                      value={form.standardShippingCost}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === '' || Number(v) >= 0) {
                          setForm(f => ({ ...f, standardShippingCost: v === '' ? 0 : Number(v) }));
                        }
                      }}
                    />
                  </Field>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-[12px] font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-500" />
                    Ücretsiz Kargo Kuralı
                  </h3>
                  <Field
                    label="Ücretsiz kargo limiti (₺)"
                    hint={
                      thresholdInput.trim() === ''
                        ? 'Boş bırakılırsa ücretsiz kargo limiti uygulanmaz.'
                        : 'Sepet ara toplamı bu tutara ulaştığında kargo ücreti 0 ₺ olur.'
                    }
                  >
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className={inputCls}
                      value={thresholdInput}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === '' || Number(v) >= 0) setThresholdInput(v);
                      }}
                      placeholder="Boş bırakılırsa limit uygulanmaz"
                    />
                  </Field>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-[12px] font-semibold text-slate-700 mb-4">Teslimat Açıklaması</h3>
                  <Field label="Açıklama">
                    <textarea
                      className={`${inputCls} min-h-[96px] resize-y`}
                      value={form.description ?? ''}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Örn. Siparişler 1-3 iş günü içinde kargoya verilir."
                    />
                  </Field>
                </div>

                <div className="border-t border-slate-100 pt-4 flex justify-end">
                  <SaveButton saving={saving} onClick={save} disabled={!canSave} />
                </div>
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <ShippingPreviewPanel state={formState} />
            <SetupChecklistPanel state={formState} />
            <ShippingIntegrationsPanel />
            <ShippingInfoPanel />
          </div>
        </div>
      )}
    </div>
  );
}
