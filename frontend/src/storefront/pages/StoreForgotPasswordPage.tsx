import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { requestPasswordReset } from '../services/storefrontAuthApi';
import { getStorefrontApiErrorMessage } from '../utils/apiError';

export default function StoreForgotPasswordPage() {
  const { storeLink, tenant } = useStorefrontTenant();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.slug) {
      setError('Mağaza yüklenemedi.');
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      const msg = await requestPasswordReset(tenant.slug, email.trim());
      setSuccessMessage(msg);
      setEmail('');
    } catch (err: unknown) {
      setError(
        getStorefrontApiErrorMessage(err, 'İşlem şu anda tamamlanamadı. Lütfen tekrar deneyin.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Şifremi unuttum</h1>
      <p className="mt-2 text-sm text-slate-500">
        Kayıtlı e-posta adresinize şifre sıfırlama bağlantısı göndereceğiz.
      </p>

      {successMessage && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {!successMessage && (
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            required
            placeholder="E-posta"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm disabled:opacity-60"
          >
            {submitting ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı gönder'}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-center text-slate-600">
        <Link to={storeLink('/store/giris')} className="text-indigo-600 font-medium hover:underline">
          Giriş sayfasına dön
        </Link>
      </p>
    </div>
  );
}
