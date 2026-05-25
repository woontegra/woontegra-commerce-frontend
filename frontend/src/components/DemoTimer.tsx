import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, Zap, Play, X, Check } from 'lucide-react';

interface DemoTimerProps {
  onTimeUp?: () => void;
  onTimeWarning?: (minutes: number) => void;
  className?: string;
}

interface DemoSession {
  hasDemoSession: boolean;
  sessionId?: string;
  startTime?: string;
  endTime?: string;
  timeRemaining?: number;
  timeRemainingMinutes?: number;
  timeRemainingSeconds?: number;
  restrictions?: {
    maxProducts: number;
    maxOrders: number;
    maxCustomers: number;
    allowApiAccess: boolean;
    allowExport: boolean;
    allowIntegrations: boolean;
  };
  isExpired?: boolean;
}

const DemoTimer: React.FC<DemoTimerProps> = ({ 
  onTimeUp, 
  onTimeWarning, 
  className = '' 
}) => {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const fetchDemoSession = useCallback(async () => {
    try {
      const response = await fetch('/api/demo/session');
      const data = await response.json();
      
      if (data.hasDemoSession) {
        setSession(data);
        setTimeRemaining(data.timeRemaining || 0);
        setIsExpired(data.isExpired || false);
      }
    } catch (error) {
      console.error('Failed to fetch demo session:', error);
    }
  }, []);

  useEffect(() => {
    fetchDemoSession();
  }, [fetchDemoSession]);

  useEffect(() => {
    if (!session || isExpired) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1000;
        
        if (newTime <= 0) {
          setIsExpired(true);
          onTimeUp?.();
          return 0;
        }

        // Show warning at 5 minutes
        if (newTime <= 5 * 60 * 1000 && newTime > 4.9 * 60 * 1000) {
          setShowWarning(true);
          onTimeWarning?.(5);
        }

        // Show warning at 1 minute
        if (newTime <= 1 * 60 * 1000 && newTime > 0.9 * 60 * 1000) {
          onTimeWarning?.(1);
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session, isExpired, onTimeUp, onTimeWarning]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeRemaining <= 1 * 60 * 1000) return 'text-red-600 bg-red-50 border-red-200';
    if (timeRemaining <= 5 * 60 * 1000) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const getProgressPercentage = () => {
    if (!session) return 0;
    const totalTime = 30 * 60 * 1000; // 30 minutes
    return Math.max(0, (timeRemaining / totalTime) * 100);
  };

  const handleUpgrade = () => {
    window.location.href = '/register';
  };

  const handleRestartDemo = () => {
    window.location.reload();
  };

  if (!session || !session.hasDemoSession) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Play className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Demo Modu</p>
              <p className="text-sm text-yellow-600">
                Woontegra'yı denemek için demo'yu başlatın
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/demo'}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
          >
            Demo Başlat
          </button>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Demo Süreniz Doldu
          </h3>
          <p className="text-red-700 mb-4">
            30 dakikalık demo süreniz sona erdi. Woontegra'nın tüm özelliklerini kullanmak için hemen kaydolun!
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleUpgrade}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Hemen Başla
            </button>
            <button
              onClick={handleRestartDemo}
              className="bg-white text-red-600 px-6 py-2 rounded-lg font-medium border border-red-300 hover:bg-red-50 transition-colors"
            >
              Yeni Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Timer */}
      <div className={`border rounded-lg p-4 ${getTimeColor()}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5" />
            <div>
              <p className="font-semibold">Demo Süresi</p>
              <p className="text-sm opacity-80">
                Kalan süre: {formatTime(timeRemaining)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-xs opacity-80">
              {Math.floor(timeRemaining / (1000 * 60))} dakika kaldı
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-white/50 rounded-full h-2">
          <div 
            className="bg-current h-2 rounded-full transition-all duration-1000"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </div>

      {/* Restrictions Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Demo Kısıtlamaları</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-gray-700">
              {session.restrictions?.maxProducts || 0} ürün
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-gray-700">
              {session.restrictions?.maxOrders || 0} sipariş
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-gray-700">
              {session.restrictions?.maxCustomers || 0} müşteri
            </span>
          </div>
          <div className="flex items-center gap-2">
            {session.restrictions?.allowApiAccess ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-red-500" />
            )}
            <span className="text-gray-700">API erişimi</span>
          </div>
          <div className="flex items-center gap-2">
            {session.restrictions?.allowExport ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-red-500" />
            )}
            <span className="text-gray-700">Veri dışa aktar</span>
          </div>
          <div className="flex items-center gap-2">
            {session.restrictions?.allowIntegrations ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-red-500" />
            )}
            <span className="text-gray-700">Entegrasyonlar</span>
          </div>
        </div>
      </div>

      {/* Warning Modal */}
      {showWarning && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900 mb-1">
                Demo Süresi Azalıyor
              </h4>
              <p className="text-orange-700 text-sm mb-3">
                Demo süreniz sona ermek üzere. Woontegra'nın tüm özelliklerini kullanmaya devam etmek için hemen kaydolun!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleUpgrade}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                >
                  Şimdi Kaydol
                </button>
                <button
                  onClick={() => setShowWarning(false)}
                  className="text-orange-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">
              Demo'dan Tam Sürüme Geçin
            </h4>
            <p className="text-sm text-gray-600">
              Sınırsız ürün, API erişimi ve tüm özellikler
            </p>
          </div>
          <button
            onClick={handleUpgrade}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Yükselt
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoTimer;
