import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  ExternalLink,
  CreditCard,
  Truck,
  Globe,
  Settings,
  Receipt,
  Loader2,
  Upload,
} from 'lucide-react';
import { api, extractErrorMessage } from '../services/apiClient';
import { uploadStoreFavicon, uploadStoreLogo } from '../services/storeMediaUpload.service';
import { useBranding } from '../context/BrandingContext';
import { resolveStoreNameFromSettings } from '../utils/displayStoreName';
import { buildStorefrontListUrl } from '../utils/storefrontUrl';
import {
  type StoreInfoForm,
  buildChecklist,
  brandImagesStatusLabel,
  contactCompletionLabel,
  panelDisplayName,
  resolveStorefrontDisplay,
  resolveStorefrontHref,
  safePreviewText,
  storeInitial,
  storeStatusLabel,
  storefrontDisplayName,
} from './storeSettingsPageHelpers';

const EMPTY_FORM: StoreInfoForm = {
  storeName:      '',
  contactEmail:   '',
  contactPhone:   '',
  contactAddress: '',
  logoUrl:        '',
  description:    '',
};

function mapSettingsToForm(data: Record<string, unknown>): StoreInfoForm {
  return {
    storeName:      resolveStoreNameFromSettings(data),
    contactEmail:   String(data.contactEmail ?? ''),
    contactPhone:   String(data.contactPhone ?? ''),
    contactAddress: String(data.contactAddress ?? ''),
    logoUrl:        String(data.tenantLogoUrl ?? data.logoUrl ?? ''),
    description:    String(data.description ?? ''),
  };
}

function resolveFaviconFromSettings(data: Record<string, unknown>): string {
  const v = data.faviconUrl;
  return typeof v === 'string' ? v : '';
}

const inputCls =
  'w-full bg-white border border-slate-200 text-slate-900 text-[13px] px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300';

function SummaryMetric({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <div className="wn-card px-4 py-3 min-w-[120px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-[15px] font-semibold mt-1 leading-snug ${valueClassName ?? 'text-slate-900'}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5 truncate" title={sub}>{sub}</p>}
    </div>
  );
}

function Panel({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
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

const QUICK_LINKS = [
  {
    to:      '/dashboard/settings/payments',
    title:   'Ödeme Ayarları',
    desc:    'PayTR, havale, kapıda ödeme',
    icon:    CreditCard,
    enabled: true,
  },
  {
    to:      '/dashboard/settings/shipping',
    title:   'Kargo Ayarları',
    desc:    'Kargo firmaları ve ücretler',
    icon:    Truck,
    enabled: true,
  },
  {
    to:      '/dashboard/domain',
    title:   'Domain',
    desc:    'Özel alan adı yapılandırması',
    icon:    Globe,
    enabled: true,
  },
  {
    to:      '/dashboard/settings',
    title:   'Genel Ayarlar',
    desc:    'Marka, renkler ve dil',
    icon:    Settings,
    enabled: true,
  },
  {
    to:      '',
    title:   'Vergi Ayarları',
    desc:    'KDV ve fatura profili',
    icon:    Receipt,
    enabled: false,
  },
] as const;

const StoreSettings: React.FC = () => {
  const { branding, refresh, applyBranding } = useBranding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [form, setForm] = useState<StoreInfoForm>(EMPTY_FORM);
  const [faviconUrl, setFaviconUrl] = useState(() => branding.faviconUrl ?? '');
  const [logoError, setLogoError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const brandingMeta = useMemo(() => ({
    storefrontSlug: branding.storefrontSlug ?? branding.slug,
    customDomain:   branding.customDomain,
    domainVerified: branding.domainVerified,
  }), [branding]);

  const loadStoreInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      const data = (res.data as { data?: Record<string, unknown> }).data ?? {};
      setForm(mapSettingsToForm(data));
      const fromApi = resolveFaviconFromSettings(data);
      if (fromApi) setFaviconUrl(fromApi);
      setLogoError(false);
      setFaviconError(false);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Mağaza bilgileri yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadStoreInfo(); }, [loadStoreInfo]);

  const patch = (key: keyof StoreInfoForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'logoUrl') setLogoError(false);
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const url = await uploadStoreLogo(file);
      patch('logoUrl', url);
      applyBranding({ logoUrl: url });
      toast.success('Logo yüklendi.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Logo yüklenemedi.');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleFaviconUpload = async (file: File) => {
    setUploadingFavicon(true);
    try {
      const url = await uploadStoreFavicon(file);
      setFaviconUrl(url);
      setFaviconError(false);
      applyBranding({ faviconUrl: url });
      toast.success('Favicon yüklendi.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Favicon yüklenemedi.');
    } finally {
      setUploadingFavicon(false);
      if (faviconInputRef.current) faviconInputRef.current.value = '';
    }
  };

  const onLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleLogoUpload(f);
  };

  const onFaviconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFaviconUpload(f);
  };

  const makeDrop = (handler: (file: File) => void) => ({
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) void handler(f);
    },
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeName.trim()) {
      toast.error('Mağaza adı zorunludur.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/settings/store-info', form, { skipErrorToast: true });
      const saved = (res.data as { data?: Record<string, unknown> }).data ?? {};
      const nextName = resolveStoreNameFromSettings(saved) || form.storeName.trim();
      applyBranding({
        siteName: nextName,
        logoUrl:  typeof saved.logoUrl === 'string' ? saved.logoUrl : form.logoUrl.trim() || null,
      });
      await refresh();
      setForm(mapSettingsToForm({ ...saved, storeName: nextName, siteName: nextName }));
      toast.success('Mağaza bilgileri kaydedildi.');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  };

  const status = useMemo(() => storeStatusLabel(form), [form]);
  const checklist = useMemo(() => buildChecklist(form, faviconUrl), [form, faviconUrl]);
  const storefrontHref = resolveStorefrontHref(brandingMeta);
  const storefrontLabel = resolveStorefrontDisplay(brandingMeta);
  const showLogo = form.logoUrl.trim() && !logoError;
  const showFavicon = faviconUrl.trim() && !faviconError;

  return (
    <div className="w-full space-y-6 pb-10 page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Mağaza Ayarları
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Mağazanızın temel bilgilerini, vitrin görünümünü ve iletişim ayarlarını yönetin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {storefrontHref ? (
            <a
              href={storefrontHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-[13px] inline-flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Vitrini Görüntüle
            </a>
          ) : (
            <button
              type="button"
              disabled
              title="Vitrin bağlantısı henüz oluşturulmamış"
              className="btn btn-secondary text-[13px] opacity-50 cursor-not-allowed inline-flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Vitrini Görüntüle
            </button>
          )}
          <button
            type="submit"
            form="store-settings-form"
            disabled={saving || loading}
            className="btn btn-primary text-[13px] inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryMetric
          label="Mağaza Durumu"
          value={loading ? '…' : status.value}
          sub={status.hint}
          valueClassName={status.value === 'Eksik Bilgi' ? 'text-amber-700' : 'text-emerald-700'}
        />
        <SummaryMetric
          label="Vitrin URL"
          value={loading ? '…' : (storefrontLabel.length > 28 ? `${storefrontLabel.slice(0, 26)}…` : storefrontLabel)}
          sub={storefrontHref ? 'Bağlantı hazır' : 'Vitrin bağlantısı oluşturulmamış'}
        />
        <SummaryMetric
          label="Marka Görselleri"
          value={loading ? '…' : brandImagesStatusLabel(form.logoUrl, faviconUrl)}
          sub={loading ? undefined : (!form.logoUrl.trim() || !faviconUrl.trim() ? 'Logo ve favicon vitrin kimliği için önerilir' : 'Logo ve favicon hazır')}
        />
        <SummaryMetric
          label="İletişim Bilgileri"
          value={loading ? '…' : contactCompletionLabel(form)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <form id="store-settings-form" onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

          {/* Left column */}
          <div className="xl:col-span-2 space-y-6">

            <Panel title="Mağaza kimliği" desc="Panel ve vitrinde görünen mağaza adı">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                  Mağaza adı *
                </label>
                <input
                  type="text"
                  required
                  value={form.storeName}
                  onChange={e => patch('storeName', e.target.value)}
                  placeholder="Örn: Teknoloji Mağazam"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Panelde görünen ad</p>
                  <p className="text-[13px] font-medium text-slate-800 mt-1">{panelDisplayName(form.storeName)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Vitrinde görünen ad</p>
                  <p className="text-[13px] font-medium text-slate-800 mt-1">{storefrontDisplayName(form.storeName)}</p>
                </div>
              </div>
              {brandingMeta.storefrontSlug && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-3 py-2.5">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Vitrin yolu</p>
                  <code className="text-[12px] font-mono text-indigo-700 mt-1 block">
                    {buildStorefrontListUrl(brandingMeta.storefrontSlug)}
                  </code>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                  Kısa açıklama
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => patch('description', e.target.value)}
                  placeholder="Mağazanızı kısaca tanıtın"
                  className={`${inputCls} resize-y`}
                />
              </div>
            </Panel>

            <Panel title="İletişim bilgileri" desc="Müşterilerin size ulaşacağı kanallar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">E-posta</label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={e => patch('contactEmail', e.target.value)}
                    placeholder="info@magaza.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Telefon</label>
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={e => patch('contactPhone', e.target.value)}
                    placeholder="+90 555 000 00 00"
                    className={inputCls}
                  />
                </div>
              </div>
            </Panel>

            <Panel title="Adres bilgileri" desc="Fatura ve iletişim için kullanılabilir">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Adres</label>
                <textarea
                  rows={3}
                  value={form.contactAddress}
                  onChange={e => patch('contactAddress', e.target.value)}
                  placeholder="Mahalle, ilçe, il — açık adresinizi yazın"
                  className={`${inputCls} resize-y`}
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  İl, ilçe ve posta kodu bilgilerini tek alanda girebilirsiniz.
                </p>
              </div>
            </Panel>

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn btn-primary text-[13px]">
                {saving ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">

            <Panel title="Logo / marka önizleme" desc="Bilgisayarınızdan yükleyin veya manuel URL girin">
              {/* Logo */}
              <div className="space-y-3">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Logo</p>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {showLogo ? (
                      <img
                        src={form.logoUrl.trim()}
                        alt=""
                        className="w-full h-full object-contain p-1"
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      <span className="text-xl font-bold text-indigo-600">
                        {storeInitial(form.storeName)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">
                      {storefrontDisplayName(form.storeName)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {form.logoUrl.trim() ? 'Logo tanımlı' : 'Logo eklenmemiş'}
                    </p>
                  </div>
                </div>

                <div
                  {...makeDrop(handleLogoUpload)}
                  className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-4 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition"
                >
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={onLogoFileChange}
                  />
                  {uploadingLogo ? (
                    <div className="flex items-center justify-center gap-2 text-indigo-600 text-[13px]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Logo yükleniyor…
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="btn btn-secondary text-[12px] inline-flex items-center gap-2"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Logo Yükle
                      </button>
                      <p className="text-[11px] text-slate-400 mt-2">
                        PNG, JPG, WEBP, SVG — önerilen 512×512 veya yatay logo 600×200 — maks. 2 MB
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Dosyayı sürükleyip bırakabilirsiniz</p>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                    Manuel logo URL
                  </label>
                  <input
                    type="url"
                    value={form.logoUrl}
                    onChange={e => patch('logoUrl', e.target.value)}
                    placeholder="https://..."
                    className={`${inputCls} font-mono text-[12px]`}
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    URL girildiğinde vitrinde kullanılır. Kaydet ile birlikte saklanır.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Favicon</p>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {showFavicon ? (
                      <img
                        src={faviconUrl.trim()}
                        alt=""
                        className="w-8 h-8 object-contain"
                        onError={() => setFaviconError(true)}
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 text-center leading-tight px-1">Yok</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-slate-800">Site simgesi</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {faviconUrl.trim() ? 'Favicon tanımlı' : 'Favicon eklenmemiş'}
                    </p>
                  </div>
                </div>

                <div
                  {...makeDrop(handleFaviconUpload)}
                  className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-3 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition"
                >
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept=".ico,.png,.svg,image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
                    className="hidden"
                    onChange={onFaviconFileChange}
                  />
                  {uploadingFavicon ? (
                    <div className="flex items-center justify-center gap-2 text-indigo-600 text-[13px]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Favicon yükleniyor…
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => faviconInputRef.current?.click()}
                        className="btn btn-secondary text-[12px] inline-flex items-center gap-2"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Favicon Yükle
                      </button>
                      <p className="text-[11px] text-slate-400 mt-2">
                        ICO, PNG, SVG — önerilen 32×32 veya 48×48 — maks. 1 MB
                      </p>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Favicon yüklendiğinde otomatik kaydedilir; tarayıcı sekmesinde görünür.
                </p>
              </div>
            </Panel>

            <Panel title="Vitrin önizleme" desc="Kaydedilmemiş değişiklikler canlı yansır">
              {/* Browser tab simulation */}
              <div className="rounded-t-xl border border-b-0 border-slate-200 bg-slate-100 px-3 py-2 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-1.5 bg-white rounded-md px-2 py-1 border border-slate-200">
                  {showFavicon ? (
                    <img src={faviconUrl.trim()} alt="" className="w-3.5 h-3.5 object-contain shrink-0" onError={() => setFaviconError(true)} />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded bg-indigo-100 text-[8px] font-bold text-indigo-600 flex items-center justify-center shrink-0">
                      {storeInitial(form.storeName).charAt(0)}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-600 truncate">
                    {storefrontDisplayName(form.storeName)}
                  </span>
                </div>
              </div>
              <div className="rounded-b-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold overflow-hidden">
                    {showLogo ? (
                      <img src={form.logoUrl.trim()} alt="" className="w-full h-full object-contain" onError={() => setLogoError(true)} />
                    ) : (
                      storeInitial(form.storeName)
                    )}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-slate-900">{storefrontDisplayName(form.storeName)}</p>
                    <p className="text-[11px] text-slate-500">Vitrin başlığı</p>
                  </div>
                </div>
                <p className="text-[12px] text-slate-600 leading-relaxed">
                  {safePreviewText(form.description, 'Kısa açıklama henüz tanımlı değil.')}
                </p>
                <div className="space-y-1 text-[12px] text-slate-500">
                  <p>{safePreviewText(form.contactEmail, 'E-posta henüz tanımlı değil')}</p>
                  <p>{safePreviewText(form.contactPhone, 'Telefon henüz tanımlı değil')}</p>
                </div>
                {storefrontHref ? (
                  <a href={storefrontHref} target="_blank" rel="noopener noreferrer" className="text-[12px] text-indigo-600 hover:underline inline-flex items-center gap-1">
                    {storefrontLabel}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className="text-[12px] text-slate-400">Vitrin bağlantısı oluşturulmamış</p>
                )}
              </div>
            </Panel>

            <Panel title="Eksik bilgi kontrolü">
              <ul className="space-y-2">
                {checklist.map(item => (
                  <li key={item.key} className="flex items-center gap-2.5 text-[13px]">
                    <CheckCircle className={`w-4 h-4 shrink-0 ${item.done ? 'text-emerald-500' : 'text-slate-300'}`} />
                    <span className={item.done ? 'text-slate-700' : 'text-slate-500'}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Hızlı ayarlar" desc="Diğer mağaza yapılandırma sayfaları">
              <div className="space-y-2">
                {QUICK_LINKS.map(link => {
                  const Icon = link.icon;
                  if (!link.enabled) {
                    return (
                      <div
                        key={link.title}
                        className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 opacity-80"
                      >
                        <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-medium text-slate-600">{link.title}</p>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">Sonraki faz</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{link.desc}</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition"
                    >
                      <Icon className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-slate-800">{link.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{link.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Panel>
          </div>
        </form>
      )}
    </div>
  );
};

export default StoreSettings;
