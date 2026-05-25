import { Link } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { useStorefrontCart } from '../hooks/StorefrontCartProvider';
import { CartSummary } from '../components/CartSummary';
import { formatTry } from '../utils/format';

export default function StoreCartPage() {
  const { storeLink } = useStorefrontTenant();
  const { lines, removeLine, setQuantity } = useStorefrontCart();

  if (lines.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Sepetiniz boş</h1>
        <p className="mt-2 text-slate-500 text-sm">Alışverişe başlamak için ürünlere göz atın.</p>
        <Link
          to={storeLink('/store/urunler')}
          className="inline-block mt-8 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
        >
          Ürünlere git
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Sepet</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {lines.map(line => (
            <div
              key={`${line.productId}:${line.variantId ?? ''}`}
              className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-white"
            >
              <Link
                to={storeLink(`/store/urun/${encodeURIComponent(line.slug)}`)}
                className="shrink-0 w-24 h-24 rounded-lg bg-slate-100 overflow-hidden"
              >
                {line.imageUrl ? (
                  <img src={line.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : null}
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  to={storeLink(`/store/urun/${encodeURIComponent(line.slug)}`)}
                  className="font-medium text-slate-900 hover:text-indigo-600 line-clamp-2"
                >
                  {line.name}
                </Link>
                <p className="text-sm text-slate-500 mt-1">{formatTry(line.unitPrice)} / adet</p>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(line.productId, line.quantity - 1, line.variantId)}
                    className="w-8 h-8 rounded border text-slate-600 hover:bg-slate-50"
                  >
                    −
                  </button>
                  <span className="text-sm font-medium w-8 text-center">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(line.productId, line.quantity + 1, line.variantId)}
                    className="w-8 h-8 rounded border text-slate-600 hover:bg-slate-50"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLine(line.productId, line.variantId)}
                    className="ml-auto text-sm text-red-600 hover:underline"
                  >
                    Kaldır
                  </button>
                </div>
              </div>
              <p className="font-semibold text-slate-900 shrink-0">
                {formatTry(line.unitPrice * line.quantity)}
              </p>
            </div>
          ))}
        </div>
        <div>
          {/* Kupon: checkout API hazır olunca bağlanacak */}
          <div className="mb-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
            Kupon kodu ödeme adımında uygulanabilir (API entegrasyonu bekleniyor).
          </div>
          <CartSummary checkoutUrl={storeLink('/store/odeme')} />
        </div>
      </div>
    </div>
  );
}
