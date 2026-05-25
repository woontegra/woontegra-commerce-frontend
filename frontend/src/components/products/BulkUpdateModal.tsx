import React, { useState } from 'react';
import { X, DollarSign, Package, AlertCircle } from 'lucide-react';

interface BulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onUpdate: (type: 'price' | 'stock', action: string, value: number) => Promise<void>;
}

type UpdateType = 'price' | 'stock';
type PriceAction = 'set' | 'increase' | 'decrease' | 'percentage_increase' | 'percentage_decrease';
type StockAction = 'set' | 'increase' | 'decrease';

const BulkUpdateModal: React.FC<BulkUpdateModalProps> = ({
  isOpen,
  onClose,
  selectedCount,
  onUpdate,
}) => {
  const [updateType, setUpdateType] = useState<UpdateType>('price');
  const [priceAction, setPriceAction] = useState<PriceAction>('set');
  const [stockAction, setStockAction] = useState<StockAction>('set');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!value || parseFloat(value) < 0) {
      setError('Lütfen geçerli bir değer girin');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const action = updateType === 'price' ? priceAction : stockAction;
      await onUpdate(updateType, action, parseFloat(value));
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Güncelleme başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUpdateType('price');
    setPriceAction('set');
    setStockAction('set');
    setValue('');
    setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const getActionLabel = () => {
    if (updateType === 'price') {
      switch (priceAction) {
        case 'set': return 'Fiyatı şu değere ayarla:';
        case 'increase': return 'Fiyatı şu kadar artır:';
        case 'decrease': return 'Fiyatı şu kadar azalt:';
        case 'percentage_increase': return 'Fiyatı yüzde kadar artır:';
        case 'percentage_decrease': return 'Fiyatı yüzde kadar azalt:';
        default: return 'Değer:';
      }
    } else {
      switch (stockAction) {
        case 'set': return 'Stok miktarını şu değere ayarla:';
        case 'increase': return 'Stok miktarını şu kadar artır:';
        case 'decrease': return 'Stok miktarını şu kadar azalt:';
        default: return 'Değer:';
      }
    }
  };

  const getValueSuffix = () => {
    if (updateType === 'price') {
      if (priceAction === 'percentage_increase' || priceAction === 'percentage_decrease') {
        return '%';
      }
      return '₺';
    }
    return 'adet';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Toplu Güncelleme
            </h3>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Selected Count */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>{selectedCount}</strong> ürün seçildi
              </p>
            </div>

            {/* Update Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Güncelleme Tipi
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUpdateType('price')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                    updateType === 'price'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <DollarSign className="w-5 h-5" />
                  <span className="font-medium">Fiyat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUpdateType('stock')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                    updateType === 'stock'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Package className="w-5 h-5" />
                  <span className="font-medium">Stok</span>
                </button>
              </div>
            </div>

            {/* Action Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İşlem
              </label>
              {updateType === 'price' ? (
                <select
                  value={priceAction}
                  onChange={(e) => setPriceAction(e.target.value as PriceAction)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="set">Fiyatı Ayarla</option>
                  <option value="increase">Fiyatı Artır (Sabit)</option>
                  <option value="decrease">Fiyatı Azalt (Sabit)</option>
                  <option value="percentage_increase">Fiyatı Artır (%)</option>
                  <option value="percentage_decrease">Fiyatı Azalt (%)</option>
                </select>
              ) : (
                <select
                  value={stockAction}
                  onChange={(e) => setStockAction(e.target.value as StockAction)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="set">Stok Miktarını Ayarla</option>
                  <option value="increase">Stok Miktarını Artır</option>
                  <option value="decrease">Stok Miktarını Azalt</option>
                </select>
              )}
            </div>

            {/* Value Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {getActionLabel()}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  required
                  className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">{getValueSuffix()}</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading || !value}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Güncelleniyor...
                  </>
                ) : (
                  'Güncelle'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BulkUpdateModal;
