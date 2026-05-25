import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Star, Zap, Crown, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

interface PlanLimits {
  products: number;
  variants: number;
  pageBuilder: boolean;
  blog: boolean;
  analytics: boolean;
  customDomain: boolean;
}

interface PlanData {
  key: string;
  name: string;
  prices: { MONTHLY: number; YEARLY: number };
  currency: string;
  popular?: boolean;
  features: string[];
  limits: PlanLimits;
}

type BillingCycle = 'MONTHLY' | 'YEARLY';

// ─── Checkout Modal ───────────────────────────────────────────────────────────
const CheckoutModal: React.FC<{
  checkoutHtml: string;
  onClose: () => void;
}> = ({ checkoutHtml, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !checkoutHtml) return;

    // iyzico'nun checkout formunu doğru şekilde enjekte et
    const container = containerRef.current;
    container.innerHTML = checkoutHtml;

    // Inline script'leri çalıştır
    const scripts = container.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value),
      );
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [checkoutHtml]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Güvenli Ödeme</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            256-bit SSL şifreleme ile güvende
          </div>
          <div ref={containerRef} id="iyzipay-checkout-form" className="responsive" />
        </div>
      </div>
    </div>
  );
};

// ─── PlanCard ─────────────────────────────────────────────────────────────────
const PlanCard: React.FC<{
  plan: PlanData;
  billingCycle: BillingCycle;
  currentPlanKey?: string;
  onSelect: (plan: PlanData) => void;
  loading: boolean;
  selectedPlanKey: string | null;
}> = ({ plan, billingCycle, currentPlanKey, onSelect, loading, selectedPlanKey }) => {
  const isCurrent   = currentPlanKey === plan.key;
  const isSelecting = loading && selectedPlanKey === plan.key;
  const price       = plan.prices[billingCycle];
  const isFree      = price === 0;

  const icons: Record<string, React.ReactNode> = {
    STARTER:    <Star className="w-7 h-7 text-blue-400" />,
    PRO:        <Zap className="w-7 h-7 text-purple-500" />,
    ENTERPRISE: <Crown className="w-7 h-7 text-amber-500" />,
  };

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-lg p-8 flex flex-col transition-all duration-300 ${
        plan.popular
          ? 'ring-2 ring-purple-500 scale-[1.03]'
          : 'hover:shadow-xl hover:-translate-y-1'
      } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
    >
      {plan.popular && !isCurrent && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-semibold px-4 py-1 rounded-full shadow">
          En Popüler
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-4 right-6 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
          <Check className="w-3 h-3" /> Aktif Plan
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        {icons[plan.key]}
        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
      </div>

      <div className="mb-6">
        {isFree ? (
          <div className="text-4xl font-bold text-gray-900">Ücretsiz</div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-gray-900">
              ₺{price.toLocaleString('tr-TR')}
            </span>
            <span className="text-gray-500 text-sm">
              /{billingCycle === 'MONTHLY' ? 'ay' : 'yıl'}
            </span>
          </div>
        )}
        {billingCycle === 'YEARLY' && !isFree && (
          <p className="text-xs text-green-600 mt-1 font-medium">
            Aylık ₺{Math.round(price / 12).toLocaleString('tr-TR')} — %17 tasarruf
          </p>
        )}
      </div>

      <ul className="space-y-2 mb-8 flex-1">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrent || loading}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
          isCurrent
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : plan.popular
            ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        } disabled:opacity-60`}
      >
        {isSelecting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Yükleniyor...
          </>
        ) : isCurrent ? (
          'Mevcut Plan'
        ) : isFree ? (
          'Ücretsiz Başla'
        ) : (
          'Satın Al'
        )}
      </button>
    </div>
  );
};

// ─── Main PlanSelection ───────────────────────────────────────────────────────
const PlanSelection: React.FC = () => {
  const navigate = useNavigate();

  const [plans, setPlans]                   = useState<PlanData[]>([]);
  const [billingCycle, setBillingCycle]     = useState<BillingCycle>('MONTHLY');
  const [currentPlanKey, setCurrentPlanKey] = useState<string | undefined>(undefined);
  const [loading, setLoading]               = useState(false);
  const [plansLoading, setPlansLoading]     = useState(true);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);
  const [checkoutHtml, setCheckoutHtml]     = useState<string | null>(null);
  const [error, setError]                   = useState<string | null>(null);

  // Load plans from backend
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<PlanData[] | { data?: PlanData[] }>('/billing/plans');
        setPlans(Array.isArray(res.data) ? res.data : (res.data.data ?? []));
      } catch {
        setError('Planlar yüklenemedi. Lütfen sayfayı yenileyin.');
      } finally {
        setPlansLoading(false);
      }
    })();
  }, []);

  // Load current subscription
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    (async () => {
      try {
        const res = await api.get<any>('/billing/subscription');
        // API returns {success: true, data: {plan: 'ENTERPRISE'}}
        const plan = res.data?.data?.plan || res.data?.plan;
        if (plan) setCurrentPlanKey(plan);
      } catch {
        // Not logged in or no subscription — fine
      }
    })();
  }, []);

  const handleSelect = async (plan: PlanData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Ödeme yapabilmek için giriş yapmalısınız.');
      navigate('/login');
      return;
    }

    if (plan.prices[billingCycle] === 0) {
      toast.success('STARTER plan ücretsizdir, hemen kullanmaya başlayabilirsiniz!');
      navigate('/dashboard');
      return;
    }

    try {
      setLoading(true);
      setSelectedPlanKey(plan.key);
      setError(null);

      const res = await api.post<{ checkoutFormContent: string; token: string }>('/billing/payment/init', {
        plan:         plan.key,
        billingCycle: billingCycle,
      });

      const data = (res.data as any);
      if (data?.checkoutFormContent) {
        setCheckoutHtml(data.checkoutFormContent);
      } else {
        throw new Error('Checkout formu alınamadı.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Ödeme başlatılamadı. Lütfen tekrar deneyin.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setSelectedPlanKey(null);
    }
  };

  if (plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Planlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-16 px-4">
      {checkoutHtml && (
        <CheckoutModal
          checkoutHtml={checkoutHtml}
          onClose={() => setCheckoutHtml(null)}
        />
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Planınızı Seçin
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            İşletmeniz için en uygun planı seçin, iyzico güvencesiyle ödeyin.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'MONTHLY'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Aylık
            </button>
            <button
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'YEARLY'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yıllık
              <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${billingCycle === 'YEARLY' ? 'bg-white/20' : 'bg-green-100 text-green-700'}`}>
                %17 İNDİRİM
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              billingCycle={billingCycle}
              currentPlanKey={currentPlanKey}
              onSelect={handleSelect}
              loading={loading}
              selectedPlanKey={selectedPlanKey}
            />
          ))}
        </div>

        {/* Security Badge */}
        <div className="text-center">
          <div className="inline-flex items-center gap-6 bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              SSL Şifreleme
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
              </svg>
              iyzico Güvencesi
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              3D Secure
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Ödemeler iyzico altyapısıyla PCI-DSS uyumlu şekilde işlenir. Kart bilgileriniz hiçbir zaman sistemlerimizde saklanmaz.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlanSelection;
