import React from 'react';

const AbandonedCarts: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Terk Edilmiş Sepetler</h1>
        <p className="text-gray-600 mt-2">Terk edilmiş sepetleri kurtarın ve müşterileri yeniden kazanın</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Terk Edilmiş Sepetler</h3>
          <p className="text-gray-600 mb-4">Bu sayfa terk edilmiş sepetleri gösterir</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Terk Edilmiş</h4>
              <p className="text-2xl font-bold text-orange-600">0</p>
              <p className="text-sm text-gray-600">Toplam sepet</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Kurtarılan</h4>
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-600">Başarılı kurtarma</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Potansiyel</h4>
              <p className="text-2xl font-bold text-blue-600">₺0</p>
              <p className="text-sm text-gray-600">Kayıp ciro</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbandonedCarts;
