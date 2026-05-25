import React, { useState, useEffect } from 'react';
import { Shield, Check, AlertTriangle, TrendingUp, Zap } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  limits: {
    products: number | 'unlimited';
    variants: number | 'unlimited';
    storage: number;
    users: number;
    api: boolean;
    analytics: boolean;
    integrations: boolean;
  };
}

const PlanUpgrade: React.FC = () => {
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchPlansAndPaymentMethods();
  }, []);

  const fetchPlansAndPaymentMethods = async () => {
    try {
      // Fetch current plan
      const planResponse = await fetch('/api/subscription/current');
      const planData = await planResponse.json();
      
      if (planData.status === 'success') {
        setCurrentPlan(planData.data);
      }

      // Fetch available plans
      const plansResponse = await fetch('/api/subscription/plans');
      const plansData = await plansResponse.json();
      
      if (plansData.status === 'success') {
        setPlans(plansData.data);
      }

      // Fetch payment methods
      const paymentResponse = await fetch('/api/payment/methods');
      const paymentData = await paymentResponse.json();
      
      if (paymentData.status === 'success') {
        setPaymentMethods(paymentData.paymentMethods);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setError(null);
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) {
      setError('Lütfen bir plan seçin');
      return;
    }

    setProcessingPayment(true);
    setError(null);

    try {
      const response = await fetch('/api/payment/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle,
          paymentMethodId: paymentMethods[0]?.id
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        // Redirect to plan status after successful upgrade
        setTimeout(() => {
          window.location.href = '/plan-status';
        }, 2000);
      } else {
        setError(data.error || 'Ödeme başarısız');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      setError('Ödeme işlemi başarısız');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case 'starter':
        return <Shield className="w-8 h-8 text-blue-500" />;
      case 'pro':
        return <Zap className="w-8 h-8 text-purple-500" />;
      case 'advanced':
        return <TrendingUp className="w-8 h-8 text-yellow-500" />;
      default:
        return <Shield className="w-8 h-8 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Plan Yükseltme Başarılı!</h2>
          <p className="text-gray-600 mb-4">
            {selectedPlan?.name} planına başarıyla geçiş yapılıyor...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Current Plan */}
        {currentPlan && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Mevcut Planınız</h2>
            <div className="flex items-center gap-4 mb-6">
              {getPlanIcon(currentPlan.slug)}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{currentPlan.name}</h3>
                <p className="text-sm text-gray-600">
                  ₺{currentPlan.price}/{currentPlan.interval === 'monthly' ? 'ay' : 'yıl'}
                </p>
              </div>
              <div className="text-right">
                <button
                  onClick={() => window.location.href = '/plan-status'}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Plan Durumu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Plan Selection */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Plan Yükseltme</h2>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-red-800 font-medium">{error}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => handlePlanSelect(plan)}
                className={`relative bg-white rounded-lg shadow-sm p-6 border-2 cursor-pointer transition-all duration-200 ${
                  selectedPlan?.id === plan.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                }`}
              >
                <div className="text-center mb-4">
                  {getPlanIcon(plan.slug)}
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h3>
                
                <div className="text-center mb-4">
                  <div className="flex items-baseline justify-center">
                    <span className="text-2xl font-bold text-gray-900">₺{plan.price}</span>
                    <span className="text-gray-600 ml-1">/ay</span>
                  </div>
                  
                  {billingCycle === 'yearly' && (
                    <div className="text-sm text-green-600 font-medium">
                      Yıllık: ₺{(plan.price * 12 * 0.9).toFixed(0)} 
                      <span className="text-gray-400 line-through ml-2">₺{plan.price * 12}</span>
                      <span className="text-green-600 ml-1">(%20 indirim)</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-5 h-5 text-green-500 flex-shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span>Ürünler:</span>
                      <span className="font-medium">
                        {plan.limits.products === 'unlimited' ? 'Sınırsız' : plan.limits.products}
                      </span>
                    </div>
                    <div>
                      <span>Varyantlar:</span>
                      <span className="font-medium">
                        {plan.limits.variants === 'unlimited' ? 'Sınırsız' : plan.limits.variants}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Billing Cycle Selection */}
          {selectedPlan && (
            <div className="mt-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Faturalama Dönemi</h3>
                
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      billingCycle === 'monthly'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Aylık
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      billingCycle === 'yearly'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Yıllık
                    {billingCycle === 'yearly' && (
                      <span className="ml-2 text-green-600 font-medium">(%20 indirim)</span>
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    ₺{selectedPlan.price * (billingCycle === 'yearly' ? 12 * 0.9 : 1)}
                  </p>
                  <p className="text-sm text-gray-600">
                    /{billingCycle === 'yearly' ? 'yıl' : 'ay'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method Selection */}
          {selectedPlan && paymentMethods.length > 0 && (
            <div className="mt-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ödeme Yöntemi</h3>
                
                <div className="space-y-3">
                  {paymentMethods.map((method, index) => (
                    <label key={method.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={index === 0}
                        onChange={() => {}}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {method.type === 'credit_card' && 'Kredi Kartı'}
                          {method.type === 'bank_transfer' && 'Havale'}
                          {method.type === 'iyzico' && 'İyzico'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {method.provider?.toUpperCase()}
                          {method.lastFour && `****${method.lastFour}`}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Upgrade Button */}
          {selectedPlan && (
            <div className="mt-8">
              <button
                onClick={handleUpgrade}
                disabled={processingPayment}
                className="w-full bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    <span>İşleniyor...</span>
                  </>
                ) : (
                  <>
                    Plan Yükselt
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanUpgrade;
