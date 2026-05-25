import React from 'react';
import { X, DollarSign, Package } from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onPriceUpdate: () => void;
  onStockUpdate: () => void;
}

const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  onClearSelection,
  onPriceUpdate,
  onStockUpdate,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4">
        {/* Selected Count */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
            {selectedCount}
          </div>
          <span className="text-sm font-medium">
            ürün seçildi
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-700" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPriceUpdate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium"
          >
            <DollarSign className="w-4 h-4" />
            Fiyat Güncelle
          </button>

          <button
            onClick={onStockUpdate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm font-medium"
          >
            <Package className="w-4 h-4" />
            Stok Güncelle
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-700" />

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 rounded-lg transition-colors text-sm"
        >
          <X className="w-4 h-4" />
          Temizle
        </button>
      </div>
    </div>
  );
};

export default BulkActionsToolbar;
