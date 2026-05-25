import { CheckCircle2, Package, CreditCard, Eye, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StepCompleteProps {
  theme: string;
  storeName: string;
  productName: string;
}

const ACTIONS = [
  {
    id: 'products',
    icon: Package,
    title: 'Ürün Yükle',
    description: 'XML veya Excel ile toplu ürün aktarın',
    route: '/products/import/xml',
    gradient: 'from-violet-600 via-purple-600 to-indigo-600',
    shadow: 'shadow-violet-500/25'
  },
  {
    id: 'payment',
    icon: CreditCard,
    title: 'Ödeme Ayarları',
    description: 'Kredi kartı ve diğer ödeme yöntemlerini ayarlayın',
    route: '/settings/payments',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    shadow: 'shadow-emerald-500/25'
  },
  {
    id: 'preview',
    icon: Eye,
    title: 'Mağazayı Gör',
    description: 'Canlı mağazanızı görüntüleyin',
    route: '/store/preview',
    gradient: 'from-slate-600 via-slate-500 to-gray-500',
    shadow: 'shadow-slate-500/25'
  }
];

export default function StepComplete({ storeName }: StepCompleteProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="text-center mb-10 pt-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 text-green-600 mb-6 animate-pulse">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
          Mağazanız Kuruldu 🎉
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto">
          Satışa başlamak için son adımlara geçebilirsiniz. 
          {storeName && <span className="font-medium text-slate-700">"{storeName}" </span>}
          artık hazır.
        </p>
      </div>

      {/* Action Cards */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-6">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => navigate(action.route)}
                className={`
                  group relative p-8 rounded-2xl text-left
                  transition-all duration-300 ease-out
                  hover:shadow-2xl hover:scale-[1.02]
                  bg-gradient-to-br ${action.gradient}
                  text-white shadow-lg ${action.shadow}
                `}
              >
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-8 h-8" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold mb-2">{action.title}</h3>
                <p className="text-white/80 text-sm mb-6 leading-relaxed">
                  {action.description}
                </p>

                {/* Arrow */}
                <div className="flex items-center text-white font-medium">
                  <span>Başla</span>
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform duration-200" />
                </div>

                {/* Hover Glow */}
                <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            );
          })}
        </div>

        {/* Bottom Link to Dashboard */}
        <div className="text-center pb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-slate-600 font-medium transition-colors inline-flex items-center gap-2 text-sm"
          >
            Dashboard'a git
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
