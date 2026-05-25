import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { resetPassword } from '../services/storefrontAuthApi';
import { getStorefrontApiErrorMessage } from '../utils/apiError';

export default function StoreResetPasswordPage() {
  const { storeLink, tenant } = useStorefrontTenant();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get('token')?.trim() ?? '';

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.slug) {
      setError('Mağaza yüklenemedi.');
      return;
    }
    if (!tokenFromUrl) {
      setError('Geçersiz veya eksik sıfırlama bağlantısı.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(tenant.slug, tokenFromUrl, password);
      setSuccess(true);
      setTimeout(() => {
        navigate(storeLink('/store/giris'));
      }, 2500);
    } catch (err: unknown) {
      setError(
        getStorefrontApiErrorMessage(err, 'Şifre güncellenemedi. Bağlantı süresi dolmuş olabilir.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!tokenFromUrl) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-sm text-red-700">Geçersiz veya eksik sıfırlama bağlantısı.</p>
        <Link
          to={storeLink('/store/sifremi-unuttum')}
          className="mt-4 inline-block text-indigo-600 text-sm font-medium hover:underline"
        >
          Yeni bağlantı iste
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Yeni şifre belirle</h1>
      <p className="mt-2 text-sm text-slate-500">Hesabınız için yeni bir şifre oluşturun.</p>

      {success && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Şifreniz güncellendi. Giriş sayfasına yönlendiriliyorsunuz…
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {!success && (
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <input
            type="password"
            required
            minLength={6}
            placeholder="Yeni şifre"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Yeni şifre (tekrar)"
            value={passwordConfirm}
            onChange={e => setPasswordConfirm(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm disabled:opacity-60"
          >
            {submitting ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
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
