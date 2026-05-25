import { useState } from 'react';
import type { ShippingMethod } from '../types/shipping';
import { defaultShippingMethods } from '../services/shippingCalculation.service';
import ShippingMethodForm from '../components/shipping/ShippingMethodForm';
import Button from '../components/ui/Button';

export default function ShippingManagement() {
  const [methods, setMethods] = useState<ShippingMethod[]>(defaultShippingMethods);
  const [showForm, setShowForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null);

  const handleSubmit = async (method: ShippingMethod) => {
    if (editingMethod) {
      setMethods(methods.map(m => m.id === method.id ? method : m));
    } else {
      setMethods([...methods, method]);
    }
    setShowForm(false);
    setEditingMethod(null);
  };

  const handleEdit = (method: ShippingMethod) => {
    setEditingMethod(method);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bu kargo yöntemini silmek istediğinizden emin misiniz?')) {
      setMethods(methods.filter(m => m.id !== id));
    }
  };

  const toggleActive = (id: string) => {
    setMethods(methods.map(m => 
      m.id === id ? { ...m, active: !m.active } : m
    ));
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowForm(false);
              setEditingMethod(null);
            }}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {editingMethod ? 'Kargo Yöntemini Düzenle' : 'Yeni Kargo Yöntemi'}
          </h1>
        </div>

        <ShippingMethodForm
          initialData={editingMethod || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingMethod(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Kargo Yönetimi
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kargo yöntemlerinizi ve fiyatlandırmanızı yönetin
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          Yeni Kargo Yöntemi
        </Button>
      </div>

      {/* Methods List */}
      <div className="grid gap-4">
        {methods.map((method) => (
          <div
            key={method.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {method.icon && <span className="text-2xl">{method.icon}</span>}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {method.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    method.active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {method.active ? 'Aktif' : 'Pasif'}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                    {method.priceType === 'fixed' && 'Sabit Fiyat'}
                    {method.priceType === 'dynamic' && 'Bölge Bazlı'}
                    {method.priceType === 'free' && 'Ücretsiz'}
                  </span>
                </div>
                {method.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {method.description}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleActive(method.id)}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  title={method.active ? 'Pasif yap' : 'Aktif yap'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleEdit(method)}
                  className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  title="Düzenle"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(method.id)}
                  className="p-2 text-red-600 hover:text-red-700 dark:text-red-400"
                  title="Sil"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Temel Fiyat</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {method.priceType === 'free' ? 'Ücretsiz' : `₺${method.basePrice.toFixed(2)}`}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Teslimat</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {method.minDeliveryDays === method.maxDeliveryDays 
                    ? `${method.minDeliveryDays} gün`
                    : `${method.minDeliveryDays}-${method.maxDeliveryDays} gün`
                  }
                </p>
              </div>

              {method.freeShippingThreshold && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ücretsiz Eşik</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    ₺{method.freeShippingThreshold.toFixed(2)}
                  </p>
                </div>
              )}

              {method.regions && method.regions.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Bölge Sayısı</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {method.regions.length}
                  </p>
                </div>
              )}
            </div>

            {/* Regions */}
            {method.regions && method.regions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bölgeler:</p>
                <div className="flex flex-wrap gap-2">
                  {method.regions.map((region) => (
                    <div
                      key={region.id}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">{region.name}</span>
                      <span className="text-gray-600 dark:text-gray-400 ml-2">₺{region.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
