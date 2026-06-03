import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Modal from '../ui/Modal';
import { productService, type ProductListItem } from '../../services/product.service';
import { customerService } from '../../services/customer.service';
import {
  type OrderPaymentProviderFilter,
  type OrderPaymentStatusFilter,
} from '../../services/order.service';
import { useCreateOrder } from '../../hooks/useOrders';

type ManualPaymentMethod = 'BANK_TRANSFER' | 'CASH_ON_DELIVERY' | 'MANUAL_PAID';

const PAYMENT_OPTIONS: { value: ManualPaymentMethod; label: string }[] = [
  { value: 'BANK_TRANSFER',    label: 'Havale / EFT' },
  { value: 'CASH_ON_DELIVERY', label: 'Kapıda Ödeme' },
  { value: 'MANUAL_PAID',      label: 'Manuel ödeme (tahsil edildi)' },
];

function splitCustomerName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim();
  if (!trimmed) return { firstName: 'Müşteri', lastName: '-' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '-' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function resolvePayment(method: ManualPaymentMethod): {
  paymentProvider: OrderPaymentProviderFilter;
  paymentStatus?: OrderPaymentStatusFilter;
} {
  if (method === 'BANK_TRANSFER') {
    return { paymentProvider: 'BANK_TRANSFER' };
  }
  if (method === 'CASH_ON_DELIVERY') {
    return { paymentProvider: 'CASH_ON_DELIVERY' };
  }
  return { paymentProvider: 'BANK_POS', paymentStatus: 'PAID' };
}

function formatAddressBlock(fullName: string, phone: string, address: string): string {
  return `${fullName} · ${phone}\n${address.trim()}`;
}

function buildOrderNotes(input: {
  orderNote: string;
  paymentProvider: OrderPaymentProviderFilter;
  customerName: string;
  phone: string;
  shippingAddress: string;
  billingSame: boolean;
  billingAddress: string;
}): string {
  const parts: string[] = ['[Panel manuel sipariş]'];
  if (input.orderNote.trim()) {
    parts.push(input.orderNote.trim());
  }
  parts.push(`[Ödeme yöntemi: ${input.paymentProvider}]`);
  parts.push(
    `Teslimat:\n${formatAddressBlock(input.customerName, input.phone, input.shippingAddress)}`,
  );
  if (!input.billingSame && input.billingAddress.trim()) {
    parts.push(
      `Fatura:\n${formatAddressBlock(input.customerName, input.phone, input.billingAddress)}`,
    );
  }
  return parts.join('\n\n');
}

async function resolveCustomerId(input: {
  customerName: string;
  email: string;
  phone: string;
  shippingAddress: string;
}): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const { firstName, lastName } = splitCustomerName(input.customerName);
  const address = input.shippingAddress.trim();

  const existing = await customerService.getAll({ search: email, limit: 5 });
  const match = existing.customers.find(
    (c) => c.email.toLowerCase() === email,
  );

  if (match) {
    await customerService.update(match.id, {
      firstName,
      lastName,
      phone:   input.phone.trim(),
      address: address || match.address,
    });
    return match.id;
  }

  const created = await customerService.create({
    firstName,
    lastName,
    email,
    phone:   input.phone.trim() || undefined,
    address: address || undefined,
    country: 'TR',
  });
  return created.id;
}

interface CreateManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateManualOrderModal({
  isOpen,
  onClose,
  onCreated,
}: CreateManualOrderModalProps) {
  const navigate = useNavigate();
  const createOrder = useCreateOrder();

  const [customerName, setCustomerName]       = useState('');
  const [email, setEmail]                     = useState('');
  const [phone, setPhone]                     = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [billingSame, setBillingSame]         = useState(true);
  const [billingAddress, setBillingAddress]   = useState('');
  const [productSearch, setProductSearch]     = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null);
  const [quantity, setQuantity]               = useState(1);
  const [paymentMethod, setPaymentMethod]     = useState<ManualPaymentMethod>('BANK_TRANSFER');
  const [orderNote, setOrderNote]             = useState('');
  const [formError, setFormError]             = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(productSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [productSearch]);

  const { data: productResult, isFetching: productsLoading } = useQuery({
    queryKey: ['manual-order-products', debouncedSearch],
    queryFn:  () =>
      productService.search({
        search:   debouncedSearch || undefined,
        isActive: true,
        status:   'active',
        limit:    20,
        page:     1,
      }),
    enabled: isOpen,
  });

  const products = productResult?.items ?? [];

  const lineTotal = useMemo(() => {
    if (!selectedProduct) return 0;
    return selectedProduct.price * quantity;
  }, [selectedProduct, quantity]);

  const resetForm = useCallback(() => {
    setCustomerName('');
    setEmail('');
    setPhone('');
    setShippingAddress('');
    setBillingSame(true);
    setBillingAddress('');
    setProductSearch('');
    setDebouncedSearch('');
    setSelectedProduct(null);
    setQuantity(1);
    setPaymentMethod('BANK_TRANSFER');
    setOrderNote('');
    setFormError(null);
  }, []);

  const handleClose = () => {
    if (createOrder.isPending) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim()) {
      setFormError('Müşteri adı zorunludur.');
      return;
    }
    if (!email.trim()) {
      setFormError('E-posta zorunludur.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Telefon zorunludur.');
      return;
    }
    if (!shippingAddress.trim()) {
      setFormError('Teslimat adresi zorunludur.');
      return;
    }
    if (!billingSame && !billingAddress.trim()) {
      setFormError('Fatura adresi girin veya "Fatura adresi aynı" seçeneğini işaretleyin.');
      return;
    }
    if (!selectedProduct) {
      setFormError('Ürün seçin.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      setFormError('Adet en az 1 olmalıdır.');
      return;
    }
    if (selectedProduct.price <= 0) {
      setFormError('Seçilen ürünün geçerli bir fiyatı yok.');
      return;
    }

    try {
      const customerId = await resolveCustomerId({
        customerName: customerName.trim(),
        email:        email.trim(),
        phone:        phone.trim(),
        shippingAddress: shippingAddress.trim(),
      });

      const { paymentProvider, paymentStatus } = resolvePayment(paymentMethod);
      const notes = buildOrderNotes({
        orderNote,
        paymentProvider,
        customerName: customerName.trim(),
        phone:        phone.trim(),
        shippingAddress: shippingAddress.trim(),
        billingSame,
        billingAddress: billingAddress.trim(),
      });

      const order = await createOrder.mutateAsync({
        customerId,
        items: [{
          productId: selectedProduct.id,
          quantity,
          price:     selectedProduct.price,
        }],
        notes,
        currency: 'TRY',
        paymentProvider,
        ...(paymentStatus ? { paymentStatus } : {}),
      });

      resetForm();
      onClose();
      onCreated?.();
      navigate(`/dashboard/orders/${order.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err as Error)?.message
        ?? 'Sipariş oluşturulamadı.';
      setFormError(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Manuel Sipariş Oluştur"
      size="xl"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={createOrder.isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
          >
            İptal
          </button>
          <button
            type="submit"
            form="manual-order-form"
            disabled={createOrder.isPending}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
          >
            {createOrder.isPending ? 'Oluşturuluyor...' : 'Siparişi Oluştur'}
          </button>
        </div>
      }
    >
      <form id="manual-order-form" onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-gray-700">Müşteri adı *</span>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Ad Soyad"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">E-posta *</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Telefon *</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="05xx xxx xx xx"
              required
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-gray-700">Teslimat adresi *</span>
            <textarea
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Mahalle, sokak, ilçe, il..."
              required
            />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={billingSame}
              onChange={(e) => setBillingSame(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600"
            />
            <span className="text-sm text-gray-700">Fatura adresi teslimat ile aynı</span>
          </label>
          {!billingSame && (
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Fatura adresi *</span>
              <textarea
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          )}
        </div>

        <div className="border-t border-gray-100 pt-5 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Ürün</h4>
          <input
            type="search"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Ürün ara..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          {productsLoading && (
            <p className="text-xs text-gray-500">Ürünler yükleniyor...</p>
          )}
          {!productsLoading && products.length > 0 && !selectedProduct && (
            <ul className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
              {products.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(p);
                      setProductSearch(p.name);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex justify-between gap-2"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 text-gray-600">
                      {p.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      {p.stock != null ? ` · Stok: ${p.stock}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedProduct && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-sm">
              <span className="font-medium text-gray-900">{selectedProduct.name}</span>
              <span className="text-gray-600">
                {selectedProduct.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setProductSearch('');
                }}
                className="text-indigo-700 hover:underline text-xs"
              >
                Değiştir
              </button>
            </div>
          )}
          <label className="block max-w-xs">
            <span className="text-sm font-medium text-gray-700">Adet *</span>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </label>
          {selectedProduct && (
            <p className="text-sm text-gray-600">
              Satır tutarı:{' '}
              <strong>
                {lineTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </strong>
            </p>
          )}
        </div>

        <div className="border-t border-gray-100 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Ödeme yöntemi *</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as ManualPaymentMethod)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {PAYMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-gray-700">Sipariş notu</span>
            <textarea
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Telefon/WhatsApp satış notu (isteğe bağlı)"
            />
          </label>
        </div>
      </form>
    </Modal>
  );
}
