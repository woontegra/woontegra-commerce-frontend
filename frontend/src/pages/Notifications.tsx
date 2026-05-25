import React from 'react';

const Notifications: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bildirim Yönetimi</h1>
        <p className="text-gray-600 mt-2">Sistem bildirimlerini ve e-posta ayarlarını yönetin</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Bildirim Yönetimi</h3>
          <p className="text-gray-600 mb-4">Bu sayfa bildirimleri yönetir</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Okunmamış</h4>
              <p className="text-2xl font-bold text-red-600">0</p>
              <p className="text-sm text-gray-600">Yeni bildirim</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">E-posta Bildirimleri</h4>
              <p className="text-2xl font-bold text-blue-600">Aktif</p>
              <p className="text-sm text-gray-600">E-posta gönderimi</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Sistem Bildirimleri</h4>
              <p className="text-2xl font-bold text-green-600">Aktif</p>
              <p className="text-sm text-gray-600">Otomatik bildirimler</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
