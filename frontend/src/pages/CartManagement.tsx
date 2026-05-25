import React from 'react';

const CartManagement: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sepet Yönetimi</h1>
        <p className="text-gray-600 mt-2">Müşteri sepetlerini görüntüleyin ve yönetin</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 002 0v-4a2 2 0 00-2-2H5m0 0a2 2 0 00-2 0v4a2 2 0 002 0h2.586a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H17" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sepet Yönetimi</h3>
          <p className="text-gray-600 mb-4">Bu sayfa aktif sepetleri gösterir</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Aktif Sepetler</h4>
              <p className="text-2xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-600">Mevcut sepetler</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Terk Edilmiş</h4>
              <p className="text-2xl font-bold text-orange-600">0</p>
              <p className="text-sm text-gray-600">Terk edilmiş sepetler</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Toplam Değer</h4>
              <p className="text-2xl font-bold text-green-600">₺0</p>
              <p className="text-sm text-gray-600">Sepet toplamı</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartManagement;
