import { useState, useEffect } from 'react';
import api from '../services/api';

interface DomainSettings {
  subdomain: string | null;
  customDomain: string | null;
  domainVerified: boolean;
  verificationRecord: string | null;
}

export default function DomainSettings() {
  const [settings, setSettings] = useState<DomainSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/domain/settings');
      setSettings(response.data.data);
      setSubdomain(response.data.data.subdomain || '');
      setCustomDomain(response.data.data.customDomain || '');
    } catch (error) {
      console.error('Failed to fetch domain settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubdomain = async () => {
    if (!subdomain.trim()) {
      setMessage({ type: 'error', text: 'Subdomain boş olamaz' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await api.put('/domain/subdomain', { subdomain });
      setSettings(response.data.data);
      setMessage({ type: 'success', text: 'Subdomain başarıyla güncellendi' });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Subdomain güncellenemedi' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomDomain = async () => {
    if (!customDomain.trim()) {
      setMessage({ type: 'error', text: 'Domain boş olamaz' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await api.post('/domain/custom', { customDomain });
      setSettings(response.data.data);
      setMessage({ 
        type: 'success', 
        text: 'Custom domain eklendi. Lütfen DNS ayarlarını yapın.' 
      });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Domain eklenemedi' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDomain = async () => {
    setVerifying(true);
    setMessage(null);

    try {
      const response = await api.post('/domain/verify');
      if (response.data.verified) {
        await fetchSettings();
        setMessage({ type: 'success', text: 'Domain başarıyla doğrulandı!' });
      } else {
        setMessage({ 
          type: 'error', 
          text: response.data.message || 'Domain doğrulanamadı' 
        });
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Doğrulama başarısız' 
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveCustomDomain = async () => {
    if (!confirm('Custom domain\'i kaldırmak istediğinizden emin misiniz?')) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await api.delete('/domain/custom');
      await fetchSettings();
      setCustomDomain('');
      setMessage({ type: 'success', text: 'Custom domain kaldırıldı' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Domain kaldırılamadı' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Domain Ayarları</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Subdomain ve custom domain yönetimi</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Subdomain Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subdomain</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Mağazanız için benzersiz bir subdomain seçin
        </p>

        <div className="flex gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                placeholder="mystore"
                className="flex-1 px-4 py-2 border dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-500 dark:text-gray-400">.localhost</span>
            </div>
            {settings?.subdomain && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Mevcut: <span className="font-medium">{settings.subdomain}.localhost</span>
              </p>
            )}
          </div>
          <button
            onClick={handleUpdateSubdomain}
            disabled={saving || subdomain === settings?.subdomain}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* Custom Domain Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Domain</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Kendi domain adınızı kullanın (Enterprise plan gerektirir)
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
            Enterprise
          </span>
        </div>

        {!settings?.customDomain ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                placeholder="www.mydomain.com"
                className="flex-1 px-4 py-2 border dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAddCustomDomain}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition"
              >
                {saving ? 'Ekleniyor...' : 'Ekle'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{settings.customDomain}</p>
                <div className="flex items-center gap-2 mt-1">
                  {settings.domainVerified ? (
                    <>
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-green-600 dark:text-green-400">Doğrulandı</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm text-yellow-600 dark:text-yellow-400">Doğrulama bekleniyor</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!settings.domainVerified && (
                  <button
                    onClick={handleVerifyDomain}
                    disabled={verifying}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition"
                  >
                    {verifying ? 'Doğrulanıyor...' : 'Doğrula'}
                  </button>
                )}
                <button
                  onClick={handleRemoveCustomDomain}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition"
                >
                  Kaldır
                </button>
              </div>
            </div>

            {!settings.domainVerified && settings.verificationRecord && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">DNS Ayarları</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Domain'inizi doğrulamak için aşağıdaki TXT kaydını DNS ayarlarınıza ekleyin:
                </p>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg font-mono text-sm">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Type:</span>
                      <p className="font-medium text-gray-900 dark:text-white">TXT</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Name:</span>
                      <p className="font-medium text-gray-900 dark:text-white">@</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Value:</span>
                      <p className="font-medium text-gray-900 dark:text-white break-all">
                        {settings.verificationRecord}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  DNS değişikliklerinin yayılması 24-48 saat sürebilir.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-400 mb-2">Domain Nasıl Çalışır?</h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span><strong>Subdomain:</strong> Ücretsiz, anında aktif (örn: mystore.localhost)</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span><strong>Custom Domain:</strong> Enterprise plan, DNS doğrulama gerektirir</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Her tenant için sadece bir subdomain ve bir custom domain kullanılabilir</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
