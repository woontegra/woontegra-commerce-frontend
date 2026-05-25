import type { Cart } from '../../types/cart';

interface CartSummaryProps {
  cart: Cart;
}

export default function CartSummary({ cart }: CartSummaryProps) {
  const { subtotal, discountBreakdown, shipping, total } = cart;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Sipariş Özeti
      </h3>

      {/* Subtotal */}
      <div className="flex justify-between text-gray-600 dark:text-gray-400">
        <span>Ara Toplam</span>
        <span>₺{subtotal.toFixed(2)}</span>
      </div>

      {/* Campaign Discount */}
      {discountBreakdown.campaignDiscount > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-green-600 dark:text-green-400">
            <span>Kampanya İndirimi</span>
            <span>-₺{discountBreakdown.campaignDiscount.toFixed(2)}</span>
          </div>
          {discountBreakdown.appliedCampaigns.map((campaign) => (
            <div key={campaign.id} className="flex justify-between text-sm text-gray-500 dark:text-gray-400 pl-4">
              <span>• {campaign.name}</span>
              <span>-₺{campaign.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Coupon Discount */}
      {discountBreakdown.couponDiscount > 0 && discountBreakdown.appliedCoupon && (
        <div className="flex justify-between text-green-600 dark:text-green-400">
          <span>Kupon ({discountBreakdown.appliedCoupon.code})</span>
          <span>-₺{discountBreakdown.couponDiscount.toFixed(2)}</span>
        </div>
      )}

      {/* Total Discount */}
      {discountBreakdown.discountTotal > 0 && (
        <div className="flex justify-between font-medium text-green-600 dark:text-green-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span>Toplam İndirim</span>
          <span>-₺{discountBreakdown.discountTotal.toFixed(2)}</span>
        </div>
      )}

      {/* Shipping */}
      <div className="flex justify-between text-gray-600 dark:text-gray-400">
        <div className="flex flex-col">
          <span>Kargo</span>
          {shipping.method === 'free' && (
            <span className="text-xs text-green-600 dark:text-green-400">Ücretsiz Kargo</span>
          )}
          {shipping.method === 'express' && (
            <span className="text-xs text-blue-600 dark:text-blue-400">Hızlı Kargo (1 gün)</span>
          )}
          {shipping.method === 'standard' && shipping.freeShippingThreshold && subtotal < shipping.freeShippingThreshold && (
            <span className="text-xs text-gray-500">
              ₺{(shipping.freeShippingThreshold - subtotal).toFixed(2)} daha alışveriş yapın, kargo ücretsiz!
            </span>
          )}
        </div>
        <span className={shipping.cost === 0 ? 'text-green-600 dark:text-green-400' : ''}>
          {shipping.cost === 0 ? 'Ücretsiz' : `₺${shipping.cost.toFixed(2)}`}
        </span>
      </div>

      {/* Total */}
      <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white pt-4 border-t-2 border-gray-300 dark:border-gray-600">
        <span>Genel Toplam</span>
        <span>₺{total.toFixed(2)}</span>
      </div>

      {/* Savings Badge */}
      {discountBreakdown.discountTotal > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
          <p className="text-sm text-green-700 dark:text-green-400">
            🎉 Bu siparişte <strong>₺{discountBreakdown.discountTotal.toFixed(2)}</strong> tasarruf ediyorsunuz!
          </p>
        </div>
      )}
    </div>
  );
}
