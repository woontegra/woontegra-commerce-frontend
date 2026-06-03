import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { useStorefrontAuth } from '../hooks/StorefrontAuthProvider';

export default function StoreRegisterPage() {
  const { storeLink } = useStorefrontTenant();
  const { register } = useStorefrontAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [kvkkConsent, setKvkkConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!kvkkConsent) {
      setError('Devam etmek için KVKK aydınlatma metnini kabul etmelisiniz.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        kvkkConsent: true,
        marketingConsent,
      });
      navigate(storeLink('/store/hesabim'));
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Kayıt olunamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Kayıt ol</h1>
      <p className="mt-2 text-sm text-slate-500">Yeni müşteri hesabı oluşturun.</p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            required
            placeholder="Ad *"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            required
            placeholder="Soyad *"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <input
          type="email"
          required
          placeholder="E-posta *"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="tel"
          required
          placeholder="Telefon *"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Şifre (en az 6 karakter) *"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />

        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              required
              checked={kvkkConsent}
              onChange={e => setKvkkConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <a href="/kvkk" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">
                KVKK Aydınlatma Metni
              </a>
              {' '}ni okudum ve kabul ediyorum. *
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={e => setMarketingConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Kampanya, indirim ve duyurular hakkında e-posta / SMS almak istiyorum. (İsteğe bağlı)
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm disabled:opacity-60"
        >
          {submitting ? 'Kayıt olunuyor…' : 'Kayıt ol'}
        </button>
      </form>
      <p className="mt-6 text-sm text-center text-slate-600">
        Zaten hesabınız var mı?{' '}
        <Link to={storeLink('/store/giris')} className="text-indigo-600 font-medium hover:underline">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
