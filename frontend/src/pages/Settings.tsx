import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/apiClient';
import { useBranding } from '../context/BrandingContext';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsForm {
  siteName:      string;
  primaryColor:  string;
  secondaryColor: string;
  accentColor:   string;
  fontFamily:    string;
  borderRadius:  string;
  customCss:     string;
  currency:      string;
  language:      string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins',
  'Nunito', 'Raleway', 'Montserrat', 'Source Sans Pro', 'Ubuntu',
];

const RADIUS_OPTIONS = [
  { label: 'Yok',    value: '0rem'   },
  { label: 'Az',     value: '0.25rem'},
  { label: 'Normal', value: '0.5rem' },
  { label: 'Fazla',  value: '0.75rem'},
  { label: 'Yuvarlak', value: '1rem' },
  { label: 'Tam',    value: '9999px' },
];

const PRESET_PALETTES = [
  { name: 'Mavi',     primary: '#3B82F6', secondary: '#10B981', accent: '#F59E0B' },
  { name: 'Mor',      primary: '#8B5CF6', secondary: '#EC4899', accent: '#06B6D4' },
  { name: 'Yeşil',    primary: '#10B981', secondary: '#3B82F6', accent: '#F59E0B' },
  { name: 'Turuncu',  primary: '#F59E0B', secondary: '#EF4444', accent: '#8B5CF6' },
  { name: 'Pembe',    primary: '#EC4899', secondary: '#8B5CF6', accent: '#10B981' },
  { name: 'Koyu',     primary: '#1E293B', secondary: '#64748B', accent: '#F59E0B' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Settings() {
  const { branding, refresh, applyBranding } = useBranding();

  const [form, setForm] = useState<SettingsForm>({
    siteName:      branding.siteName,
    primaryColor:  branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    accentColor:   branding.accentColor,
    fontFamily:    branding.fontFamily,
    borderRadius:  branding.borderRadius,
    customCss:     branding.customCss ?? '',
    currency:      branding.currency,
    language:      branding.language,
  });

  const [logoUrl,    setLogoUrl]    = useState<string | null>(branding.logoUrl);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(branding.faviconUrl);
  const [domain,     setDomain]     = useState(branding.customDomain ?? '');
  const [domainVerified, setDomainVerified] = useState(branding.domainVerified);

  const [saving,         setSaving]         = useState(false);
  const [uploadingLogo,   setUploadingLogo]   = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [savingDomain,   setSavingDomain]   = useState(false);
  const [activeTab, setActiveTab] = useState<'brand' | 'colors' | 'domain' | 'advanced'>('brand');

  const logoInputRef    = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Sync form when branding loaded
  useEffect(() => {
    setForm({
      siteName:      branding.siteName,
      primaryColor:  branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      accentColor:   branding.accentColor,
      fontFamily:    branding.fontFamily,
      borderRadius:  branding.borderRadius,
      customCss:     branding.customCss ?? '',
      currency:      branding.currency,
      language:      branding.language,
    });
    setLogoUrl(branding.logoUrl);
    setFaviconUrl(branding.faviconUrl);
    setDomain(branding.customDomain ?? '');
    setDomainVerified(branding.domainVerified);
  }, [branding]);

  // Live preview: inject CSS vars while editing
  const preview = useCallback((patch: Partial<SettingsForm>) => {
    applyBranding({ ...patch } as any);
  }, [applyBranding]);

  // ── Save general settings ────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', form);
      await refresh();
      toast.success('Ayarlar kaydedildi.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  // ── Logo upload ──────────────────────────────────────────────────────────
  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = (res.data as any).url;
      setLogoUrl(url);
      applyBranding({ logoUrl: url });
      toast.success('Logo yüklendi.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Logo yüklenemedi.');
    } finally {
      setUploadingLogo(false);
    }
  };

  // ── Favicon upload ───────────────────────────────────────────────────────
  const handleFaviconUpload = async (file: File) => {
    setUploadingFavicon(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/settings/favicon', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = (res.data as any).url;
      setFaviconUrl(url);
      applyBranding({ faviconUrl: url });
      toast.success('Favicon yüklendi.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Favicon yüklenemedi.');
    } finally {
      setUploadingFavicon(false);
    }
  };

  // ── Domain save ──────────────────────────────────────────────────────────
  const handleDomainSave = async () => {
    setSavingDomain(true);
    try {
      await api.put('/settings/domain', { domain: domain.trim() || null });
      setDomainVerified(false);
      await refresh();
      toast.success('Domain kaydedildi. DNS ayarlarını yapılandırın.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Domain kaydedilemedi.');
    } finally {
      setSavingDomain(false);
    }
  };

  // ── Drag & Drop helpers ──────────────────────────────────────────────────
  function makeDrop(handler: (f: File) => void) {
    return {
      onDragOver:  (e: React.DragEvent) => e.preventDefault(),
      onDrop:      (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handler(f); },
    };
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mağaza Ayarları</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Logo, renkler, domain ve diğer görünüm ayarları
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit overflow-x-auto">
        {([
          { key: 'brand',    label: '🖼 Marka'   },
          { key: 'colors',   label: '🎨 Renkler' },
          { key: 'domain',   label: '🌐 Domain'  },
          { key: 'advanced', label: '⚙ Gelişmiş' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              activeTab === t.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BRAND TAB ───────────────────────────────────────────────────────── */}
      {activeTab === 'brand' && (
        <div className="space-y-6">
          {/* Site name */}
          <Card title="Mağaza Adı">
            <input
              value={form.siteName}
              onChange={e => setForm(f => ({ ...f, siteName: e.target.value }))}
              onBlur={() => preview({ siteName: form.siteName })}
              placeholder="Mağaza adınız"
              className={inputCls}
            />
          </Card>

          {/* Logo */}
          <Card title="Logo">
            <div className="flex items-start gap-6">
              {/* Preview */}
              <div className="flex-shrink-0 w-28 h-28 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-3xl">🖼</span>
                )}
              </div>

              {/* Drop zone */}
              <div
                {...makeDrop(handleLogoUpload)}
                onClick={() => logoInputRef.current?.click()}
                className="flex-1 cursor-pointer border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition"
              >
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
                {uploadingLogo ? (
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Yükleniyor...
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Logo sürükleyin veya tıklayın
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG — maks 5 MB</p>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Favicon */}
          <Card title="Favicon">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="Favicon" className="w-10 h-10 object-contain" />
                ) : (
                  <span className="text-2xl">🔖</span>
                )}
              </div>

              <div
                {...makeDrop(handleFaviconUpload)}
                onClick={() => faviconInputRef.current?.click()}
                className="flex-1 cursor-pointer border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-5 text-center hover:border-blue-400 dark:hover:border-blue-500 transition"
              >
                <input ref={faviconInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFaviconUpload(f); }} />
                {uploadingFavicon ? (
                  <div className="flex items-center justify-center gap-2 text-blue-600 text-sm">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Yükleniyor...
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Favicon sürükleyin</p>
                    <p className="text-xs text-gray-400 mt-1">32×32 veya 64×64 PNG önerilir</p>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Font + Radius */}
          <Card title="Yazı Tipi ve Köşeler">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Yazı Tipi</label>
                <select
                  value={form.fontFamily}
                  onChange={e => { setForm(f => ({ ...f, fontFamily: e.target.value })); preview({ fontFamily: e.target.value }); }}
                  className={inputCls}
                >
                  {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Köşe Yuvarlama</label>
                <div className="flex flex-wrap gap-2">
                  {RADIUS_OPTIONS.map(r => (
                    <button
                      key={r.value}
                      onClick={() => { setForm(f => ({ ...f, borderRadius: r.value })); preview({ borderRadius: r.value }); }}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                        form.borderRadius === r.value
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400'
                      }`}
                      style={{ borderRadius: r.value === '9999px' ? '9999px' : r.value }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <SaveButton saving={saving} onClick={handleSave} />
        </div>
      )}

      {/* ── COLORS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'colors' && (
        <div className="space-y-6">
          {/* Presets */}
          <Card title="Hazır Paletler">
            <div className="flex flex-wrap gap-3">
              {PRESET_PALETTES.map(p => (
                <button
                  key={p.name}
                  onClick={() => {
                    const patch = { primaryColor: p.primary, secondaryColor: p.secondary, accentColor: p.accent };
                    setForm(f => ({ ...f, ...patch }));
                    preview(patch);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-400 transition group"
                >
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: p.primary }} />
                    <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: p.secondary }} />
                    <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: p.accent }} />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">{p.name}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Custom pickers */}
          <Card title="Özel Renkler">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {([
                { key: 'primaryColor',   label: 'Ana Renk',      desc: 'Butonlar, linkler'        },
                { key: 'secondaryColor', label: 'İkincil Renk',  desc: 'Vurgular, rozetler'       },
                { key: 'accentColor',    label: 'Vurgu Rengi',   desc: 'Uyarılar, özel öğeler'   },
              ] as { key: keyof SettingsForm; label: string; desc: string }[]).map(c => (
                <div key={c.key}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                    {c.label}
                    <span className="ml-1 text-gray-400">— {c.desc}</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="color"
                        value={form[c.key] as string}
                        onChange={e => {
                          setForm(f => ({ ...f, [c.key]: e.target.value }));
                          preview({ [c.key]: e.target.value } as any);
                        }}
                        className="w-12 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer bg-transparent"
                      />
                    </label>
                    <input
                      type="text"
                      value={form[c.key] as string}
                      onChange={e => {
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                          setForm(f => ({ ...f, [c.key]: e.target.value }));
                          if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) preview({ [c.key]: e.target.value } as any);
                        }
                      }}
                      className={`${inputCls} font-mono`}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Live preview mini */}
          <Card title="Önizleme">
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full" style={{ background: form.primaryColor }} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {form.siteName || 'Mağaza Adı'}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                  style={{ background: form.primaryColor, borderRadius: form.borderRadius }}
                >
                  Ana Buton
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                  style={{ background: form.secondaryColor, borderRadius: form.borderRadius }}
                >
                  İkincil
                </button>
                <span
                  className="px-3 py-1.5 text-xs font-semibold text-white rounded-full"
                  style={{ background: form.accentColor }}
                >
                  Rozet
                </span>
              </div>
            </div>
          </Card>

          <SaveButton saving={saving} onClick={handleSave} />
        </div>
      )}

      {/* ── DOMAIN TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'domain' && (
        <div className="space-y-6">
          <Card title="Özel Domain">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Domain Adresi</label>
                <div className="flex gap-3">
                  <input
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    placeholder="shop.firmaniz.com"
                    className={`${inputCls} flex-1 font-mono`}
                  />
                  <button
                    onClick={handleDomainSave}
                    disabled={savingDomain}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition"
                  >
                    {savingDomain ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </div>

              {/* Domain status */}
              {branding.customDomain && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
                  domainVerified
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                }`}>
                  <span className="text-lg">{domainVerified ? '✅' : '⏳'}</span>
                  <div>
                    <p className="font-medium">{branding.customDomain}</p>
                    <p className="text-xs opacity-75">
                      {domainVerified ? 'Domain doğrulandı ve aktif.' : 'DNS doğrulanıyor...'}
                    </p>
                  </div>
                </div>
              )}

              {/* DNS instructions */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">DNS Yapılandırması</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Domain sağlayıcınızda aşağıdaki DNS kaydını ekleyin:
                </p>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden text-xs font-mono">
                  <div className="grid grid-cols-3 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-gray-500 dark:text-gray-400 font-semibold">
                    <span>Tip</span><span>İsim</span><span>Değer</span>
                  </div>
                  <div className="grid grid-cols-3 px-3 py-2.5 text-gray-700 dark:text-gray-300">
                    <span className="text-blue-600">CNAME</span>
                    <span>{domain.split('.')[0] || '@'}</span>
                    <span className="truncate">stores.woontegra.com</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── ADVANCED TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          <Card title="Dil ve Para Birimi">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Dil</label>
                <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className={inputCls}>
                  <option value="tr">🇹🇷 Türkçe</option>
                  <option value="en">🇬🇧 English</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Para Birimi</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={inputCls}>
                  <option value="TRY">₺ TRY — Türk Lirası</option>
                  <option value="USD">$ USD — Amerikan Doları</option>
                  <option value="EUR">€ EUR — Euro</option>
                  <option value="GBP">£ GBP — İngiliz Sterlini</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Özel CSS">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Gelişmiş: Tüm sayfaya uygulanacak özel CSS kodu yazın.
            </p>
            <textarea
              value={form.customCss}
              onChange={e => setForm(f => ({ ...f, customCss: e.target.value }))}
              onBlur={() => preview({ customCss: form.customCss })}
              rows={10}
              placeholder={`.my-store { font-weight: 500; }\n/* Dikkatli kullanın */`}
              className={`${inputCls} font-mono text-xs resize-y`}
            />
          </Card>

          <SaveButton saving={saving} onClick={handleSave} />
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const inputCls = 'w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      {children}
    </div>
  );
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
    >
      {saving
        ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Kaydediliyor...</>
        : '💾 Kaydet'}
    </button>
  );
}
