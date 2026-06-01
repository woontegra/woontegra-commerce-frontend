import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  CreditCard,
  Loader2,
  Shield,
  AlertTriangle,
  Building2,
  Truck,
} from 'lucide-react';
import {
  fetchPaymentSettings,
  upsertPaymentSetting,
} from '../services/paymentSettings.service';
import type { AdminPaymentSetting } from '../types/paymentSettings.types';
import { PAYMENT_SECRET_PLACEHOLDER } from '../types/paymentSettings.types';
import { getErrorMessage } from '../utils/errorMessages';
import { PROVIDER_LABELS } from './paymentSettings.constants';
import {
  buildSetupChecklist,
  countActiveMethods,
  countPendingSetup,
  countTestModeProviders,
  findSetting,
  isMaskedIban,
  providerDisplayStatus,
  resolveDefaultPaymentLabel,
  statusBadgeClass,
  str,
  SUPPORTED_PROVIDERS,
  validateTurkishIban,
} from './paymentSettingsPageHelpers';

function secretForSave(value: string, hasCredentials: boolean): string | undefined {
  const v = value.trim();
  if (v === PAYMENT_SECRET_PLACEHOLDER) return PAYMENT_SECRET_PLACEHOLDER;
  if (!v && hasCredentials) return PAYMENT_SECRET_PLACEHOLDER;
  if (!v) return undefined;
  return v;
}

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

function StatusBadge({ status }: { status: ReturnType<typeof providerDisplayStatus> }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(status)}`}>
      {status}
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start justify-between gap-4 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
      <span>
        <span className="text-[13px] font-medium text-slate-800">{label}</span>
        {description && <span className="block text-[11px] text-slate-500 mt-0.5">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
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

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function ProviderCardShell({
  title,
  subtitle,
  status,
  icon: Icon,
  children,
  footer,
  disabled,
}: {
  title: string;
  subtitle: string;
  status: ReturnType<typeof providerDisplayStatus>;
  icon: React.ComponentType<{ className?: string }>;
  children?: ReactNode;
  footer?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white overflow-hidden ${disabled ? 'opacity-90' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-slate-900">{title}</h3>
            <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      {children && <div className="p-5 space-y-4">{children}</div>}
      {footer && <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/40">{footer}</div>}
    </div>
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
    isActive: false, isTestMode: true, merchantId: '', merchantKey: '', merchantSalt: '',
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
        isActive: form.isActive, isTestMode: form.isTestMode,
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
        isActive: updated.isActive, isTestMode: updated.isTestMode,
        merchantId: str(c.merchantId),
        merchantKey: str(c.merchantKey) || PAYMENT_SECRET_PLACEHOLDER,
        merchantSalt: str(c.merchantSalt) || PAYMENT_SECRET_PLACEHOLDER,
      }));
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const status: ReturnType<typeof providerDisplayStatus> = !form.isActive
    ? 'Pasif'
    : form.isTestMode
      ? 'Test Modu'
      : hasCredentials
        ? 'Aktif'
        : 'Eksik Kurulum';

  return (
    <ProviderCardShell
      title={PROVIDER_LABELS.PAYTR}
      subtitle="Kredi kartı ve banka kartı ile online ödeme (PayTR iframe)"
      status={status}
      icon={CreditCard}
      footer={<SaveButton saving={saving} onClick={save} />}
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
        <input className={inputCls} value={form.merchantId}
          onChange={e => setForm(f => ({ ...f, merchantId: e.target.value }))} autoComplete="off" />
      </Field>
      <Field label="Merchant Key" hint="Değiştirmek istemiyorsanız *** bırakın. Boş göndermeyin; mevcut anahtar korunur.">
        <input type="password" className={inputCls} value={form.merchantKey}
          onChange={e => setForm(f => ({ ...f, merchantKey: e.target.value }))} autoComplete="new-password" />
      </Field>
      <Field label="Merchant Salt" hint="Değiştirmek istemiyorsanız *** bırakın.">
        <input type="password" className={inputCls} value={form.merchantSalt}
          onChange={e => setForm(f => ({ ...f, merchantSalt: e.target.value }))} autoComplete="new-password" />
      </Field>
    </ProviderCardShell>
  );
}

// ─── Planned provider ────────────────────────────────────────────────────────

function PlannedProviderCard({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <ProviderCardShell
      title={title}
      subtitle={subtitle}
      status="Yakında"
      icon={CreditCard}
      disabled
    >
      <p className="text-[13px] text-slate-600 leading-relaxed">
        {title} entegrasyonu sonraki fazda aktif edilecek. Canlı entegrasyon hazır olana kadar bu yöntem vitrinde gösterilmez.
      </p>
      <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
        <p className="text-[11px] text-slate-500">API anahtarları ve banka seçimi bu fazda kullanılamaz.</p>
      </div>
    </ProviderCardShell>
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
    isActive: false, bankName: '', accountHolder: '', iban: '', description: '',
  });
  const [initialIban, setInitialIban] = useState('');
  const [ibanError, setIbanError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const c = setting?.credentials ?? {};
    const iban = str(c.iban);
    setForm({
      isActive: setting?.isActive ?? false,
      bankName: str(c.bankName), accountHolder: str(c.accountHolder),
      iban, description: str(c.description),
    });
    setInitialIban(iban);
    setIbanError(null);
  }, [setting]);

  const save = async () => {
    const ibanTrim = form.iban.trim();
    const ibanUnchanged = ibanTrim === initialIban || isMaskedIban(ibanTrim);
    if (!ibanUnchanged && ibanTrim) {
      const err = validateTurkishIban(ibanTrim);
      if (err) {
        setIbanError(err);
        toast.error(err);
        return;
      }
    }
    setIbanError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        isActive: form.isActive,
        bankName: form.bankName.trim(),
        accountHolder: form.accountHolder.trim(),
        description: form.description.trim(),
      };
      if (!ibanUnchanged && ibanTrim) body.iban = ibanTrim.replace(/\s/g, '');

      const updated = await upsertPaymentSetting('BANK_TRANSFER', body);
      onSaved(updated);
      toast.success('Havale / EFT ayarları kaydedildi.');
      const c = updated.credentials;
      const iban = str(c.iban);
      setForm({
        isActive: updated.isActive,
        bankName: str(c.bankName), accountHolder: str(c.accountHolder),
        iban, description: str(c.description),
      });
      setInitialIban(iban);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const status = form.isActive
    ? (form.iban.trim() || isMaskedIban(form.iban) ? 'Aktif' : 'Eksik Kurulum')
    : 'Pasif';

  return (
    <ProviderCardShell
      title={PROVIDER_LABELS.BANK_TRANSFER}
      subtitle="Müşteri havale/EFT ile öder; hesap bilgileri ödeme adımında gösterilir"
      status={status}
      icon={Building2}
      footer={<SaveButton saving={saving} onClick={save} />}
    >
      <Toggle checked={form.isActive} onChange={v => setForm(f => ({ ...f, isActive: v }))} label="Aktif" />
      {form.isActive && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800">Manuel onay gerektirir — ödeme bildirimi sonrası siparişi onaylamanız gerekir.</p>
        </div>
      )}
      <Field label="Banka adı">
        <input className={inputCls} value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} />
      </Field>
      <Field label="Hesap sahibi">
        <input className={inputCls} value={form.accountHolder} onChange={e => setForm(f => ({ ...f, accountHolder: e.target.value }))} />
      </Field>
      <Field
        label="IBAN"
        hint={isMaskedIban(form.iban) ? 'Maskeli IBAN görünüyor. Yeni IBAN girmek için alanı değiştirin.' : 'TR ile başlayan 26 karakterlik IBAN'}
      >
        <input
          className={`${inputCls} ${ibanError ? 'border-red-300 focus:ring-red-200' : ''}`}
          value={form.iban}
          onChange={e => { setForm(f => ({ ...f, iban: e.target.value })); setIbanError(null); }}
          placeholder="TR00 0000 0000 0000 0000 0000 00"
        />
        {ibanError && <p className="mt-1 text-[11px] text-red-600">{ibanError}</p>}
      </Field>
      <Field label="Müşteriye gösterilecek ödeme notu">
        <textarea
          className={`${inputCls} min-h-[80px] resize-y`}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Örn. Sipariş numarasını açıklamaya yazın."
        />
      </Field>
    </ProviderCardShell>
  );
}

// ─── Kapıda ödeme ────────────────────────────────────────────────────────────

type CodForm = { isActive: boolean; extraFee: string; description: string };

function CashOnDeliveryCard({
  setting,
  onSaved,
}: {
  setting: AdminPaymentSetting | undefined;
  onSaved: (s: AdminPaymentSetting) => void;
}) {
  const [form, setForm] = useState<CodForm>({ isActive: false, extraFee: '0', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const c = setting?.credentials ?? {};
    setForm({
      isActive: setting?.isActive ?? false,
      extraFee: c.extraFee != null ? String(c.extraFee) : '0',
      description: str(c.description),
    });
  }, [setting]);

  const feeNum = Number(form.extraFee);
  const feeValid = form.extraFee === '' || (Number.isFinite(feeNum) && feeNum >= 0);

  const save = async () => {
    if (!feeValid) {
      toast.error('Ek ücret negatif olamaz.');
      return;
    }
    setSaving(true);
    try {
      const updated = await upsertPaymentSetting('CASH_ON_DELIVERY', {
        isActive: form.isActive,
        extraFee: Number(form.extraFee) || 0,
        description: form.description.trim(),
      });
      onSaved(updated);
      toast.success('Kapıda ödeme ayarları kaydedildi.');
      const c = updated.credentials;
      setForm({
        isActive: updated.isActive,
        extraFee: c.extraFee != null ? String(c.extraFee) : '0',
        description: str(c.description),
      });
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProviderCardShell
      title={PROVIDER_LABELS.CASH_ON_DELIVERY}
      subtitle="Teslimat sırasında nakit veya POS ile tahsilat"
      status={form.isActive ? 'Aktif' : 'Pasif'}
      icon={Truck}
      footer={<SaveButton saving={saving} onClick={save} disabled={!feeValid} />}
    >
      <Toggle checked={form.isActive} onChange={v => setForm(f => ({ ...f, isActive: v }))} label="Aktif" />
      {form.isActive && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 space-y-1">
          <p className="text-[11px] text-slate-600">Teslimat sırasında tahsilat gerektirir.</p>
          <p className="text-[11px] text-slate-500">Kargo firması ile tahsilat sürecinizi kontrol edin.</p>
        </div>
      )}
      <Field
        label="Ek ücret (₺)"
        hint={feeNum === 0 || form.extraFee === '0' ? 'Ek ücret yok' : undefined}
      >
        <input
          type="number"
          min={0}
          step={0.01}
          className={inputCls}
          value={form.extraFee}
          onChange={e => {
            const v = e.target.value;
            if (v === '' || Number(v) >= 0) setForm(f => ({ ...f, extraFee: v }));
          }}
        />
      </Field>
      <Field label="Açıklama">
        <textarea
          className={`${inputCls} min-h-[80px] resize-y`}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
      </Field>
    </ProviderCardShell>
  );
}

// ─── Right column ────────────────────────────────────────────────────────────

function PaymentStatusSummary({ settings }: { settings: AdminPaymentSetting[] }) {
  const rows = [
    { label: PROVIDER_LABELS.PAYTR,            setting: findSetting(settings, 'PAYTR'),            planned: false },
    { label: PROVIDER_LABELS.BANK_TRANSFER,    setting: findSetting(settings, 'BANK_TRANSFER'), planned: false },
    { label: PROVIDER_LABELS.CASH_ON_DELIVERY, setting: findSetting(settings, 'CASH_ON_DELIVERY'), planned: false },
    { label: PROVIDER_LABELS.IYZICO,           setting: undefined, planned: true },
    { label: PROVIDER_LABELS.BANK_POS,         setting: undefined, planned: true },
  ];

  return (
    <Panel title="Ödeme durumu özeti" desc="Sağlayıcıların güncel durumu">
      <ul className="space-y-2.5">
        {rows.map(row => {
          const status = providerDisplayStatus(row.setting, row.planned);
          return (
            <li key={row.label} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="text-slate-700">{row.label}</span>
              <StatusBadge status={status} />
            </li>
          );
        })}
      </ul>
      {findSetting(settings, 'BANK_TRANSFER')?.isActive && (
        <p className="mt-4 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Havale/EFT aktif — manuel onay gerektirir.
        </p>
      )}
    </Panel>
  );
}

function SetupChecklistPanel({ settings }: { settings: AdminPaymentSetting[] }) {
  const items = buildSetupChecklist(settings);
  return (
    <Panel title="Kurulum kontrol listesi">
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.key} className="flex items-center gap-2.5 text-[13px]">
            <CheckCircle className={`w-4 h-4 shrink-0 ${item.done ? 'text-emerald-500' : 'text-slate-300'}`} />
            <span className={item.done ? 'text-slate-700' : 'text-slate-500'}>{item.label}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function SecurityInfoPanel() {
  return (
    <Panel title="Güvenlik ve test bilgisi">
      <div className="flex gap-3">
        <Shield className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <ul className="space-y-2 text-[12px] text-slate-600 leading-relaxed">
          <li>API anahtarları güvenli şekilde saklanır.</li>
          <li>Merchant Key ve Salt alanları değişiklik yapılmadıkça boş veya *** bırakılabilir.</li>
          <li>Canlı moda geçmeden önce test ödeme yapmanız önerilir.</li>
        </ul>
      </div>
    </Panel>
  );
}

function SupportedProvidersPanel() {
  return (
    <Panel title="Desteklenen sağlayıcılar">
      <ul className="space-y-2">
        {SUPPORTED_PROVIDERS.map(p => (
          <li key={p.name} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="text-slate-700">{p.name}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              p.support === 'Aktif destek'
                ? 'bg-emerald-100 text-emerald-700'
                : p.support === 'Planlandı'
                  ? 'bg-slate-200 text-slate-600'
                  : 'bg-slate-100 text-slate-500'
            }`}>
              {p.support}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
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

  useEffect(() => { load(); }, [load]);

  const byProvider = useMemo(() => ({
    paytr: findSetting(settings, 'PAYTR'),
    bank:  findSetting(settings, 'BANK_TRANSFER'),
    cod:   findSetting(settings, 'CASH_ON_DELIVERY'),
  }), [settings]);

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

  const activeCount = countActiveMethods(settings);
  const testCount   = countTestModeProviders(settings);
  const pendingCount = countPendingSetup(settings);
  const defaultLabel = resolveDefaultPaymentLabel(settings);

  return (
    <div className="w-full space-y-6 pb-10 page-enter">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Ödeme Ayarları</h1>
        <p className="text-[13px] text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Mağazanızda kullanılacak ödeme yöntemlerini, test modunu ve ödeme sağlayıcılarını yönetin.
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
          label="Aktif Ödeme Yöntemi"
          value={loading ? '…' : String(activeCount)}
          sub={activeCount === 0 ? 'Henüz aktif yöntem yok' : `${activeCount} yöntem aktif`}
        />
        <SummaryMetric
          label="Test Modundaki Sağlayıcı"
          value={loading ? '…' : String(testCount)}
          sub={testCount > 0 ? 'PayTR test modunda' : 'Test modu yok'}
        />
        <SummaryMetric
          label="Kurulum Bekleyen"
          value={loading ? '…' : String(pendingCount)}
          sub="Eksik veya planlanan sağlayıcılar"
        />
        <SummaryMetric
          label="Varsayılan Ödeme"
          value={loading ? '…' : defaultLabel}
          sub={defaultLabel === 'Tanımlı değil' ? 'Aktif yöntem seçin' : 'İlk aktif yöntem'}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2 space-y-6">
            <Panel title="Online ödeme sağlayıcıları" desc="Kredi kartı ve sanal POS entegrasyonları">
              <div className="space-y-4">
                <PaytrCard setting={byProvider.paytr} onSaved={mergeSetting} />
                <PlannedProviderCard
                  title={PROVIDER_LABELS.IYZICO}
                  subtitle="iyzico sanal POS entegrasyonu"
                />
                <PlannedProviderCard
                  title={PROVIDER_LABELS.BANK_POS}
                  subtitle="Banka sanal POS doğrudan entegrasyonu"
                />
              </div>
            </Panel>

            <Panel title="Manuel ödeme yöntemleri" desc="Havale ve EFT ile ödeme">
              <BankTransferCard setting={byProvider.bank} onSaved={mergeSetting} />
            </Panel>

            <Panel title="Kapıda ödeme" desc="Teslimat sırasında tahsilat">
              <CashOnDeliveryCard setting={byProvider.cod} onSaved={mergeSetting} />
            </Panel>
          </div>

          <div className="space-y-6">
            <PaymentStatusSummary settings={settings} />
            <SetupChecklistPanel settings={settings} />
            <SecurityInfoPanel />
            <SupportedProvidersPanel />
          </div>
        </div>
      )}
    </div>
  );
}
