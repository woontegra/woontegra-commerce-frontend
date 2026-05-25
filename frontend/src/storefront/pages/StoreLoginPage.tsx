import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { useStorefrontAuth } from '../hooks/StorefrontAuthProvider';

export default function StoreLoginPage() {
  const { storeLink } = useStorefrontTenant();
  const { login } = useStorefrontAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(storeLink('/store/hesabim'));
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Giriş yapılamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Giriş yap</h1>
      <p className="mt-2 text-sm text-slate-500">Mağaza hesabınıza giriş yapın.</p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <input
          type="email"
          required
          placeholder="E-posta"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          placeholder="Şifre"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex justify-end">
          <Link
            to={storeLink('/store/sifremi-unuttum')}
            className="text-xs text-indigo-600 hover:underline"
          >
            Şifremi unuttum
          </Link>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm disabled:opacity-60"
        >
          {submitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>
      </form>
      <p className="mt-6 text-sm text-center text-slate-600">
        Hesabınız yok mu?{' '}
        <Link to={storeLink('/store/kayit')} className="text-indigo-600 font-medium hover:underline">
          Kayıt ol
        </Link>
      </p>
    </div>
  );
}
