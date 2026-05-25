import { useEffect, useState } from 'react';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import {
  createMyAddress,
  deleteMyAddress,
  fetchMyAddresses,
  updateMyAddress,
  type CreateAddressBody,
  type CustomerAddress,
} from '../services/storefrontAccountApi';

const emptyAddress: CreateAddressBody = {
  title: 'Ev',
  fullName: '',
  phone: '',
  city: '',
  district: '',
  addressLine: '',
  postalCode: '',
  isDefault: false,
};

function addressToForm(a: CustomerAddress): CreateAddressBody {
  return {
    title:       a.title,
    fullName:    a.fullName,
    phone:       a.phone,
    city:        a.city,
    district:    a.district,
    addressLine: a.addressLine,
    postalCode:  a.postalCode ?? '',
    isDefault:   a.isDefault,
  };
}

function AddressForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
}: {
  form: CreateAddressBody;
  setForm: React.Dispatch<React.SetStateAction<CreateAddressBody>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 border-t border-slate-100 pt-6">
      <input
        required
        placeholder="Başlık (Ev, İş…)"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
      <input
        required
        placeholder="Ad soyad"
        value={form.fullName}
        onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
      <input
        required
        type="tel"
        placeholder="Telefon"
        value={form.phone}
        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
      <input
        required
        placeholder="Açık adres"
        value={form.addressLine}
        onChange={e => setForm(f => ({ ...f, addressLine: e.target.value }))}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          required
          placeholder="İlçe"
          value={form.district}
          onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Şehir"
          value={form.city}
          onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <input
        placeholder="Posta kodu"
        value={form.postalCode}
        onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
        />
        Varsayılan adres
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
        >
          İptal
        </button>
      </div>
    </form>
  );
}

export default function StoreAddressesPage() {
  const { tenant } = useStorefrontTenant();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateAddressBody>(emptyAddress);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!tenant?.slug) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchMyAddresses(tenant.slug);
      setAddresses(list);
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Adresler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug]);

  const resetForm = () => {
    setForm(emptyAddress);
    setEditingId(null);
    setMode('list');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.slug) return;
    setSaving(true);
    setError(null);
    try {
      await createMyAddress(tenant.slug, form);
      resetForm();
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Adres eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.slug || !editingId) return;
    setSaving(true);
    setError(null);
    try {
      await updateMyAddress(tenant.slug, editingId, form);
      resetForm();
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Adres güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenant?.slug || !confirm('Bu adresi silmek istediğinize emin misiniz?')) return;
    setError(null);
    try {
      await deleteMyAddress(tenant.slug, id);
      if (editingId === id) resetForm();
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Adres silinemedi.');
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!tenant?.slug) return;
    setError(null);
    try {
      await updateMyAddress(tenant.slug, id, { isDefault: true });
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Varsayılan adres ayarlanamadı.');
    }
  };

  const startEdit = (a: CustomerAddress) => {
    setEditingId(a.id);
    setForm(addressToForm(a));
    setMode('edit');
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-slate-900">Adreslerim</h2>
        {mode === 'list' && (
          <button
            type="button"
            onClick={() => {
              setForm(emptyAddress);
              setMode('create');
            }}
            className="px-4 py-2 text-sm rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            Yeni adres ekle
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {mode === 'create' && (
        <AddressForm
          form={form}
          setForm={setForm}
          onSubmit={handleCreate}
          onCancel={resetForm}
          saving={saving}
          submitLabel="Kaydet"
        />
      )}

      {mode === 'edit' && (
        <AddressForm
          form={form}
          setForm={setForm}
          onSubmit={handleUpdate}
          onCancel={resetForm}
          saving={saving}
          submitLabel="Güncelle"
        />
      )}

      {loading && mode === 'list' && (
        <p className="mt-4 text-sm text-slate-500">Yükleniyor…</p>
      )}

      {!loading && addresses.length === 0 && mode === 'list' && (
        <p className="mt-4 text-sm text-slate-500">Kayıtlı adresiniz yok.</p>
      )}

      {mode === 'list' && (
        <ul className="mt-4 space-y-3">
          {addresses.map(a => (
            <li
              key={a.id}
              className="rounded-lg border border-slate-100 p-4 text-sm"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {a.title}
                    {a.isDefault && (
                      <span className="ml-2 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        Varsayılan
                      </span>
                    )}
                  </p>
                  <p className="text-slate-700 mt-1">{a.fullName} · {a.phone}</p>
                  <p className="text-slate-600 mt-1">
                    {a.addressLine}, {a.district} / {a.city}
                    {a.postalCode ? ` · ${a.postalCode}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0 items-start">
                  {!a.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(a.id)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Varsayılan yap
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startEdit(a)}
                    className="text-xs text-slate-600 hover:underline"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
