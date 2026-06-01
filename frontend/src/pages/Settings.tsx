import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ExternalLink, Globe, Image, Loader2, Palette, Type } from 'lucide-react';
import { api } from '../services/apiClient';
import { useBranding } from '../context/BrandingContext';
import { storeInitial } from './storeSettingsPageHelpers';
import {
  currencyLabel,
  FONT_OPTIONS,
  languageLabel,
  PLANNED_APPEARANCE_FEATURES,
  PRESET_PALETTES,
  RADIUS_OPTIONS,
  radiusLabel,
  safeStoreName,
  type AppearanceForm,
} from './appearanceSettingsPageHelpers';

type TabKey = 'theme' | 'colors' | 'typography' | 'advanced';

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
      <div className="p-5 space-y-4">{children}</div>
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

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="btn btn-primary text-[13px] inline-flex items-center gap-2"
    >
      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
      {saving ? 'Kaydediliyor…' : 'Kaydet'}
    </button>
  );
}

function StorefrontPreviewPanel({
  form,
  storeName,
  logoUrl,
}: {
  form: AppearanceForm;
  storeName: string;
  logoUrl: string | null;
}) {
  const initial = storeInitial(storeName);
  const showLogo = Boolean(logoUrl?.trim());

  return (
    <Panel title="Vitrin önizleme" desc="Seçilen renk, yazı tipi ve köşe ayarları">
      <div
        className="rounded-xl border border-slate-200 overflow-hidden"
        style={{ fontFamily: `'${form.fontFamily}', system-ui, sans-serif` }}
      >
        <div className="bg-slate-100 px-3 py-2 flex items-center gap-2 border-b border-slate-200">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="w-2 h-2 rounded-full bg-slate-300" />
          </div>
          <div className="flex-1 min-w-0 bg-white rounded-md px-2 py-1 border border-slate-200 text-[11px] text-slate-600 truncate">
            {storeName}
          </div>
        </div>

        <div className="p-4 bg-gradient-to-b from-white to-slate-50 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 flex items-center justify-center overflow-hidden text-sm font-bold"
              style={{ background: `${form.primaryColor}20`, color: form.primaryColor, borderRadius: form.borderRadius }}
            >
              {showLogo ? (
                <img src={logoUrl!} alt="" className="w-full h-full object-contain p-0.5" />
              ) : (
                initial
              )}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-900">{storeName}</p>
              <p className="text-[11px] text-slate-500">Vitrin başlığı</p>
            </div>
          </div>

          <div
            className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
            style={{ borderRadius: form.borderRadius }}
          >
            <div className="h-20 rounded-md bg-slate-100" style={{ borderRadius: form.borderRadius }} />
            <p className="text-[13px] font-medium text-slate-800">Örnek Ürün</p>
            <p className="text-[12px] font-semibold" style={{ color: form.primaryColor }}>
              ₺299,00
            </p>
            <button
              type="button"
              className="w-full py-2 text-[12px] font-semibold text-white"
              style={{ background: form.primaryColor, borderRadius: form.borderRadius }}
            >
              Sepete Ekle
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-3 py-1.5 text-[11px] font-medium text-white"
              style={{ background: form.primaryColor, borderRadius: form.borderRadius }}
            >
              Ana buton
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-[11px] font-medium text-white"
              style={{ background: form.secondaryColor, borderRadius: form.borderRadius }}
            >
              İkincil
            </button>
            <span
              className="px-2 py-1 text-[10px] font-semibold text-white rounded-full"
              style={{ background: form.accentColor }}
            >
              Rozet
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function BrandRedirectPanel() {
  return (
    <Panel title="Logo ve favicon" desc="Marka görselleri Mağaza Ayarları’nda yönetilir">
      <div className="flex gap-3">
        <Image className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            Logo ve favicon yüklemesi Mağaza Ayarları sayfasındaki Marka bölümünden yapılır.
            Bu sayfa yalnızca vitrin görsel stil ayarlarını yönetir.
          </p>
          <Link
            to="/dashboard/store-settings"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 mt-2"
          >
            Mağaza Ayarlarına git
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </Panel>
  );
}

function DomainRedirectPanel() {
  return (
    <Panel title="Domain" desc="Subdomain ve özel alan adı ayrı sayfada">
      <div className="flex gap-3">
        <Globe className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            Domain ayarları bu sayfada yönetilmez. Subdomain, özel domain ve DNS bilgileri
            için Domain Ayarları sayfasını kullanın.
          </p>
          <Link
            to="/dashboard/domain"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 mt-2"
          >
            Domain Ayarlarına git
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </Panel>
  );
}

function PlannedFeaturesPanel() {
  return (
    <Panel title="Gelecek faz" desc="Planlanan görünüm özellikleri">
      <div className="flex flex-wrap gap-1.5">
        {PLANNED_APPEARANCE_FEATURES.map(feature => (
          <span
            key={feature}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500"
          >
            {feature} · Planlandı
          </span>
        ))}
      </div>
    </Panel>
  );
}

export default function Settings() {
  const { branding, refresh, applyBranding } = useBranding();
  const [form, setForm] = useState<AppearanceForm>({
    primaryColor:   branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    accentColor:    branding.accentColor,
    fontFamily:     branding.fontFamily,
    borderRadius:   branding.borderRadius,
    customCss:      branding.customCss ?? '',
    currency:       branding.currency,
    language:       branding.language,
  });
  const [activeTab, setActiveTab] = useState<TabKey>('theme');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      primaryColor:   branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      accentColor:    branding.accentColor,
      fontFamily:     branding.fontFamily,
      borderRadius:   branding.borderRadius,
      customCss:      branding.customCss ?? '',
      currency:       branding.currency,
      language:       branding.language,
    });
  }, [branding]);

  const preview = useCallback((patch: Partial<AppearanceForm>) => {
    applyBranding(patch);
  }, [applyBranding]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', {
        ...form,
        siteName: branding.siteName,
      });
      await refresh();
      toast.success('Görünüm ayarları kaydedildi.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kaydedilemedi.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const storeName = safeStoreName(branding.siteName);
  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'theme',      label: 'Tema',       icon: Palette },
    { key: 'colors',     label: 'Renkler',    icon: Palette },
    { key: 'typography', label: 'Tipografi',  icon: Type },
    { key: 'advanced',   label: 'Gelişmiş',   icon: Globe },
  ];

  return (
    <div className="w-full space-y-6 pb-10 page-enter">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
          Görünüm Ayarları
        </h1>
        <p className="text-[13px] text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Vitrininizin logo, favicon, renk, yazı tipi ve görsel stil ayarlarını yönetin.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryMetric label="Ana Renk" value={form.primaryColor} sub="Butonlar ve vurgular" />
        <SummaryMetric label="Yazı Tipi" value={form.fontFamily} sub="Vitrin font ailesi" />
        <SummaryMetric label="Dil" value={languageLabel(form.language)} sub="Mağaza dili" />
        <SummaryMetric label="Köşe" value={radiusLabel(form.borderRadius)} sub="Kart ve buton yuvarlaklığı" />
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition inline-flex items-center gap-1.5 ${
                activeTab === t.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          {activeTab === 'theme' && (
            <Panel title="Hazır tema paletleri" desc="Tek tıkla renk kombinasyonu uygulayın">
              <div className="flex flex-wrap gap-3">
                {PRESET_PALETTES.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      const patch = {
                        primaryColor: p.primary,
                        secondaryColor: p.secondary,
                        accentColor: p.accent,
                      };
                      setForm(f => ({ ...f, ...patch }));
                      preview(patch);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition"
                  >
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: p.primary }} />
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: p.secondary }} />
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: p.accent }} />
                    </div>
                    <span className="text-[13px] text-slate-700">{p.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <SaveButton saving={saving} onClick={() => void handleSave()} />
              </div>
            </Panel>
          )}

          {activeTab === 'colors' && (
            <Panel title="Renk ayarları" desc="Ana, ikincil ve vurgu renkleri">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {([
                  { key: 'primaryColor' as const,   label: 'Ana renk',     desc: 'Butonlar, linkler' },
                  { key: 'secondaryColor' as const, label: 'İkincil renk', desc: 'Vurgular' },
                  { key: 'accentColor' as const,    label: 'Vurgu rengi',  desc: 'Rozetler' },
                ]).map(c => (
                  <Field key={c.key} label={c.label} hint={c.desc}>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer shrink-0">
                        <input
                          type="color"
                          value={form[c.key]}
                          onChange={e => {
                            setForm(f => ({ ...f, [c.key]: e.target.value }));
                            preview({ [c.key]: e.target.value });
                          }}
                          className="w-11 h-10 rounded-lg border border-slate-200 cursor-pointer bg-transparent"
                        />
                      </label>
                      <input
                        type="text"
                        value={form[c.key]}
                        onChange={e => {
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                            setForm(f => ({ ...f, [c.key]: e.target.value }));
                            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                              preview({ [c.key]: e.target.value });
                            }
                          }
                        }}
                        className={`${inputCls} font-mono`}
                        placeholder="#3B82F6"
                      />
                    </div>
                  </Field>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <SaveButton saving={saving} onClick={() => void handleSave()} />
              </div>
            </Panel>
          )}

          {activeTab === 'typography' && (
            <Panel title="Tipografi ve köşeler" desc="Yazı tipi ve border radius">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Field label="Yazı tipi">
                  <select
                    value={form.fontFamily}
                    onChange={e => {
                      setForm(f => ({ ...f, fontFamily: e.target.value }));
                      preview({ fontFamily: e.target.value });
                    }}
                    className={inputCls}
                  >
                    {FONT_OPTIONS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Köşe yuvarlama">
                  <div className="flex flex-wrap gap-2">
                    {RADIUS_OPTIONS.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, borderRadius: r.value }));
                          preview({ borderRadius: r.value });
                        }}
                        className={`px-3 py-1.5 text-[11px] rounded-lg border transition ${
                          form.borderRadius === r.value
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                        }`}
                        style={{ borderRadius: r.value === '9999px' ? '9999px' : r.value }}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
              <div className="flex justify-end pt-2">
                <SaveButton saving={saving} onClick={() => void handleSave()} />
              </div>
            </Panel>
          )}

          {activeTab === 'advanced' && (
            <>
              <Panel title="Dil ve para birimi" desc="Mağaza vitrin tercihleri">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Dil">
                    <select
                      value={form.language}
                      onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="tr">Türkçe</option>
                      <option value="en">English</option>
                    </select>
                  </Field>
                  <Field label="Para birimi">
                    <select
                      value={form.currency}
                      onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="TRY">₺ TRY — Türk Lirası</option>
                      <option value="USD">$ USD — Amerikan Doları</option>
                      <option value="EUR">€ EUR — Euro</option>
                      <option value="GBP">£ GBP — İngiliz Sterlini</option>
                    </select>
                  </Field>
                </div>
                <p className="text-[11px] text-slate-400">
                  Dil: {languageLabel(form.language)} · Para birimi: {currencyLabel(form.currency)}
                </p>
              </Panel>

              <Panel title="Özel CSS" desc="Gelişmiş vitrin stili — dikkatli kullanın">
                <textarea
                  value={form.customCss}
                  onChange={e => setForm(f => ({ ...f, customCss: e.target.value }))}
                  onBlur={() => preview({ customCss: form.customCss })}
                  rows={8}
                  placeholder={`.my-store { font-weight: 500; }\n/* Dikkatli kullanın */`}
                  className={`${inputCls} font-mono text-[12px] resize-y`}
                />
              </Panel>

              <div className="flex justify-end">
                <SaveButton saving={saving} onClick={() => void handleSave()} />
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <StorefrontPreviewPanel form={form} storeName={storeName} logoUrl={branding.logoUrl} />
          <BrandRedirectPanel />
          <DomainRedirectPanel />
          <PlannedFeaturesPanel />
        </div>
      </div>
    </div>
  );
}
