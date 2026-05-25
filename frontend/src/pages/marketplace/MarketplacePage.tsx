import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface MarketplaceAccount {
  id: number;
  provider: string;
  sellerId: string;
  isActive: boolean;
  lastSyncAt?: string;
  createdAt: string;
}

interface SyncLog {
  id: number;
  marketplace: string;
  syncType: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

interface ProductMap {
  id: number;
  productId: string;
  marketplace: string;
  externalId: string;
  isActive: boolean;
  lastSyncAt?: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: string;
    isActive: boolean;
  };
}

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'products' | 'orders' | 'logs'>('accounts');
  const [loading, setLoading] = useState(false);
  
  // State for accounts
  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectForm, setConnectForm] = useState({
    provider: 'TRENDYOL',
    apiKey: '',
    apiSecret: '',
    sellerId: '',
  });

  // State for products
  const [productMaps, setProductMaps] = useState<ProductMap[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // State for logs
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    if (activeTab === 'accounts') {
      fetchAccounts();
    } else if (activeTab === 'products') {
      fetchProductMaps();
    } else if (activeTab === 'logs') {
      fetchSyncLogs();
    }
  }, [activeTab]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/marketplace/accounts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.data || []);
      } else {
        toast.error('Failed to fetch marketplace accounts');
      }
    } catch (error) {
      toast.error('Error fetching marketplace accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductMaps = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/marketplace/product-maps`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProductMaps(data.data?.productMaps || []);
      } else {
        toast.error('Failed to fetch product mappings');
      }
    } catch (error) {
      toast.error('Error fetching product mappings');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/marketplace/sync-logs`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSyncLogs(data.data?.logs || []);
      } else {
        toast.error('Failed to fetch sync logs');
      }
    } catch (error) {
      toast.error('Error fetching sync logs');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectMarketplace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/marketplace/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(connectForm),
      });
      
      if (response.ok) {
        toast.success('Marketplace connected successfully');
        setShowConnectModal(false);
        setConnectForm({
          provider: 'TRENDYOL',
          apiKey: '',
          apiSecret: '',
          sellerId: '',
        });
        fetchAccounts();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to connect marketplace');
      }
    } catch (error) {
      toast.error('Error connecting marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectMarketplace = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/marketplace/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ provider }),
      });
      
      if (response.ok) {
        toast.success('Marketplace disconnected successfully');
        fetchAccounts();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to disconnect marketplace');
      }
    } catch (error) {
      toast.error('Error disconnecting marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleExportProduct = async (productId: string, marketplace: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/marketplace/export-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ productId, marketplace }),
      });
      
      if (response.ok) {
        toast.success('Product export started');
        fetchProductMaps();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to export product');
      }
    } catch (error) {
      toast.error('Error exporting product');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSelectedProducts = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select products to export');
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/marketplace/export-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          productIds: selectedProducts,
          marketplace: 'TRENDYOL',
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Exported ${data.data.results.length} products successfully`);
        setSelectedProducts([]);
        fetchProductMaps();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to export products');
      }
    } catch (error) {
      toast.error('Error exporting products');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAllStockPrice = async (marketplace: string) => {
    if (!confirm(`Are you sure you want to update all stock and prices for ${marketplace}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/marketplace/update-all-stock-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ marketplace }),
      });
      
      if (response.ok) {
        toast.success('Stock and price update started');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update stock and price');
      }
    } catch (error) {
      toast.error('Error updating stock and price');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 bg-green-100';
      case 'FAILED':
        return 'text-red-600 bg-red-100';
      case 'PROCESSING':
        return 'text-blue-600 bg-blue-100';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Marketplace Integration
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your marketplace connections and sync operations
          </p>
        </div>
        <button
          onClick={() => setShowConnectModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Connect Marketplace
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'accounts', label: 'Accounts', icon: '🔗' },
            { id: 'products', label: 'Products', icon: '📦' },
            { id: 'orders', label: 'Orders', icon: '🛒' },
            { id: 'logs', label: 'Sync Logs', icon: '📋' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Connected Marketplaces
            </h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Loading...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔗</div>
                <p className="text-gray-600 dark:text-gray-400">
                  No marketplace accounts connected yet
                </p>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Connect Your First Marketplace
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {account.provider}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Seller ID: {account.sellerId}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Last Sync: {account.lastSyncAt 
                            ? new Date(account.lastSyncAt).toLocaleString()
                            : 'Never'
                          }
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          account.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {account.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => handleUpdateAllStockPrice(account.provider)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Sync All
                        </button>
                        <button
                          onClick={() => handleDisconnectMarketplace(account.provider)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Product Mappings
              </h2>
              {selectedProducts.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedProducts.length} selected
                  </span>
                  <button
                    onClick={handleExportSelectedProducts}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Export Selected
                  </button>
                </div>
              )}
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Loading...</p>
              </div>
            ) : productMaps.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📦</div>
                <p className="text-gray-600 dark:text-gray-400">
                  No products mapped to marketplaces yet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts(productMaps.map(map => map.productId));
                            } else {
                              setSelectedProducts([]);
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Marketplace
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        External ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {productMaps.map((map) => (
                      <tr key={map.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(map.productId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProducts([...selectedProducts, map.productId]);
                              } else {
                                setSelectedProducts(selectedProducts.filter(id => id !== map.productId));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {map.product.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {map.product.id}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {map.product.sku || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          ₺{map.product.price}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {map.marketplace}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {map.externalId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            map.product.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {map.product.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleExportProduct(map.productId, map.marketplace)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Export
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sync Logs
            </h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Loading...</p>
              </div>
            ) : syncLogs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-gray-600 dark:text-gray-400">
                  No sync logs available
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Marketplace
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {syncLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {log.marketplace}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {log.syncType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {log.errorMessage ? (
                            <span className="text-red-600">{log.errorMessage}</span>
                          ) : (
                            <span className="text-green-600">Success</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Connect Marketplace
            </h3>
            
            <form onSubmit={handleConnectMarketplace} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Marketplace Provider
                </label>
                <select
                  value={connectForm.provider}
                  onChange={(e) => setConnectForm({...connectForm, provider: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="TRENDYOL">Trendyol</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={connectForm.apiKey}
                  onChange={(e) => setConnectForm({...connectForm, apiKey: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Secret
                </label>
                <input
                  type="password"
                  value={connectForm.apiSecret}
                  onChange={(e) => setConnectForm({...connectForm, apiSecret: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Seller ID
                </label>
                <input
                  type="text"
                  value={connectForm.sellerId}
                  onChange={(e) => setConnectForm({...connectForm, sellerId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
