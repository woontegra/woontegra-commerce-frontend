import type { CartItem as CartItemType } from '../../types/cart';

interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

export default function CartItem({ item, onQuantityChange, onRemove }: CartItemProps) {
  const hasDiscount = item.finalPrice < item.basePrice;
  const discountPercentage = hasDiscount
    ? Math.round(((item.basePrice - item.finalPrice) / item.basePrice) * 100)
    : 0;

  return (
    <div className="flex gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
      {/* Image */}
      <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
        {item.productImage ? (
          <img
            src={item.productImage}
            alt={item.productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
          {item.productName}
        </h4>

        {/* Variant Options */}
        {item.variantOptions && Object.keys(item.variantOptions).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {Object.entries(item.variantOptions).map(([key, value]) => (
              <span
                key={key}
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
              >
                {key}: {value}
              </span>
            ))}
          </div>
        )}

        {/* SKU */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          SKU: {item.sku}
        </p>

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          {hasDiscount ? (
            <>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                ₺{item.finalPrice.toFixed(2)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                ₺{item.basePrice.toFixed(2)}
              </span>
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded-full">
                %{discountPercentage} İndirim
              </span>
            </>
          ) : (
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              ₺{item.basePrice.toFixed(2)}
            </span>
          )}
        </div>

        {/* Quantity & Remove */}
        <div className="flex items-center gap-3">
          {/* Quantity Selector */}
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
            <button
              onClick={() => onQuantityChange(item.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              -
            </button>
            <input
              type="number"
              value={item.quantity}
              onChange={(e) => onQuantityChange(item.id, parseInt(e.target.value) || 1)}
              className="w-12 text-center border-x border-gray-300 dark:border-gray-600 bg-transparent"
              min="1"
              max={item.stock}
            />
            <button
              onClick={() => onQuantityChange(item.id, item.quantity + 1)}
              disabled={item.quantity >= item.stock}
              className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>

          {/* Stock Info */}
          {item.stock <= 5 && (
            <span className="text-xs text-orange-600 dark:text-orange-400">
              Son {item.stock} ürün!
            </span>
          )}

          {/* Remove Button */}
          <button
            onClick={() => onRemove(item.id)}
            className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400 p-2"
            title="Sepetten Çıkar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Item Total */}
      <div className="text-right">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Toplam</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          ₺{(item.finalPrice * item.quantity).toFixed(2)}
        </p>
        {hasDiscount && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-through">
            ₺{(item.basePrice * item.quantity).toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
}
