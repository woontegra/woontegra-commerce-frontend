import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  fetchPaymentSettings,
  upsertPaymentSetting,
} from '../services/paymentSettings.service';
import type { AdminPaymentSetting, PaymentProviderType } from '../types/paymentSettings.types';
import { PAYMENT_SECRET_PLACEHOLDER } from '../types/paymentSettings.types';
import { getErrorMessage } from '../utils/errorMessages';

const PROVIDER_LABELS: Record<PaymentProviderType, string> = {
  PAYTR:            'PayTR',
  BANK_TRANSFER:    'Havale / EFT',
  CASH_ON_DELIVERY: 'Kapıda Ödeme',
  IYZICO:           'iyzico',
  BANK_POS:         'Banka Sanal POS',
};

function str(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

function secretForSave(value: string, hasCredentials: boolean): string | undefined {
  const v = value.trim();
  if (v === PAYMENT_SECRET_PLACEHOLDER) return PAYMENT_SECRET_PLACEHOLDER;
  if (!v && hasCredentials) return PAYMENT_SECRET_PLACEHOLDER;
  if (!v) return undefined;
  return v;
}

function isMaskedIban(value: string): boolean {
  return value.includes('****');
}

function findSetting(settings: AdminPaymentSetting[], provider: PaymentProviderType) {
  return settings.find(s => s.provider === provider);
}

// ─── UI primitives ───────────────────────────────────────────────────────────

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
        <span className="text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="block text-xs text-slate-500 mt-0.5">{description}</span>}
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

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500';

function CardShell({
  title,
  subtitle,
  active,
  badge,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  active?: boolean;
  badge?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/80">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {badge}
          {active !== undefined && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                active
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {active ? 'Aktif' : 'Pasif'}
            </span>
          )}
        </div>
      </div>
      {children && <div className="p-5 space-y-4">{children}</div>}
      {footer && <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">{footer}</div>}
    </section>
  );
}

function ComingSoonCard({ title, description }: { title: string; description: string }) {
  return (
    <CardShell
      title={title}
      subtitle={description}
      badge={
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
          Yakında
        </span>
      }
    >
      <p className="text-sm text-slate-600">
        Bu ödeme yöntemi henüz aktif değil. Canlı entegrasyon sonraki sürümlerde eklenecek.
      </p>
    </CardShell>
  );
}

// ─── PayTR ───────────────────────────────────────────────────────────────────

type PaytrForm = {
  isActive: boolean;
  isTestMode: boolean;
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
};

function PaytrCard({
  setting,
  onSaved,
}: {
  setting: AdminPaymentSetting | undefined;
  onSaved: (s: AdminPaymentSetting) => void;
}) {
  const [form, setForm] = useState<PaytrForm>({
    isActive:     false,
    isTestMode:   true,
    merchantId:   '',
    merchantKey:  '',
    merchantSalt: '',
  });
  const [saving, setSaving] = useState(false);
  const hasCredentials = setting?.hasCredentials ?? false;

  useEffect(() => {
    const c = setting?.credentials ?? {};
    setForm({
      isActive:     setting?.isActive ?? false,
      isTestMode:   setting?.isTestMode ?? true,
      merchantId:   str(c.merchantId),
      merchantKey:  str(c.merchantKey) || (setting?.hasCredentials ? PAYMENT_SECRET_PLACEHOLDER : ''),
      merchantSalt: str(c.merchantSalt) || (setting?.hasCredentials ? PAYMENT_SECRET_PLACEHOLDER : ''),
    });
  }, [setting]);

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        isActive:   form.isActive,
        isTestMode: form.isTestMode,
        merchantId: form.merchantId.trim(),
      };
      const key = secretForSave(form.merchantKey, hasCredentials);
      const salt = secretForSave(form.merchantSalt, hasCredentials);
      if (key !== undefined) body.merchantKey = key;
      if (salt !== undefined) body.merchantSalt = salt;

      const updated = await upsertPaymentSetting('PAYTR', body);
      onSaved(updated);
      toast.success('PayTR ayarları kaydedildi.');
      const c = updated.credentials;
      setForm(prev => ({
        ...prev,
        isActive:     updated.isActive,
        isTestMode:   updated.isTestMode,
        merchantId:   str(c.merchantId),
        merchantKey:  str(c.merchantKey) || PAYMENT_SECRET_PLACEHOLDER,
        merchantSalt: str(c.merchantSalt) || PAYMENT_SECRET_PLACEHOLDER,
      }));
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardShell
      title={PROVIDER_LABELS.PAYTR}
      subtitle="Kredi kartı ve banka kartı ile online ödeme (PayTR iframe)"
      active={form.isActive}
      footer={
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      }
    >
      <Toggle
        checked={form.isActive}
        onChange={v => setForm(f => ({ ...f, isActive: v }))}
        label="Aktif"
        description="Açıkken vitrin ödemesinde PayTR seçeneği görünür."
      />
      <Toggle
        checked={form.isTestMode}
        onChange={v => setForm(f => ({ ...f, isTestMode: v }))}
        label="Test modu"
        description="Canlıya geçmeden önce PayTR test ortamını kullanın."
      />
      <Field label="Merchant ID">
        <input
          className={inputClass}
          value={form.merchantId}
          onChange={e => setForm(f => ({ ...f, merchantId: e.target.value }))}
          autoComplete="off"
        />
      </Field>
      <Field
        label="Merchant Key"
        hint="Değiştirmek istemiyorsanız *** bırakın. Boş göndermeyin; mevcut anahtar korunur."
      >
        <input
          type="password"
          className={inputClass}
          value={form.merchantKey}
          onChange={e => setForm(f => ({ ...f, merchantKey: e.target.value }))}
          autoComplete="new-password"
        />
      </Field>
      <Field
        label="Merchant Salt"
        hint="Değiştirmek istemiyorsanız *** bırakın."
      >
        <input
          type="password"
          className={inputClass}
          value={form.merchantSalt}
          onChange={e => setForm(f => ({ ...f, merchantSalt: e.target.value }))}
          autoComplete="new-password"
        />
      </Field>
    </CardShell>
  );
}

// ─── Havale / EFT ────────────────────────────────────────────────────────────

type BankForm = {
  isActive: boolean;
  bankName: string;
  accountHolder: string;
  iban: string;
  description: string;
};

function BankTransferCard({
  setting,
  onSaved,
}: {
  setting: AdminPaymentSetting | undefined;
  onSaved: (s: AdminPaymentSetting) => void;
}) {
  const [form, setForm] = useState<BankForm>({
    isActive: false,
    bankName: '',
    accountHolder: '',
    iban: '',
    description: '',
  });
  const [initialIban, setInitialIban] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const c = setting?.credentials ?? {};
    const iban = str(c.iban);
    setForm({
      isActive:      setting?.isActive ?? false,
      bankName:      str(c.bankName),
      accountHolder: str(c.accountHolder),
      iban,
      description:   str(c.description),
    });
    setInitialIban(iban);
  }, [setting]);

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        isActive:      form.isActive,
        bankName:      form.bankName.trim(),
        accountHolder: form.accountHolder.trim(),
        description:   form.description.trim(),
      };
      const ibanTrim = form.iban.trim();
      const ibanUnchanged = ibanTrim === initialIban || isMaskedIban(ibanTrim);
      if (!ibanUnchanged && ibanTrim) {
        body.iban = ibanTrim.replace(/\s/g, '');
      }

      const updated = await upsertPaymentSetting('BANK_TRANSFER', body);
      onSaved(updated);
      toast.success('Havale / EFT ayarları kaydedildi.');
      const c = updated.credentials;
      const iban = str(c.iban);
      setForm({
        isActive:      updated.isActive,
        bankName:      str(c.bankName),
        accountHolder: str(c.accountHolder),
        iban,
        description:   str(c.description),
      });
      setInitialIban(iban);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardShell
      title={PROVIDER_LABELS.BANK_TRANSFER}
      subtitle="Müşteri havale/EFT ile ödeme yapar; hesap bilgileri ödeme adımında gösterilir"
      active={form.isActive}
      footer={
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      }
    >
      <Toggle
        checked={form.isActive}
        onChange={v => setForm(f => ({ ...f, isActive: v }))}
        label="Aktif"
      />
      <Field label="Banka adı">
        <input
          className={inputClass}
          value={form.bankName}
          onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
        />
      </Field>
      <Field label="Hesap sahibi">
        <input
          className={inputClass}
          value={form.accountHolder}
          onChange={e => setForm(f => ({ ...f, accountHolder: e.target.value }))}
        />
      </Field>
      <Field
        label="IBAN"
        hint={
          isMaskedIban(form.iban)
            ? 'Maskeli IBAN görünüyor. Yeni IBAN girmek için alanı değiştirin; aksi halde mevcut IBAN korunur.'
            : undefined
        }
      >
        <input
          className={inputClass}
          value={form.iban}
          onChange={e => setForm(f => ({ ...f, iban: e.target.value }))}
          placeholder="TR00 0000 0000 0000 0000 0000 00"
        />
      </Field>
      <Field label="Açıklama">
        <textarea
          className={`${inputClass} min-h-[80px]`}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Örn. Sipariş numarasını açıklamaya yazın."
        />
      </Field>
    </CardShell>
  );
}

// ─── Kapıda ödeme ────────────────────────────────────────────────────────────

type CodForm = {
  isActive: boolean;
  extraFee: string;
  description: string;
};

function CashOnDeliveryCard({
  setting,
  onSaved,
}: {
  setting: AdminPaymentSetting | undefined;
  onSaved: (s: AdminPaymentSetting) => void;
}) {
  const [form, setForm] = useState<CodForm>({
    isActive: false,
    extraFee: '0',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const c = setting?.credentials ?? {};
    setForm({
      isActive:    setting?.isActive ?? false,
      extraFee:    c.extraFee != null ? String(c.extraFee) : '0',
      description: str(c.description),
    });
  }, [setting]);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await upsertPaymentSetting('CASH_ON_DELIVERY', {
        isActive:    form.isActive,
        extraFee:    Number(form.extraFee) || 0,
        description: form.description.trim(),
      });
      onSaved(updated);
      toast.success('Kapıda ödeme ayarları kaydedildi.');
      const c = updated.credentials;
      setForm({
        isActive:    updated.isActive,
        extraFee:    c.extraFee != null ? String(c.extraFee) : '0',
        description: str(c.description),
      });
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardShell
      title={PROVIDER_LABELS.CASH_ON_DELIVERY}
      subtitle="Teslimat sırasında nakit veya POS ile tahsilat"
      active={form.isActive}
      footer={
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      }
    >
      <Toggle
        checked={form.isActive}
        onChange={v => setForm(f => ({ ...f, isActive: v }))}
        label="Aktif"
      />
      <Field label="Ek ücret (₺)">
        <input
          type="number"
          min={0}
          step={0.01}
          className={inputClass}
          value={form.extraFee}
          onChange={e => setForm(f => ({ ...f, extraFee: e.target.value }))}
        />
      </Field>
      <Field label="Açıklama">
        <textarea
          className={`${inputClass} min-h-[80px]`}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
      </Field>
    </CardShell>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PaymentSettingsPage() {
  const [settings, setSettings] = useState<AdminPaymentSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await fetchPaymentSettings();
      setSettings(list);
    } catch (e: unknown) {
      setLoadError(getErrorMessage(e));
      setSettings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byProvider = useMemo(
    () => ({
      paytr: findSetting(settings, 'PAYTR'),
      bank:  findSetting(settings, 'BANK_TRANSFER'),
      cod:   findSetting(settings, 'CASH_ON_DELIVERY'),
    }),
    [settings],
  );

  const mergeSetting = (updated: AdminPaymentSetting) => {
    setSettings(prev => {
      const idx = prev.findIndex(s => s.provider === updated.provider);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-24">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Ödeme Ayarları</h1>
        <p className="text-slate-600 mt-2 text-sm max-w-2xl">
          Mağaza vitrininde hangi ödeme yöntemlerinin görüneceğini buradan yönetin.
          Ayarlar yalnızca kendi mağazanız için geçerlidir.
        </p>
      </div>

      {loadError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
          <button
            type="button"
            onClick={load}
            className="ml-3 font-semibold underline hover:no-underline"
          >
            Tekrar dene
          </button>
        </div>
      )}

      <div className="space-y-6">
        <PaytrCard setting={byProvider.paytr} onSaved={mergeSetting} />
        <BankTransferCard setting={byProvider.bank} onSaved={mergeSetting} />
        <CashOnDeliveryCard setting={byProvider.cod} onSaved={mergeSetting} />
        <ComingSoonCard
          title={PROVIDER_LABELS.IYZICO}
          description="iyzico sanal POS entegrasyonu"
        />
        <ComingSoonCard
          title={PROVIDER_LABELS.BANK_POS}
          description="Banka sanal POS doğrudan entegrasyonu"
        />
      </div>
    </div>
  );
}
