import React from 'react';
import { Link } from 'react-router-dom';

const StoreSettings: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mağaza Ayarları</h1>
        <p className="text-gray-600 mt-2">Mağazanızın temel ayarlarını yapılandırın</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Mağaza Ayarları</h3>
          <p className="text-gray-600 mb-4">Bu sayfa mağaza ayarlarını yönetir</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Mağaza Bilgileri</h4>
              <p className="text-sm text-gray-600">İsim, logo, iletişim</p>
            </div>
            <Link
              to="/dashboard/settings/payments"
              className="bg-gray-50 rounded-lg p-4 block hover:bg-indigo-50 hover:ring-1 hover:ring-indigo-200 transition"
            >
              <h4 className="font-medium text-gray-900 mb-2">Ödeme Ayarları</h4>
              <p className="text-sm text-gray-600">PayTR, havale, kapıda ödeme</p>
            </Link>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Kargo Ayarları</h4>
              <p className="text-sm text-gray-600">Kargo firmaları, ücretler</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Vergi Ayarları</h4>
              <p className="text-sm text-gray-600">KDV, vergi oranları</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreSettings;
