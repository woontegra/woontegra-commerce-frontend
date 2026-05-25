import { useState } from 'react';
import type { Coupon } from '../../types/coupon';
import { couponValidationService } from '../../services/couponValidation.service';
import toast from 'react-hot-toast';

interface CouponInputProps {
  onApply: (coupon: Coupon) => void;
  onRemove: () => void;
  appliedCoupon?: { code: string; amount: number };
  cart: any;
  user?: any;
}

export default function CouponInput({ onApply, onRemove, appliedCoupon, cart, user }: CouponInputProps) {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleApply = async () => {
    if (!code.trim()) {
      toast.error('Lütfen kupon kodu girin');
      return;
    }

    // Validate code format
    if (!couponValidationService.isValidCouponCode(code.toUpperCase())) {
      toast.error('Geçersiz kupon kodu formatı');
      return;
    }

    setIsValidating(true);

    try {
      // In production, fetch coupon from API
      // const response = await api.get(`/coupons/${code}`);
      // const coupon = response.data;

      // Mock coupon for demo
      const mockCoupon: Coupon = {
        id: 'coupon-1',
        code: code.toUpperCase(),
        type: 'percentage',
        value: 10,
        minCartTotal: 100,
        maxUsage: 100,
        usedCount: 5,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Validate coupon
      const validation = couponValidationService.validateCoupon(mockCoupon, cart, user);

      if (!validation.valid) {
        toast.error(validation.error || 'Kupon geçersiz');
        return;
      }

      // Apply coupon
      onApply(mockCoupon);
      toast.success(`✅ Kupon uygulandı! ₺${validation.discountAmount?.toFixed(2)} indirim`);
      setCode('');
    } catch (error) {
      toast.error('Kupon bulunamadı');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    onRemove();
    toast.success('Kupon kaldırıldı');
  };

  if (appliedCoupon) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">
                Kupon Uygulandı
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                {appliedCoupon.code} - ₺{appliedCoupon.amount.toFixed(2)} indirim
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
            title="Kuponu Kaldır"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Kupon Kodu
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyPress={(e) => e.key === 'Enter' && handleApply()}
          placeholder="KUPON KODU"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white uppercase"
          disabled={isValidating}
          maxLength={20}
        />
        <button
          onClick={handleApply}
          disabled={isValidating || !code.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {isValidating ? 'Kontrol Ediliyor...' : 'Uygula'}
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Kupon kodunuz varsa yukarıya girin
      </p>
    </div>
  );
}
