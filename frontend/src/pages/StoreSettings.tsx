import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, extractErrorMessage } from '../services/apiClient';
import { useBranding } from '../context/BrandingContext';
import { displayStoreName, displayStorefrontName, resolveStoreNameFromSettings } from '../utils/displayStoreName';

type StoreInfoForm = {
  storeName:      string;
  contactEmail:   string;
  contactPhone:   string;
  contactAddress: string;
  logoUrl:        string;
  description:    string;
};

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

const StoreSettings: React.FC = () => {
  const { refresh, applyBranding } = useBranding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StoreInfoForm>(EMPTY_FORM);

  const loadStoreInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      const data = (res.data as { data?: Record<string, unknown> }).data ?? {};
      setForm(mapSettingsToForm(data));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Mağaza bilgileri yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStoreInfo();
  }, [loadStoreInfo]);

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

  const patch = (key: keyof StoreInfoForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mağaza Ayarları</h1>
        <p className="text-gray-600 mt-2">Mağazanızın temel bilgilerini düzenleyin — panel ve vitrinde görünür.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-gray-900">Mağaza Bilgileri</h2>
            <p className="text-sm text-gray-500 mt-0.5">İsim, logo, iletişim</p>
          </div>

          <form onSubmit={handleSave} className="px-5 pb-5 pt-5 space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Mağaza adı *</label>
                  <input
                    type="text"
                    required
                    value={form.storeName}
                    onChange={e => patch('storeName', e.target.value)}
                    placeholder="Örn: Teknoloji Mağazam"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Panel sol üst ve vitrin başlığında görünür.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">E-posta</label>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={e => patch('contactEmail', e.target.value)}
                      placeholder="info@magaza.com"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Telefon</label>
                    <input
                      type="tel"
                      value={form.contactPhone}
                      onChange={e => patch('contactPhone', e.target.value)}
                      placeholder="+90 555 000 00 00"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Adres</label>
                  <input
                    type="text"
                    value={form.contactAddress}
                    onChange={e => patch('contactAddress', e.target.value)}
                    placeholder="Mahalle, ilçe, il"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Logo URL</label>
                  <input
                    type="url"
                    value={form.logoUrl}
                    onChange={e => patch('logoUrl', e.target.value)}
                    placeholder="https://..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Kısa açıklama</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={e => patch('description', e.target.value)}
                    placeholder="Mağazanızı kısaca tanıtın"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                  >
                    {saving ? 'Kaydediliyor…' : 'Kaydet'}
                  </button>
                  <span className="text-xs text-slate-400">
                    Panel: {displayStoreName(form.storeName)} · Vitrin: {displayStorefrontName(form.storeName)}
                  </span>
                </div>
              </>
            )}
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/dashboard/settings/payments"
            className="bg-white rounded-xl border border-slate-200 p-5 block hover:border-indigo-200 hover:shadow-sm transition"
          >
            <h3 className="font-semibold text-gray-900 mb-1">Ödeme Ayarları</h3>
            <p className="text-sm text-gray-500">PayTR, havale, kapıda ödeme</p>
          </Link>
          <Link
            to="/dashboard/settings/shipping"
            className="bg-white rounded-xl border border-slate-200 p-5 block hover:border-indigo-200 hover:shadow-sm transition"
          >
            <h3 className="font-semibold text-gray-900 mb-1">Kargo Ayarları</h3>
            <p className="text-sm text-gray-500">Kargo firmaları, ücretler</p>
          </Link>
          <div className="bg-white rounded-xl border border-slate-200 p-5 opacity-60">
            <h3 className="font-semibold text-gray-900 mb-1">Vergi Ayarları</h3>
            <p className="text-sm text-gray-500">Yakında</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreSettings;
