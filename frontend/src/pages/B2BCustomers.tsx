import React from 'react';

const B2BCustomers: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">B2B Müşteriler</h1>
        <p className="text-gray-600 mt-2">Kurumsal müşteri profillerini ve özel fiyatları yönetin</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">B2B Müşteriler</h3>
          <p className="text-gray-600 mb-4">Bu sayfa B2B müşterilerini yönetir</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Kurumsal Müşteriler</h4>
              <p className="text-2xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-600">Toplam B2B</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Onay Bekleyen</h4>
              <p className="text-2xl font-bold text-orange-600">0</p>
              <p className="text-sm text-gray-600">Onay sürecinde</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">B2B Ciro</h4>
              <p className="text-2xl font-bold text-green-600">₺0</p>
              <p className="text-sm text-gray-600">Kurumsal satış</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default B2BCustomers;
