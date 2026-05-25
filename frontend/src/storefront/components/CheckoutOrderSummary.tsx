import { Link } from 'react-router-dom';
import { formatTry } from '../utils/format';
import { useStorefrontCart } from '../hooks/StorefrontCartProvider';
import type { StoreShippingQuote } from '../../types/shippingSettings.types';

type Props = {
  checkoutUrl: string;
  showCheckoutButton?: boolean;
  quote: StoreShippingQuote | null;
  quoteLoading?: boolean;
  quoteError?: string | null;
};

export function CheckoutOrderSummary({
  checkoutUrl,
  showCheckoutButton = true,
  quote,
  quoteLoading,
  quoteError,
}: Props) {
  const { subtotal, itemCount } = useStorefrontCart();

  const shippingTotal = quote?.shipping?.shippingTotal ?? 0;
  const codFee = quote?.fees?.cashOnDeliveryFee ?? 0;
  const grandTotal = quote?.grandTotal ?? subtotal + shippingTotal + codFee;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 sticky top-24">
      <h2 className="font-semibold text-slate-900">Sipariş özeti</h2>

      <div className="flex justify-between text-sm text-slate-600">
        <span>Ürün ({itemCount})</span>
        <span>{formatTry(quote?.subtotal ?? subtotal)}</span>
      </div>

      <div className="flex justify-between text-sm text-slate-600">
        <span>
          Kargo
          {quote?.shipping?.displayName ? ` (${quote.shipping.displayName})` : ''}
        </span>
        {quoteLoading ? (
          <span className="text-slate-400">Hesaplanıyor…</span>
        ) : quoteError ? (
          <span className="text-amber-700 text-xs">—</span>
        ) : (
          <span>
            {quote?.shipping?.freeShippingApplied ? (
              <span className="text-emerald-700">Ücretsiz</span>
            ) : (
              formatTry(shippingTotal)
            )}
          </span>
        )}
      </div>

      {quote?.shipping?.freeShippingThreshold != null &&
        quote.shipping.freeShippingThreshold > 0 &&
        !quote.shipping.freeShippingApplied &&
        (quote.subtotal ?? subtotal) < quote.shipping.freeShippingThreshold && (
          <p className="text-xs text-slate-500">
            {formatTry(quote.shipping.freeShippingThreshold - (quote.subtotal ?? subtotal))} daha
            alışveriş yapın, kargo ücretsiz.
          </p>
        )}

      {codFee > 0 && (
        <div className="flex justify-between text-sm text-slate-600">
          <span>Kapıda ödeme ücreti</span>
          <span>{formatTry(codFee)}</span>
        </div>
      )}

      {quoteError && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
          {quoteError}
        </p>
      )}

      <div className="border-t border-slate-100 pt-3 flex justify-between font-semibold text-slate-900">
        <span>Genel toplam</span>
        <span>{quoteLoading ? '…' : formatTry(grandTotal)}</span>
      </div>

      {showCheckoutButton && (
        <Link
          to={checkoutUrl}
          className="block w-full text-center py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
        >
          Ödemeye geç
        </Link>
      )}
    </div>
  );
}
