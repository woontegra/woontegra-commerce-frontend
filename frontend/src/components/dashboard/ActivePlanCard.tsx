export type Plan = 'STARTER' | 'PRO' | 'ENTERPRISE';

interface PlanCardProps {
  currentPlan: Plan;
  onUpgrade?: () => void;
}

const PLAN_INFO = {
  STARTER: {
    name: 'Starter',
    price: 'Ücretsiz',
    color: 'blue',
    features: [
      { name: '50 Ürüne kadar', included: true },
      { name: 'Ürün başına 3 varyant', included: true },
      { name: 'Temel özellikler', included: true },
      { name: 'Sayfa oluşturucu', included: false },
      { name: 'Blog sistemi', included: false },
      { name: 'Analytics', included: false },
    ],
  },
  PRO: {
    name: 'Pro',
    price: '$49/ay',
    color: 'purple',
    features: [
      { name: '500 Ürüne kadar', included: true },
      { name: 'Ürün başına 10 varyant', included: true },
      { name: 'Sayfa oluşturucu', included: true },
      { name: 'Blog sistemi', included: true },
      { name: 'Analytics', included: true },
      { name: 'Özel domain', included: false },
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: '$199/ay',
    color: 'amber',
    features: [
      { name: 'Sınırsız ürün', included: true },
      { name: 'Sınırsız varyant', included: true },
      { name: 'Sayfa oluşturucu', included: true },
      { name: 'Blog sistemi', included: true },
      { name: 'Analytics', included: true },
      { name: 'Özel domain', included: true },
      { name: 'Öncelikli destek', included: true },
    ],
  },
};

export default function ActivePlanCard({ currentPlan, onUpgrade }: PlanCardProps) {
  const planInfo = PLAN_INFO[currentPlan];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        button: 'bg-blue-600 hover:bg-blue-700',
        icon: 'text-blue-600 dark:text-blue-400',
      },
      purple: {
        badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
        button: 'bg-purple-600 hover:bg-purple-700',
        icon: 'text-purple-600 dark:text-purple-400',
      },
      amber: {
        badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
        button: 'bg-amber-600 hover:bg-amber-700',
        icon: 'text-amber-600 dark:text-amber-400',
      },
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const colors = getColorClasses(planInfo.color);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs bg-gray-50 text-blue-600 dark:bg-gray-800 dark:text-blue-400 px-2 py-1 rounded-full font-medium">
            {planInfo.name} Plan
          </span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">{planInfo.price}</p>
      </div>

      <div className="space-y-3 mb-5">
        {planInfo.features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2">
            {feature.included ? (
              <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={`text-xs ${feature.included ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {feature.name}
            </span>
          </div>
        ))}
      </div>

      {currentPlan !== 'ENTERPRISE' && (
        <button
          onClick={onUpgrade}
          className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.button}`}
        >
          Planı Yükselt
        </button>
      )}

    </div>
  );
}
