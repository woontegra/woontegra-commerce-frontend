import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  Crown,
  ExternalLink,
  Globe,
  Info,
  Link2,
  Loader2,
  Lock,
} from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import { useFeatureContext, type PlanTier } from '../context/FeatureContext';
import {
  fetchDomainSettings,
  saveCustomDomain,
} from '../services/domainSettings.service';
import type { TenantDomainSettings } from '../types/domainSettings.types';
import { getErrorMessage } from '../utils/errorMessages';
import {
  activeDomainLabel,
  buildDomainPreview,
  buildDomainSetupChecklist,
  buildSubdomainPreview,
  customDomainSupportLabel,
  DNS_GUIDE_ITEMS,
  isEnterprisePlan,
  planLabel,
  resolveSubdomainSuffix,
  resolveVerificationStatus,
  subdomainStatusLabel,
  validateCustomDomain,
  verificationBadgeClass,
  verificationStatusLabel,
} from './domainSettingsPageHelpers';

const inputCls =
  'w-full bg-white border border-slate-200 text-slate-900 text-[13px] px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300';

function SummaryMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="wn-card px-4 py-3 min-w-[120px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-[15px] font-semibold mt-1 text-slate-900 leading-snug break-words">{value}</p>
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

function SaveButton({ saving, onClick, disabled, label = 'Kaydet' }: {
  saving: boolean;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving || disabled}
      className="btn btn-primary text-[13px] inline-flex items-center gap-2"
    >
      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
      {saving ? 'Kaydediliyor…' : label}
    </button>
  );
}

function DomainPreviewPanel({ settings }: { settings: TenantDomainSettings }) {
  const preview = buildDomainPreview(settings);

  return (
    <Panel title="Domain önizleme" desc="Müşterilerin mağazanıza erişeceği adresler">
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Aktif vitrin</p>
              {preview.primaryHref ? (
                <a
                  href={preview.primaryHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-700 break-all inline-flex items-center gap-1 mt-0.5"
                >
                  {preview.primaryLabel}
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              ) : (
                <p className="text-[13px] font-semibold text-slate-700 mt-0.5">{preview.primaryLabel}</p>
              )}
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Subdomain / alternatif</p>
              {preview.secondaryHref ? (
                <a
                  href={preview.secondaryHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-slate-600 hover:text-indigo-600 break-all inline-flex items-center gap-1 mt-0.5"
                >
                  {preview.secondaryLabel}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <p className="text-[12px] text-slate-600 mt-0.5">{preview.secondaryLabel}</p>
              )}
            </div>
            {preview.inactiveNote && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                {preview.inactiveNote}
              </p>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function SetupChecklistPanel({ settings, plan }: { settings: TenantDomainSettings; plan: PlanTier }) {
  const items = buildDomainSetupChecklist(settings, plan);
  return (
    <Panel title="Domain durum kontrolü">
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

function DnsGuidePanel({ hasCustomDomain }: { hasCustomDomain: boolean }) {
  return (
    <Panel title="DNS kurulum rehberi" desc="Özel domain bağlantısı için genel bilgiler">
      <ul className="space-y-2 text-[12px] text-slate-600 leading-relaxed">
        {DNS_GUIDE_ITEMS.map(item => (
          <li key={item} className="flex gap-2">
            <Link2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">
        {hasCustomDomain
          ? 'DNS kayıt değerleri doğrulama altyapısı tamamlandığında bu alanda gösterilecektir.'
          : 'DNS kayıt bilgileri custom domain altyapısı aktif edildiğinde gösterilecektir.'}
      </p>
    </Panel>
  );
}

function InfoPanel() {
  return (
    <Panel title="Bilgilendirme">
      <div className="flex gap-3">
        <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <ul className="space-y-2 text-[12px] text-slate-600 leading-relaxed">
          <li>Vitrin linki slug veya subdomain ile <code className="text-[11px]">?tenant=</code> parametresi üzerinden çalışır.</li>
          <li>Subdomain mağaza oluşturulurken atanır; panelden değiştirme sonraki fazda eklenecektir.</li>
          <li>Özel domain yönetimi Enterprise plan kapsamındadır.</li>
        </ul>
      </div>
    </Panel>
  );
}

export default function DomainSettings() {
  const { plan } = useFeatureContext();
  const { refresh: refreshBranding } = useBranding();

  const [settings, setSettings] = useState<TenantDomainSettings | null>(null);
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingCustom, setSavingCustom] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const enterprise = isEnterprisePlan(plan);
  const verificationStatus = settings ? resolveVerificationStatus(settings) : 'none';

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchDomainSettings();
      setSettings(data);
      setCustomDomainInput(data.customDomain ?? '');
    } catch (e: unknown) {
      setLoadError(getErrorMessage(e));
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const customDomainError = useMemo(() => {
    if (!customDomainInput.trim()) return null;
    return validateCustomDomain(customDomainInput);
  }, [customDomainInput]);

  const saveCustom = async () => {
    if (!enterprise) return;
    const err = validateCustomDomain(customDomainInput);
    if (err) {
      toast.error(err);
      return;
    }

    setSavingCustom(true);
    try {
      const updated = await saveCustomDomain(customDomainInput.trim().toLowerCase());
      setSettings(updated);
      setCustomDomainInput(updated.customDomain ?? '');
      await refreshBranding();
      toast.success('Özel domain kaydedildi. DNS doğrulaması tamamlandığında aktif olur.');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSavingCustom(false);
    }
  };

  const removeCustom = async () => {
    if (!enterprise || !settings?.customDomain) return;
    if (!window.confirm('Özel domain kaydını kaldırmak istediğinize emin misiniz?')) return;

    setSavingCustom(true);
    try {
      const updated = await saveCustomDomain(null);
      setSettings(updated);
      setCustomDomainInput('');
      await refreshBranding();
      toast.success('Özel domain kaldırıldı.');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSavingCustom(false);
    }
  };

  const suffix = resolveSubdomainSuffix();
  const subdomainPreview = settings?.subdomain
    ? buildSubdomainPreview(settings.subdomain)
    : settings?.storefrontSlug
      ? buildSubdomainPreview(settings.storefrontSlug)
      : 'Henüz tanımlı değil';

  return (
    <div className="w-full space-y-6 pb-10 page-enter">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
          Domain Ayarları
        </h1>
        <p className="text-[13px] text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Mağazanızın vitrin adresini, subdomain bilgisini ve özel domain yapılandırmasını yönetin.
        </p>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {loadError}
          <button type="button" onClick={() => void load()} className="ml-3 font-semibold underline hover:no-underline">
            Tekrar dene
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryMetric
          label="Aktif Domain"
          value={loading ? '…' : settings ? activeDomainLabel(settings) : '—'}
          sub={settings?.customDomain && settings.domainVerified ? 'Özel domain aktif' : 'Vitrin slug/subdomain'}
        />
        <SummaryMetric
          label="Subdomain Durumu"
          value={loading ? '…' : settings ? subdomainStatusLabel(settings) : '—'}
          sub={settings?.subdomain ? subdomainPreview : 'Panelden değiştirilemez'}
        />
        <SummaryMetric
          label="Custom Domain Durumu"
          value={loading ? '…' : settings ? customDomainSupportLabel(plan, settings) : '—'}
          sub={loading ? undefined : verificationStatusLabel(verificationStatus)}
        />
        <SummaryMetric
          label="Plan Yetkisi"
          value={loading ? '…' : planLabel(plan)}
          sub={enterprise ? 'Özel domain desteklenir' : 'Özel domain için yükseltme gerekir'}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : settings ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2 space-y-6">
            {/* Subdomain — read-only; no tenant save endpoint */}
            <Panel
              title="Subdomain Ayarı"
              desc="Mağaza oluşturulurken atanan subdomain bilgisi"
            >
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[12px] text-slate-600">
                  Subdomain değişikliği şu an panelden desteklenmiyor. Vitrin erişimi slug/subdomain
                  tanımlayıcısı ile sağlanır.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Subdomain" hint="Kayıt sırasında atanır">
                    <input
                      className={`${inputCls} bg-slate-50 text-slate-600`}
                      value={settings.subdomain ?? ''}
                      readOnly
                      placeholder="Henüz tanımlı değil"
                    />
                  </Field>
                  <Field label="Vitrin tanımlayıcı (slug)" hint="Checkout ve vitrin linklerinde kullanılır">
                    <input
                      className={`${inputCls} bg-slate-50 text-slate-600`}
                      value={settings.storefrontSlug ?? ''}
                      readOnly
                      placeholder="Henüz tanımlı değil"
                    />
                  </Field>
                </div>

                <Field label="Subdomain önizleme" hint={`Yerel ortamda ${suffix} kullanılır`}>
                  <input
                    className={`${inputCls} bg-slate-50 font-mono text-slate-700`}
                    value={subdomainPreview}
                    readOnly
                  />
                </Field>
              </div>
            </Panel>

            {/* Custom domain */}
            <Panel
              title="Custom Domain Ayarı"
              desc="Kendi alan adınızla vitrin (Enterprise)"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    <Crown className="w-3 h-3" />
                    Enterprise
                  </span>
                  {!enterprise && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                      Planlandı — plan yükseltme gerekir
                    </span>
                  )}
                  {settings.customDomain && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${verificationBadgeClass(verificationStatus)}`}>
                      {verificationStatusLabel(verificationStatus)}
                    </span>
                  )}
                </div>

                {!enterprise ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                    <div className="flex gap-3">
                      <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[13px] font-medium text-slate-800">
                          Custom domain yönetimi Enterprise plan gerektirir
                        </p>
                        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                          Özel alan adı ekleme ve DNS doğrulama sonraki fazda tüm Enterprise
                          mağazalar için aktif edilecektir. Şimdilik vitrin slug linkinizi kullanın.
                        </p>
                        <Link
                          to="/dashboard/billing"
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 mt-2"
                        >
                          Planı yükselt
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[12px] text-slate-500 leading-relaxed">
                      Domain kaydedildikten sonra DNS doğrulaması tamamlanana kadar vitrin slug
                      linki kullanılmaya devam eder. Otomatik doğrulama kontrolü sonraki fazda
                      eklenecektir.
                    </p>

                    <Field
                      label="Özel domain"
                      hint={customDomainError ?? 'Örn. shop.firmaniz.com'}
                    >
                      <input
                        className={`${inputCls} font-mono ${customDomainError ? 'border-orange-300' : ''}`}
                        value={customDomainInput}
                        onChange={e => setCustomDomainInput(e.target.value.toLowerCase())}
                        placeholder="shop.firmaniz.com"
                        disabled={savingCustom}
                      />
                    </Field>

                    {settings.customDomain && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-medium text-slate-800 font-mono">
                            {settings.customDomain}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {settings.domainVerified
                              ? 'Domain doğrulandı ve vitrinde kullanılabilir.'
                              : 'DNS doğrulaması bekleniyor.'}
                          </p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${verificationBadgeClass(verificationStatus)}`}>
                          {verificationStatusLabel(verificationStatus)}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <SaveButton
                        saving={savingCustom}
                        onClick={() => void saveCustom()}
                        disabled={Boolean(customDomainError) || !customDomainInput.trim()}
                        label={settings.customDomain ? 'Güncelle' : 'Kaydet'}
                      />
                      {settings.customDomain && (
                        <button
                          type="button"
                          onClick={() => void removeCustom()}
                          disabled={savingCustom}
                          className="px-4 py-2 text-[13px] font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-100 disabled:opacity-50"
                        >
                          Kaldır
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <DomainPreviewPanel settings={settings} />
            <SetupChecklistPanel settings={settings} plan={plan} />
            <DnsGuidePanel hasCustomDomain={Boolean(settings.customDomain)} />
            <InfoPanel />
          </div>
        </div>
      ) : null}
    </div>
  );
}
