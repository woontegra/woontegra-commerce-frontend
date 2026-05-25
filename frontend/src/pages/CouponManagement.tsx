import { useState } from 'react';
import type { Coupon } from '../types/coupon';
import CouponForm from '../components/coupon/CouponForm';
import Button from '../components/ui/Button';

export default function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const handleSubmit = async (coupon: Coupon) => {
    if (editingCoupon) {
      setCoupons(coupons.map(c => c.id === coupon.id ? coupon : c));
    } else {
      setCoupons([...coupons, coupon]);
    }
    setShowForm(false);
    setEditingCoupon(null);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bu kuponu silmek istediğinizden emin misiniz?')) {
      setCoupons(coupons.filter(c => c.id !== id));
    }
  };

  const toggleActive = (id: string) => {
    setCoupons(coupons.map(c => 
      c.id === id ? { ...c, active: !c.active } : c
    ));
  };

  const getUsagePercentage = (coupon: Coupon): number => {
    if (!coupon.maxUsage) return 0;
    return (coupon.usedCount / coupon.maxUsage) * 100;
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowForm(false);
              setEditingCoupon(null);
            }}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {editingCoupon ? 'Kuponu Düzenle' : 'Yeni Kupon'}
          </h1>
        </div>

        <CouponForm
          initialData={editingCoupon || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingCoupon(null);
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
            Kupon Yönetimi
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            İndirim kuponlarınızı yönetin
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          Yeni Kupon
        </Button>
      </div>

      {/* Coupons List */}
      {coupons.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Henüz kupon oluşturulmadı
          </p>
          <Button onClick={() => setShowForm(true)}>
            İlk Kuponu Oluştur
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold font-mono text-gray-900 dark:text-white">
                      {coupon.code}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      coupon.active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {coupon.active ? 'Aktif' : 'Pasif'}
                    </span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-sm font-semibold">
                      {coupon.type === 'percentage' ? `%${coupon.value}` : `₺${coupon.value}`}
                    </span>
                  </div>
                  {coupon.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {coupon.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
                    {coupon.minCartTotal && (
                      <span>Min. Sepet: ₺{coupon.minCartTotal}</span>
                    )}
                    {coupon.maxDiscountAmount && (
                      <span>• Max. İndirim: ₺{coupon.maxDiscountAmount}</span>
                    )}
                    <span>• {new Date(coupon.startDate).toLocaleDateString('tr-TR')} - {new Date(coupon.endDate).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(coupon.id)}
                    className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    title={coupon.active ? 'Pasif yap' : 'Aktif yap'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEdit(coupon)}
                    className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    title="Düzenle"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(coupon.id)}
                    className="p-2 text-red-600 hover:text-red-700 dark:text-red-400"
                    title="Sil"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Kullanım
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {coupon.usedCount} {coupon.maxUsage ? `/ ${coupon.maxUsage}` : ''}
                  </span>
                </div>
                {coupon.maxUsage && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(getUsagePercentage(coupon), 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
