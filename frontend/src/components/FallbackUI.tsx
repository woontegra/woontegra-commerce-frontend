import React from 'react';
import { AlertTriangle, WifiOff, Database, Server, RefreshCw, Home } from 'lucide-react';

// Fallback UI Components
export const NetworkErrorFallback: React.FC<{
  onRetry?: () => void;
  message?: string;
}> = ({ onRetry, message = "İnternet bağlantınızda bir sorun var." }) => (
  <div className="flex items-center justify-center min-h-[200px] bg-gray-50 rounded-lg border border-gray-200 p-8">
    <div className="text-center max-w-md">
      <WifiOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Bağlantı Hatası</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Tekrar Dene
        </button>
      )}
    </div>
  </div>
);

export const DatabaseErrorFallback: React.FC<{
  onRetry?: () => void;
  message?: string;
}> = ({ onRetry, message = "Veritabanına bağlanılamıyor." }) => (
  <div className="flex items-center justify-center min-h-[200px] bg-gray-50 rounded-lg border border-gray-200 p-8">
    <div className="text-center max-w-md">
      <Database className="w-12 h-12 text-orange-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Veritabanı Hatası</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Tekrar Dene
        </button>
      )}
    </div>
  </div>
);

export const ServerErrorFallback: React.FC<{
  onRetry?: () => void;
  message?: string;
}> = ({ onRetry, message = "Sunucu ile iletişim kurulamıyor." }) => (
  <div className="flex items-center justify-center min-h-[200px] bg-gray-50 rounded-lg border border-gray-200 p-8">
    <div className="text-center max-w-md">
      <Server className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Sunucu Hatası</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Tekrar Dene
        </button>
      )}
    </div>
  </div>
);

export const LoadingFallback: React.FC<{
  message?: string;
  size?: 'small' | 'medium' | 'large';
}> = ({ message = "Yükleniyor...", size = 'medium' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className="flex items-center justify-center min-h-[200px] bg-gray-50 rounded-lg border border-gray-200 p-8">
      <div className="text-center">
        <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 mx-auto mb-4 ${sizeClasses[size]}`}></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export const EmptyStateFallback: React.FC<{
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}> = ({ 
  title = "Veri Bulunamadı",
  message = "Gösterilecek veri bulunamadı.",
  action,
  icon = <AlertTriangle className="w-12 h-12 text-gray-400" />
}) => (
  <div className="flex items-center justify-center min-h-[200px] bg-gray-50 rounded-lg border border-gray-200 p-8">
    <div className="text-center max-w-md">
      <div className="mx-auto mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  </div>
);

export const ErrorCard: React.FC<{
  title: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
}> = ({ title, message, type = 'error', onRetry, onDismiss }) => {
  const typeStyles = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      title: 'text-red-900',
      message: 'text-red-700',
      button: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      title: 'text-yellow-900',
      message: 'text-yellow-700',
      button: 'bg-yellow-600 hover:bg-yellow-700'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      title: 'text-blue-900',
      message: 'text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  const styles = typeStyles[type];

  return (
    <div className={`${styles.bg} ${styles.border} rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <h4 className={`font-semibold ${styles.title} mb-1`}>{title}</h4>
          <p className={`text-sm ${styles.message} mb-3`}>{message}</p>
          
          <div className="flex gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className={`${styles.button} text-white px-3 py-1 rounded text-sm font-medium transition-colors`}
              >
                Tekrar Dene
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-600 hover:text-gray-800 px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                Kapat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const FallbackLayout: React.FC<{
  children: React.ReactNode;
  title?: string;
  showHomeButton?: boolean;
}> = ({ children, title = "Bir Hata Oluştu", showHomeButton = true }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col">
    {/* Header */}
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Woontegra</span>
          </div>
          
          {showHomeButton && (
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Ana Sayfa
            </button>
          )}
        </div>
      </div>
    </header>

    {/* Main Content */}
    <main className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">{title}</h1>
        {children}
      </div>
    </main>

    {/* Footer */}
    <footer className="bg-gray-900 text-white py-6">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-gray-400">
          © 2024 Woontegra. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  </div>
);

// Retry Component
export const RetryBoundary: React.FC<{
  children: React.ReactNode;
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (retryCount: number) => void;
  fallback?: React.ReactNode;
}> = ({ 
  children, 
  maxRetries = 3, 
  retryDelay = 1000,
  onRetry,
  fallback
}) => {
  const [retryCount, setRetryCount] = React.useState(0);
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleRetry = React.useCallback(async () => {
    if (retryCount >= maxRetries) return;

    setIsLoading(true);
    setHasError(false);
    
    onRetry?.(retryCount + 1);
    
    // Simulate retry delay
    await new Promise(resolve => setTimeout(resolve, retryDelay));
    
    setRetryCount(prev => prev + 1);
    setIsLoading(false);
  }, [retryCount, maxRetries, retryDelay, onRetry]);

  React.useEffect(() => {
    const handleError = (_event: ErrorEvent) => {
      if (retryCount < maxRetries) {
        handleRetry();
      } else {
        setHasError(true);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [retryCount, maxRetries, handleRetry]);

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  if (hasError) {
    return (
      <ErrorCard
        title="Maksimum Deneme Sayısına Ulaşıldı"
        message={`Maksimum ${maxRetries} deneme yapıldı. Lütfen sayfayı yenileyin.`}
        type="error"
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (isLoading) {
    return <LoadingFallback message="Tekrar deneniyor..." />;
  }

  return <>{children}</>;
};

// Error Boundary for specific sections
export const SectionErrorBoundary: React.FC<{
  children: React.ReactNode;
  sectionName: string;
  fallback?: React.ReactNode;
}> = ({ children }) => {
  return (
    <div className="section-error-boundary">
      {children}
    </div>
  );
};

export default {
  NetworkErrorFallback,
  DatabaseErrorFallback,
  ServerErrorFallback,
  LoadingFallback,
  EmptyStateFallback,
  ErrorCard,
  FallbackLayout,
  RetryBoundary,
  SectionErrorBoundary
};
