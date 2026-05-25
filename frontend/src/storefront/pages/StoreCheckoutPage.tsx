import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { useStorefrontCart } from '../hooks/StorefrontCartProvider';
import { useStorefrontAuth } from '../hooks/StorefrontAuthProvider';
import { createMyAddress, fetchMyAddresses, type CustomerAddress } from '../services/storefrontAccountApi';
import { CheckoutOrderSummary } from '../components/CheckoutOrderSummary';
import { createStoreOrder } from '../services/storefrontOrderApi';
import { calculateStoreShipping } from '../services/storefrontShippingApi';
import type { StoreShippingQuote } from '../../types/shippingSettings.types';
import { startPaytrPayment } from '../services/storefrontPaytrApi';
import {
  fetchStorePaymentMethods,
  type StorePaymentMethod,
} from '../services/storefrontPaymentMethodsApi';
import type { StorefrontCheckoutForm } from '../types/storefront.types';

const emptyForm: StorefrontCheckoutForm = {
  email: '',
  phone: '',
  firstName: '',
  lastName: '',
  shippingAddress: '',
  shippingDistrict: '',
  shippingCity: '',
  shippingZip: '',
  billingSameAsShipping: true,
  billingAddress: '',
  billingDistrict: '',
  billingCity: '',
  billingZip: '',
  shippingMethodId: '',
  paymentMethodId: '',
  couponCode: '',
};

export default function StoreCheckoutPage() {
  const { tenant, storeLink } = useStorefrontTenant();
  const navigate = useNavigate();
  const { lines, clearCart } = useStorefrontCart();
  const { customer, isAuthenticated } = useStorefrontAuth();
  const [form, setForm] = useState<StorefrontCheckoutForm>(emptyForm);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [saveToAddressBook, setSaveToAddressBook] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<StorePaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingQuote, setShippingQuote] = useState<StoreShippingQuote | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) return;
    setForm(f => ({
      ...f,
      email:     customer.email || f.email,
      phone:     customer.phone || f.phone,
      firstName: customer.firstName || f.firstName,
      lastName:  customer.lastName || f.lastName,
    }));
  }, [customer]);

  useEffect(() => {
    if (!tenant?.slug || !isAuthenticated) {
      setSavedAddresses([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchMyAddresses(tenant.slug);
        if (!cancelled) {
          setSavedAddresses(list);
          const def = list.find(a => a.isDefault) ?? list[0];
          if (def) setSelectedAddressId(def.id);
        }
      } catch {
        if (!cancelled) setSavedAddresses([]);
      }
    })();
    return () => { cancelled = true; };
  }, [tenant?.slug, isAuthenticated]);

  useEffect(() => {
    const addr = savedAddresses.find(a => a.id === selectedAddressId);
    if (!addr) return;
    const nameParts = addr.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || '';
    setForm(f => ({
      ...f,
      firstName,
      lastName,
      phone:            addr.phone || f.phone,
      shippingAddress:  addr.addressLine,
      shippingDistrict: addr.district,
      shippingCity:     addr.city,
      shippingZip:      addr.postalCode ?? '',
    }));
  }, [selectedAddressId, savedAddresses]);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    (async () => {
      setMethodsLoading(true);
      try {
        const res = await fetchStorePaymentMethods(tenant.slug);
        if (!cancelled && res.success && res.methods?.length) {
          setPaymentMethods(res.methods);
          setForm(f => ({
            ...f,
            paymentMethodId: f.paymentMethodId || res.methods![0].provider,
          }));
        }
      } catch {
        if (!cancelled) setPaymentMethods([]);
      } finally {
        if (!cancelled) setMethodsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tenant]);

  useEffect(() => {
    if (!tenant || lines.length === 0) {
      setShippingQuote(null);
      setShippingError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setShippingLoading(true);
      setShippingError(null);
      try {
        const provider = form.paymentMethodId as
          | 'PAYTR'
          | 'BANK_TRANSFER'
          | 'CASH_ON_DELIVERY'
          | undefined;
        const quote = await calculateStoreShipping(tenant.slug, {
          items: lines.map(l => ({
            productId: l.productId,
            variantId: l.variantId ?? null,
            quantity:  l.quantity,
          })),
          ...(provider ? { paymentProvider: provider } : {}),
        });
        if (!cancelled) setShippingQuote(quote);
      } catch (e: unknown) {
        if (!cancelled) {
          setShippingQuote(null);
          setShippingError(
            (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
              (e as Error)?.message ??
              'Kargo hesaplanamadı.',
          );
        }
      } finally {
        if (!cancelled) setShippingLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tenant, lines, form.paymentMethodId]);

  if (!tenant) return null;

  if (lines.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-slate-600">Ödeme için sepetinizde ürün olmalı.</p>
        <Link to={storeLink('/store/sepet')} className="mt-4 inline-block text-indigo-600 font-medium">
          Sepete dön
        </Link>
      </div>
    );
  }

  const update = (patch: Partial<StorefrontCheckoutForm>) =>
    setForm(f => ({ ...f, ...patch }));

  const selectedMethod = paymentMethods.find(m => m.provider === form.paymentMethodId);
  const isNewAddress = isAuthenticated && !selectedAddressId;

  const maybeSaveAddressToBook = async () => {
    if (!isAuthenticated || !saveToAddressBook || !isNewAddress || !tenant?.slug) return;
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    if (!fullName || !form.shippingAddress.trim()) return;
    try {
      await createMyAddress(tenant.slug, {
        title:       'Teslimat',
        fullName,
        phone:       form.phone.trim(),
        city:        form.shippingCity.trim(),
        district:    form.shippingDistrict.trim(),
        addressLine: form.shippingAddress.trim(),
        postalCode:  form.shippingZip.trim(),
        isDefault:   savedAddresses.length === 0,
      });
    } catch {
      /* sipariş akışını kesme */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.paymentMethodId) {
      setError('Lütfen bir ödeme yöntemi seçin.');
      return;
    }

    if (shippingError || !shippingQuote?.success) {
      setError(shippingError || 'Kargo ücreti hesaplanamadı. Lütfen tekrar deneyin.');
      return;
    }

    setSubmitting(true);
    await maybeSaveAddressToBook();
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const provider = form.paymentMethodId as 'PAYTR' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY';

    try {
      const res = await createStoreOrder(tenant.slug, {
        items: lines.map(l => ({
          productId: l.productId,
          variantId: l.variantId ?? null,
          quantity:  l.quantity,
        })),
        customer: {
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim(),
          email:     form.email.trim(),
          phone:     form.phone.trim(),
        },
        shippingAddress: {
          fullName,
          phone:       form.phone.trim(),
          city:        form.shippingCity.trim(),
          district:    form.shippingDistrict.trim(),
          addressLine: form.shippingAddress.trim(),
          postalCode:  form.shippingZip.trim(),
        },
        billingAddress: {
          sameAsShipping: form.billingSameAsShipping,
          ...(form.billingSameAsShipping
            ? {}
            : {
                fullName:    `${form.firstName} ${form.lastName}`.trim(),
                phone:       form.phone.trim(),
                city:        form.billingCity.trim(),
                district:    form.billingDistrict.trim(),
                addressLine: form.billingAddress.trim(),
                postalCode:  form.billingZip.trim(),
              }),
        },
        notes: '',
        paymentProvider: provider,
      });

      if (!res.success || !res.order) {
        throw new Error(res.error || 'Sipariş oluşturulamadı.');
      }

      clearCart();

      if (provider === 'PAYTR') {
        const payRes = await startPaytrPayment(tenant.slug, { orderId: res.order.id });
        if (!payRes.success || !payRes.iframeUrl) {
          throw new Error(payRes.error || 'Ödeme oturumu başlatılamadı.');
        }
        navigate(
          storeLink(`/store/odeme/paytr/${encodeURIComponent(res.order.orderNumber)}`),
          {
            state: {
              iframeUrl: payRes.iframeUrl,
              orderId:   res.order.id,
              total:     res.order.total,
            },
          },
        );
        return;
      }

      if (provider === 'BANK_TRANSFER') {
        navigate(
          storeLink(`/store/odeme-bekleniyor/${encodeURIComponent(res.order.orderNumber)}`),
          {
            state: {
              total: res.order.total,
              bankMethod: selectedMethod?.provider === 'BANK_TRANSFER' ? selectedMethod : undefined,
            },
          },
        );
        return;
      }

      if (provider === 'CASH_ON_DELIVERY') {
        navigate(
          storeLink(`/store/siparis-basarili/${encodeURIComponent(res.order.orderNumber)}`),
          { state: { total: res.order.total, cod: true } },
        );
        return;
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err as Error)?.message ??
        'Sipariş oluşturulurken bir hata oluştu.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Ödeme</h1>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">İletişim</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                required
                type="email"
                readOnly={isAuthenticated}
                placeholder="E-posta *"
                value={form.email}
                onChange={e => update({ email: e.target.value })}
                className={`border border-slate-200 rounded-lg px-3 py-2 text-sm ${
                  isAuthenticated ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : ''
                }`}
              />
              <input
                required
                type="tel"
                placeholder="Telefon *"
                value={form.phone}
                onChange={e => update({ phone: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">Teslimat adresi</h2>
            {savedAddresses.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Kayıtlı adreslerinizden seçin veya yeni adres girin.</p>
                {savedAddresses.map(a => (
                  <label
                    key={a.id}
                    className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer text-sm ${
                      selectedAddressId === a.id
                        ? 'border-indigo-500 bg-indigo-50/40'
                        : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="savedAddress"
                      checked={selectedAddressId === a.id}
                      onChange={() => {
                        setSelectedAddressId(a.id);
                        setSaveToAddressBook(false);
                      }}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium">{a.title}</span> — {a.fullName}
                      <span className="block text-slate-600 text-xs mt-0.5">
                        {a.addressLine}, {a.district}/{a.city}
                      </span>
                    </span>
                  </label>
                ))}
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="radio"
                    name="savedAddress"
                    checked={selectedAddressId === ''}
                    onChange={() => {
                      setSelectedAddressId('');
                      setSaveToAddressBook(false);
                    }}
                  />
                  Yeni adres gir
                </label>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                required
                placeholder="Ad *"
                value={form.firstName}
                onChange={e => update({ firstName: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Soyad *"
                value={form.lastName}
                onChange={e => update({ lastName: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <input
              required
              placeholder="Açık adres *"
              value={form.shippingAddress}
              onChange={e => update({ shippingAddress: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            <div className="grid sm:grid-cols-3 gap-3">
              <input
                required
                placeholder="İlçe *"
                value={form.shippingDistrict}
                onChange={e => update({ shippingDistrict: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Şehir *"
                value={form.shippingCity}
                onChange={e => update({ shippingCity: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                placeholder="Posta kodu"
                value={form.shippingZip}
                onChange={e => update({ shippingZip: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            {isNewAddress && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={saveToAddressBook}
                  onChange={e => setSaveToAddressBook(e.target.checked)}
                />
                Bu adresi adres defterime kaydet
              </label>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.billingSameAsShipping}
                onChange={e => update({ billingSameAsShipping: e.target.checked })}
              />
              Fatura adresi teslimat ile aynı
            </label>
            {!form.billingSameAsShipping && (
              <>
                <input
                  placeholder="Fatura açık adres"
                  value={form.billingAddress}
                  onChange={e => update({ billingAddress: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    placeholder="İlçe"
                    value={form.billingDistrict}
                    onChange={e => update({ billingDistrict: e.target.value })}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Şehir"
                    value={form.billingCity}
                    onChange={e => update({ billingCity: e.target.value })}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="font-semibold text-slate-900">Kargo</h2>
            {shippingLoading && (
              <p className="text-sm text-slate-500">Kargo ücreti hesaplanıyor…</p>
            )}
            {shippingError && (
              <p className="text-sm text-amber-800">{shippingError}</p>
            )}
            {!shippingLoading && shippingQuote?.shipping && (
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm">
                <p className="font-medium text-slate-900">{shippingQuote.shipping.displayName}</p>
                <p className="text-slate-600 mt-1">
                  Kargo:{' '}
                  {shippingQuote.shipping.freeShippingApplied
                    ? 'Ücretsiz'
                    : `${shippingQuote.shipping.shippingTotal.toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: 'TRY',
                      })}`}
                </p>
                {shippingQuote.shipping.freeShippingThreshold != null &&
                  shippingQuote.shipping.freeShippingThreshold > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Ücretsiz kargo limiti:{' '}
                      {shippingQuote.shipping.freeShippingThreshold.toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: 'TRY',
                      })}
                    </p>
                  )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="font-semibold text-slate-900">Ödeme yöntemi</h2>
            {methodsLoading && (
              <p className="text-sm text-slate-500">Ödeme yöntemleri yükleniyor…</p>
            )}
            {!methodsLoading && paymentMethods.length === 0 && (
              <p className="text-sm text-amber-800">
                Bu mağazada aktif ödeme yöntemi tanımlı değil. Yönetici panelinden ödeme ayarlarını yapılandırın.
              </p>
            )}
            <div className="space-y-2">
              {paymentMethods.map(m => (
                <label
                  key={m.provider}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                    form.paymentMethodId === m.provider
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : 'border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={m.provider}
                    checked={form.paymentMethodId === m.provider}
                    onChange={() => update({ paymentMethodId: m.provider })}
                    className="mt-1"
                  />
                  <div className="text-sm">
                    <span className="font-medium text-slate-900">{m.displayName}</span>
                    {m.provider === 'PAYTR' && m.isTestMode && (
                      <span className="ml-2 text-xs text-amber-700">(test modu)</span>
                    )}
                    {m.provider === 'CASH_ON_DELIVERY' && m.extraFee != null && m.extraFee > 0 && (
                      <span className="block text-xs text-slate-500">
                        Ek ücret: {m.extraFee} ₺
                      </span>
                    )}
                    {m.provider === 'BANK_TRANSFER' && (
                      <span className="block text-xs text-slate-500">
                        Sipariş sonrası banka bilgileri gösterilir.
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </section>

          <button
            type="submit"
            disabled={
              submitting ||
              paymentMethods.length === 0 ||
              shippingLoading ||
              Boolean(shippingError) ||
              !shippingQuote?.success
            }
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? 'Sipariş oluşturuluyor…' : 'Siparişi tamamla'}
          </button>
        </div>

        <div>
          <CheckoutOrderSummary
            checkoutUrl={storeLink('/store/odeme')}
            showCheckoutButton={false}
            quote={shippingQuote}
            quoteLoading={shippingLoading}
            quoteError={shippingError}
          />
        </div>
      </form>
    </div>
  );
}
