import { useEffect, useState } from 'react';
import { useStorefrontAuth } from '../hooks/StorefrontAuthProvider';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { updateMyProfile } from '../services/storefrontAccountApi';

export default function StoreProfilePage() {
  const { customer, refreshMe } = useStorefrontAuth();
  const { tenant } = useStorefrontTenant();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setFirstName(customer.firstName);
    setLastName(customer.lastName);
    setPhone(customer.phone);
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.slug) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateMyProfile(tenant.slug, {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        phone:     phone.trim(),
      });
      await refreshMe();
      setSuccess(true);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Profil güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  if (!customer) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold text-slate-900 mb-4">Profilim</h2>

      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-4 text-sm text-green-800 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          Profiliniz güncellendi.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Ad</label>
            <input
              required
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Soyad</label>
            <input
              required
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Telefon</label>
          <input
            required
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">E-posta</label>
          <input
            readOnly
            value={customer.email}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-600 cursor-not-allowed"
          />
          <p className="text-xs text-slate-400 mt-1">E-posta adresi değiştirilemez.</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </form>
    </div>
  );
}
