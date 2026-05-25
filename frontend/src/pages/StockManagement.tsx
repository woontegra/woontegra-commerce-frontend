import { useState } from 'react';
import type { Stock } from '../types/stock';
import { stockManagementService } from '../services/stockManagement.service';
import StockBadge from '../components/stock/StockBadge';
import StockUpdateForm from '../components/stock/StockUpdateForm';
import Button from '../components/ui/Button';

export default function StockManagement() {
  const [stocks, setStocks] = useState<Stock[]>([
    {
      id: 'stock-1',
      productId: 'prod-1',
      sku: 'TSHIRT-001',
      quantity: 50,
      reservedQuantity: 5,
      availableQuantity: 45,
      lowStockThreshold: 10,
      status: 'in_stock',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stock-2',
      productId: 'prod-2',
      sku: 'PANTS-001',
      quantity: 8,
      reservedQuantity: 2,
      availableQuantity: 6,
      lowStockThreshold: 10,
      status: 'low_stock',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stock-3',
      productId: 'prod-3',
      sku: 'SHOES-001',
      quantity: 3,
      reservedQuantity: 3,
      availableQuantity: 0,
      lowStockThreshold: 5,
      status: 'out_of_stock',
      updatedAt: new Date().toISOString(),
    },
  ]);

  const [editingStock, setEditingStock] = useState<Stock | null>(null);

  const handleStockUpdate = (updatedStock: Stock) => {
    setStocks(stocks.map(s => s.id === updatedStock.id ? updatedStock : s));
    setEditingStock(null);
  };

  const lowStockCount = stockManagementService.getLowStockProducts(stocks).length;
  const outOfStockCount = stockManagementService.getOutOfStockProducts(stocks).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Stok Yönetimi
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ürün stoklarını yönetin ve takip edin
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="stat-label">Toplam Ürün</p>
          <p className="stat-value">{stocks.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Stokta</p>
          <p className="stat-value text-green-600">{stocks.filter(s => s.status === 'in_stock').length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Düşük Stok</p>
          <p className="stat-value text-yellow-600">{lowStockCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Tükendi</p>
          <p className="stat-value text-red-600">{outOfStockCount}</p>
        </div>
      </div>

      {/* Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="space-y-3">
          {lowStockCount > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    {lowStockCount} ürün düşük stokta
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Stok yenilemesi yapmanız önerilir
                  </p>
                </div>
              </div>
            </div>
          )}

          {outOfStockCount > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium text-red-900 dark:text-red-100">
                    {outOfStockCount} ürün stokta yok
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Bu ürünler satışa kapalı
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stock Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left table-header">SKU</th>
                <th className="px-4 py-3 text-left table-header">Durum</th>
                <th className="px-4 py-3 text-right table-header">Toplam Stok</th>
                <th className="px-4 py-3 text-right table-header">Rezerve</th>
                <th className="px-4 py-3 text-right table-header">Kullanılabilir</th>
                <th className="px-4 py-3 text-right table-header">Eşik</th>
                <th className="px-4 py-3 text-right table-header">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {stocks.map((stock) => (
                <tr key={stock.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 table-cell font-medium">{stock.sku}</td>
                  <td className="px-4 py-3">
                    <StockBadge stock={stock} />
                  </td>
                  <td className="px-4 py-3 text-right table-cell font-semibold">{stock.quantity}</td>
                  <td className="px-4 py-3 text-right table-cell text-yellow-600 dark:text-yellow-400">
                    {stock.reservedQuantity}
                  </td>
                  <td className="px-4 py-3 text-right table-cell font-semibold text-green-600 dark:text-green-400">
                    {stock.availableQuantity}
                  </td>
                  <td className="px-4 py-3 text-right table-cell text-gray-500">
                    {stock.lowStockThreshold}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingStock(stock)}
                    >
                      Güncelle
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Modal */}
      {editingStock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Stok Güncelle - {editingStock.sku}
            </h3>
            <StockUpdateForm
              stock={editingStock}
              onUpdate={handleStockUpdate}
              onCancel={() => setEditingStock(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
