import React from 'react';
import { Lock, Zap, AlertCircle, Check } from 'lucide-react';

interface DemoRestrictionBannerProps {
  feature: string;
  restriction: string;
  onUpgrade?: () => void;
  className?: string;
}

const DemoRestrictionBanner: React.FC<DemoRestrictionBannerProps> = ({
  feature,
  restriction,
  onUpgrade,
  className = ''
}) => {
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = '/register';
    }
  };

  return (
    <div className={`bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Lock className="w-6 h-6 text-orange-600" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">
            {feature} - Demo Kısıtlaması
          </h3>
          <p className="text-orange-700 mb-4">
            {restriction}
          </p>
          
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <span className="text-sm text-orange-600">
              Bu özellik demo modunda kullanılamaz
            </span>
          </div>
          
          <button
            onClick={handleUpgrade}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Yükselt ve Kullan
          </button>
        </div>
      </div>
    </div>
  );
};

interface DemoUpgradePromptProps {
  timeRemaining?: number;
  onUpgrade?: () => void;
  className?: string;
}

export const DemoUpgradePrompt: React.FC<DemoUpgradePromptProps> = ({
  timeRemaining,
  onUpgrade,
  className = ''
}) => {
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = '/register';
    }
  };

  const getTimeMessage = () => {
    if (!timeRemaining) return '';
    const minutes = Math.floor(timeRemaining / (1000 * 60));
    
    if (minutes <= 5) {
      return `Demo süreniz ${minutes} dakika içinde dolacak!`;
    }
    return 'Demo süreniz dolmak üzere.';
  };

  return (
    <div className={`bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold mb-2">
            Demo'dan Tam Sürüme Geçin
          </h3>
          <p className="text-white/90 mb-4">
            {getTimeMessage()} Woontegra'nın tüm özelliklerine sınırsız erişim sağlayın.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
              <Check className="w-4 h-4" />
              <span className="text-sm">Sınırsız ürün</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
              <Check className="w-4 h-4" />
              <span className="text-sm">API erişimi</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
              <Check className="w-4 h-4" />
              <span className="text-sm">Tüm entegrasyonlar</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleUpgrade}
          className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <Zap className="w-5 h-5" />
          Şimdi Yükselt
        </button>
      </div>
    </div>
  );
};

interface DemoSuccessBannerProps {
  message: string;
  action?: string;
  onAction?: () => void;
  className?: string;
}

export const DemoSuccessBanner: React.FC<DemoSuccessBannerProps> = ({
  message,
  action,
  onAction,
  className = ''
}) => {
  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-green-600" />
        </div>
        
        <div className="flex-1">
          <p className="text-green-800 font-medium">{message}</p>
          
          {action && onAction && (
            <button
              onClick={onAction}
              className="text-green-600 hover:text-green-700 text-sm font-medium mt-1 underline"
            >
              {action}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface DemoLimitReachedProps {
  resource: string;
  limit: number;
  current: number;
  onUpgrade?: () => void;
  className?: string;
}

export const DemoLimitReached: React.FC<DemoLimitReachedProps> = ({
  resource,
  limit,
  current,
  onUpgrade,
  className = ''
}) => {
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = '/register';
    }
  };

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-red-900 font-semibold mb-1">
            {resource} Limitine Ulaşıldı
          </h3>
          <p className="text-red-700 text-sm mb-3">
            Demo modunda en fazla {limit} {resource.toLowerCase()} ekleyebilirsiniz. 
            Mevcut: {current}/{limit}
          </p>
          
          <button
            onClick={handleUpgrade}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Sınırsız Ekle
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoRestrictionBanner;
