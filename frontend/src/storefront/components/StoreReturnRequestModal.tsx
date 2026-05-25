import { useState } from 'react';
import type { MyOrderDetail } from '../services/storefrontAccountApi';
import type { ReturnRequestType } from '../services/storefrontReturnsApi';
import { createReturnRequest } from '../services/storefrontReturnsApi';

type Props = {
  tenantSlug: string;
  order: MyOrderDetail;
  type: ReturnRequestType;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function StoreReturnRequestModal({ tenantSlug, order, type, open, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const isReturn = type === 'RETURN_REQUEST';

  const toggleItem = (orderItemId: string, _maxQty: number, checked: boolean) => {
    setSelected(prev => {
      const next = { ...prev };
      if (checked) next[orderItemId] = 1;
      else delete next[orderItemId];
      return next;
    });
  };

  const setQty = (orderItemId: string, maxQty: number, qty: number) => {
    setSelected(prev => ({
      ...prev,
      [orderItemId]: Math.max(1, Math.min(maxQty, qty)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setError('Lütfen talep sebebini yazın (en az 3 karakter).');
      return;
    }

    if (isReturn) {
      const entries = Object.entries(selected);
      if (entries.length === 0) {
        setError('İade talebi için en az bir ürün seçmelisiniz.');
        return;
      }
      for (const [, qty] of entries) {
        if (qty < 1) {
          setError('Ürün adedi en az 1 olmalıdır.');
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const items = isReturn
        ? Object.entries(selected).map(([orderItemId, quantity]) => ({
            orderItemId,
            quantity,
          }))
        : undefined;

      await createReturnRequest(tenantSlug, order.orderNumber, {
        type,
        reason: trimmedReason,
        customerNote: customerNote.trim() || undefined,
        items,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Talep oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-lg font-semibold text-slate-900">
          {isReturn ? 'İade talebi oluştur' : 'İptal talebi oluştur'}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Sipariş #{order.orderNumber} ·{' '}
          <span className="font-medium text-slate-700">
            {isReturn ? 'İade talebi' : 'İptal talebi'}
          </span>
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Talep nedeni *</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder={isReturn ? 'Örn. Ürün beklentimi karşılamadı' : 'Örn. Yanlış sipariş verdim'}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Ek açıklama</label>
            <textarea
              value={customerNote}
              onChange={e => setCustomerNote(e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Ek bilgi (isteğe bağlı)"
            />
          </div>

          {isReturn && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">İade edilecek ürünler *</p>
              <ul className="space-y-2 border border-slate-100 rounded-lg p-3">
                {order.items.map(item => (
                  <li key={item.id} className="text-sm">
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={item.id in selected}
                        onChange={e => toggleItem(item.id, item.quantity, e.target.checked)}
                        className="mt-1"
                      />
                      <span className="flex-1">
                        {item.product?.name ?? 'Ürün'}
                        {item.variant?.name ? ` — ${item.variant.name}` : ''}
                        <span className="text-slate-500 text-xs block">Sipariş adedi: {item.quantity}</span>
                      </span>
                    </label>
                    {item.id in selected && (
                      <div className="mt-2 ml-6 flex items-center gap-2">
                        <span className="text-xs text-slate-500">Adet</span>
                        <input
                          type="number"
                          min={1}
                          max={item.quantity}
                          value={selected[item.id]}
                          onChange={e => setQty(item.id, item.quantity, Number(e.target.value))}
                          className="w-16 border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? 'Gönderiliyor…' : 'Talebi gönder'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border text-sm text-slate-600"
            >
              Vazgeç
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
