import { Link } from 'react-router-dom';
import { formatTry } from '../utils/format';
import { useStorefrontCart } from '../hooks/StorefrontCartProvider';

type Props = {
  checkoutUrl: string;
  showCheckoutButton?: boolean;
};

export function CartSummary({ checkoutUrl, showCheckoutButton = true }: Props) {
  const { subtotal, itemCount } = useStorefrontCart();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 sticky top-24">
      <h2 className="font-semibold text-slate-900">Sipariş özeti</h2>
      <div className="flex justify-between text-sm text-slate-600">
        <span>Ürün ({itemCount})</span>
        <span>{formatTry(subtotal)}</span>
      </div>
      <div className="border-t border-slate-100 pt-3 flex justify-between font-semibold text-slate-900">
        <span>Ara toplam</span>
        <span>{formatTry(subtotal)}</span>
      </div>
      <p className="text-xs text-slate-500">
        Kargo ücreti ödeme adımında hesaplanacak.
      </p>
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
