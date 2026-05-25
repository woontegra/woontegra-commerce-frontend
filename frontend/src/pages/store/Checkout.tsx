import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Input, Button, Card, Badge } from '../../components/ui';
import api from '../../services/api';
import type { ShippingMethod } from '../../types';

interface CheckoutForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  notes: string;
}

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<CheckoutForm>>({});
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [formData, setFormData] = useState<CheckoutForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    notes: '',
  });

  useEffect(() => {
    const fetchShippingMethods = async () => {
      try {
        const response = await api.get('/shipping');
        setShippingMethods(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedShipping(response.data.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch shipping methods:', error);
      }
    };
    fetchShippingMethods();
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Lütfen bir kupon kodu girin');
      return;
    }

    setValidatingCoupon(true);
    setCouponError('');

    try {
      const response = await api.post('/coupons/validate', {
        code: couponCode,
        orderAmount: total,
      });

      setAppliedCoupon(response.data.data);
      setCouponError('');
    } catch (error: any) {
      setCouponError(error.response?.data?.error || 'Geçersiz kupon kodu');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CheckoutForm> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'Ad gerekli';
    if (!formData.lastName.trim()) newErrors.lastName = 'Soyad gerekli';
    if (!formData.email.trim()) newErrors.email = 'E-posta gerekli';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta girin';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Telefon gerekli';
    if (!formData.address.trim()) newErrors.address = 'Adres gerekli';
    if (!formData.city.trim()) newErrors.city = 'Şehir gerekli';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'Posta kodu gerekli';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (items.length === 0) {
      alert('Sepetiniz boş');
      return;
    }

    setLoading(true);
    try {
      // 1. Create customer
      const customerResponse = await api.post('/customers', {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        zipCode: formData.zipCode,
      });

      // 2. Create order
      const orderResponse = await api.post('/orders', {
        customerId: customerResponse.data.data.id,
        notes: formData.notes,
        items: items.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      const orderId = orderResponse.data.data.id;

      // Calculate final total with shipping
      const shippingPrice = selectedShipping
        ? shippingMethods.find(m => m.id === selectedShipping)?.price || 0
        : 0;
      const discountAmount = appliedCoupon ? parseFloat(appliedCoupon.discountAmount) : 0;
      const finalTotal = total + shippingPrice - discountAmount;

      // 3. Process payment
      const paymentResponse = await api.post('/payments/process', {
        orderId,
        amount: finalTotal,
        currency: 'USD',
        // For Stripe: paymentMethodId would come from Stripe Elements
        // For iyzico: cardDetails would be collected from form
        paymentMethodId: 'pm_card_visa', // Mock for now - replace with real payment method
      });

      if (paymentResponse.data.status === 'success') {
        clearCart();
        alert('\u00d6demeniz başarıyla alındı! Siparişiniz hazırlanıyor.');
        navigate('/');
      } else {
        throw new Error('Payment failed');
      }
    } catch (error: any) {
      console.error('Checkout failed:', error);
      const errorMessage = error.response?.data?.error || 'Ödeme işlemi başarısız oldu. Lütfen tekrar deneyin.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof CheckoutForm]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="text-center max-w-md">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sepetiniz Boş</h2>
          <p className="text-gray-600 mb-4">Alışverişe başlamak için ürünleri keşfedin</p>
          <Button onClick={() => navigate('/products')}>Ürünlere Git</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Ödeme</h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Teslimat Bilgileri</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Ad *"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    error={errors.firstName}
                    placeholder="Adınız"
                  />
                  <Input
                    label="Soyad *"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    error={errors.lastName}
                    placeholder="Soyadınız"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="E-posta *"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    placeholder="ornek@email.com"
                  />
                  <Input
                    label="Telefon *"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    placeholder="0555 123 45 67"
                  />
                </div>

                <Input
                  label="Adres *"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  error={errors.address}
                  placeholder="Tam adresiniz"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Şehir *"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    error={errors.city}
                    placeholder="İstanbul"
                  />
                  <Input
                    label="Posta Kodu *"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    error={errors.zipCode}
                    placeholder="34000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sipariş Notu (Opsiyonel)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Özel talepleriniz..."
                  />
                </div>
              </div>
            </Card>

            {/* Shipping Method Selection */}
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Kargo Seçimi</h2>
              <div className="space-y-3">
                {shippingMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedShipping === method.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        value={method.id}
                        checked={selectedShipping === method.id}
                        onChange={(e) => setSelectedShipping(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{method.name}</div>
                        {method.description && (
                          <div className="text-sm text-gray-600">{method.description}</div>
                        )}
                        {method.estimatedDays && (
                          <div className="text-xs text-gray-500 mt-1">
                            Tahmini {method.estimatedDays} iş günü
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="font-bold text-gray-900">
                      {method.price === 0 ? (
                        <Badge variant="success" size="sm">Ücretsiz</Badge>
                      ) : (
                        `$${method.price.toFixed(2)}`
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </Card>

            {/* Coupon Code */}
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4">İndirim Kuponu</h2>
              {!appliedCoupon ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Kupon kodunu girin"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError('');
                      }}
                      error={couponError}
                      fullWidth={false}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                    >
                      {validatingCoupon ? 'Kontrol ediliyor...' : 'Uygula'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Uygulandı</Badge>
                        <span className="font-bold text-gray-900">{appliedCoupon.coupon.code}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        İndirim: ${appliedCoupon.discountAmount}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card variant="elevated" className="sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Sipariş Özeti</h2>
              
              <div className="space-y-3 mb-4 pb-4 border-b">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                      <p className="text-xs text-gray-600">Adet: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Ara Toplam</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Kargo</span>
                  <span>
                    {selectedShipping && shippingMethods.find(m => m.id === selectedShipping)?.price === 0 ? (
                      <span className="text-green-600">Ücretsiz</span>
                    ) : (
                      formatPrice(shippingMethods.find(m => m.id === selectedShipping)?.price || 0)
                    )}
                  </span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>İndirim ({appliedCoupon.coupon.code})</span>
                    <span>-${appliedCoupon.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                  <span>Toplam</span>
                  <span>
                    {formatPrice(
                      total + 
                      (shippingMethods.find(m => m.id === selectedShipping)?.price || 0) - 
                      (appliedCoupon ? parseFloat(appliedCoupon.discountAmount) : 0)
                    )}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                fullWidth
                disabled={loading}
                className="mt-6"
              >
                {loading ? 'İşleniyor...' : 'Siparişi Tamamla'}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Siparişinizi tamamlayarak <a href="#" className="text-blue-600 hover:underline">kullanım koşullarını</a> kabul etmiş olursunuz.
              </p>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
