import React from 'react';

const DiscountRules: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">İndirim Kuralları</h1>
        <p className="text-gray-600 mt-2">Otomatik indirim kuralları oluşturun ve yönetin</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">İndirim Kuralları</h3>
          <p className="text-gray-600 mb-4">Bu sayfa indirim kurallarını yönetir</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Aktif Kurallar</h4>
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-600">Aktif indirim</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Planlanmış</h4>
              <p className="text-2xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-600">Planlanmış indirim</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Toplam Tasarruf</h4>
              <p className="text-2xl font-bold text-purple-600">₺0</p>
              <p className="text-sm text-gray-600">Müşteri tasarrufu</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountRules;
