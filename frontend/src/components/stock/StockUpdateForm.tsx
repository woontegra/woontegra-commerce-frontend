import { useState } from 'react';
import type { Stock } from '../../types/stock';
import { stockManagementService } from '../../services/stockManagement.service';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface StockUpdateFormProps {
  stock: Stock;
  onUpdate: (updatedStock: Stock) => void;
  onCancel: () => void;
}

export default function StockUpdateForm({ stock, onUpdate, onCancel }: StockUpdateFormProps) {
  const [quantity, setQuantity] = useState(stock.quantity);
  const [reason, setReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error('Lütfen güncelleme sebebini girin');
      return;
    }

    if (quantity < stock.reservedQuantity) {
      toast.error(`Rezerve edilen miktardan (${stock.reservedQuantity}) az olamaz`);
      return;
    }

    setIsUpdating(true);

    try {
      const updatedStock = await stockManagementService.updateStock(
        stock,
        quantity,
        reason,
        'admin'
      );

      onUpdate(updatedStock);
      toast.success('Stok başarıyla güncellendi');
    } catch (error: any) {
      toast.error(error.message || 'Stok güncellenemedi');
    } finally {
      setIsUpdating(false);
    }
  };

  const quantityChange = quantity - stock.quantity;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Mevcut Stok:</span>
          <span className="font-medium text-gray-900 dark:text-white">{stock.quantity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Rezerve:</span>
          <span className="font-medium text-yellow-600 dark:text-yellow-400">{stock.reservedQuantity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Kullanılabilir:</span>
          <span className="font-medium text-green-600 dark:text-green-400">{stock.availableQuantity}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Yeni Stok Miktarı
        </label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
          min={stock.reservedQuantity}
          className="input-standard w-full"
        />
        {quantityChange !== 0 && (
          <p className={`text-xs mt-1 ${quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {quantityChange > 0 ? '+' : ''}{quantityChange} değişiklik
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Güncelleme Sebebi <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="input-standard w-full"
          placeholder="Örn: Yeni ürün girişi, sayım düzeltmesi..."
        />
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          İptal
        </Button>
        <Button type="submit" disabled={isUpdating || quantityChange === 0} className="flex-1">
          {isUpdating ? 'Güncelleniyor...' : 'Stoku Güncelle'}
        </Button>
      </div>
    </form>
  );
}
