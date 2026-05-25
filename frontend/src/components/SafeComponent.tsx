import React, { Component } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface FallbackProps {
  error?: Error;
  retry?: () => void;
  title?: string;
  message?: string;
}

interface SafeComponentProps {
  fallback?: ComponentType<FallbackProps>;
  children: ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isLoading: boolean;
}

const DefaultFallback: ComponentType<FallbackProps> = ({ 
  retry, 
  title = "Component Error",
  message = "Bu bileşen yüklenirken bir hata oluştu."
}) => (
  <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
    <div className="text-center">
      <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Tekrar Dene
        </button>
      )}
    </div>
  </div>
);

const LoadingFallback: ComponentType = () => (
  <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
    <div className="text-center">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
      <p className="text-gray-600 text-sm">Yükleniyor...</p>
    </div>
  </div>
);

class SafeComponent extends Component<SafeComponentProps, State> {
  constructor(props: SafeComponentProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isLoading: false
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      isLoading: false
    };
  }

  componentDidCatch(error: Error) {
    console.error('SafeComponent caught an error:', error);
    
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      isLoading: true
    });

    // Simulate loading state
    setTimeout(() => {
      this.setState({ isLoading: false });
    }, 1000);
  };

  render() {
    const { fallback: FallbackComponent = DefaultFallback, children } = this.props;
    const { hasError, error, isLoading } = this.state;

    if (isLoading) {
      return <LoadingFallback />;
    }

    if (hasError) {
      return (
        <FallbackComponent
          error={error || undefined}
          retry={this.handleRetry}
        />
      );
    }

    return <>{children}</>;
  }
}

// HOC for wrapping components
export function withSafeComponent<P extends object>(
  Component: ComponentType<P>,
  fallbackOptions?: {
    title?: string;
    message?: string;
    fallback?: ComponentType<FallbackProps>;
  }
) {
  const WrappedComponent = (props: P) => (
    <SafeComponent fallback={fallbackOptions?.fallback}>
      <Component {...props} />
    </SafeComponent>
  );

  WrappedComponent.displayName = `withSafeComponent(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for safe data fetching
export function useSafeData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await fetcher();
        
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, deps);

  return { data, loading, error };
}

// Safe data access utilities
export const safeGet = <T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue: T[K]
): T[K] => {
  if (obj == null) return defaultValue;
  return obj[key] ?? defaultValue;
};

export const safeArray = <T,>(arr: T[] | null | undefined): T[] => {
  if (!Array.isArray(arr)) return [];
  return arr;
};

export const safeString = (str: string | null | undefined): string => {
  if (str == null) return '';
  return String(str);
};

export const safeNumber = (num: number | null | undefined, defaultValue: number = 0): number => {
  if (typeof num !== 'number' || isNaN(num)) return defaultValue;
  return num;
};

export const safeBoolean = (value: any, defaultValue: boolean = false): boolean => {
  if (value == null) return defaultValue;
  return Boolean(value);
};

// Safe rendering utilities
export const SafeText: React.FC<{
  children: ReactNode;
  fallback?: string;
  className?: string;
}> = ({ children, fallback = '', className = '' }) => {
  try {
    const text = React.Children.toArray(children).join('').trim();
    return <span className={className}>{text || fallback}</span>;
  } catch {
    return <span className={className}>{fallback}</span>;
  }
};

export const SafeImage: React.FC<{
  src: string | null | undefined;
  alt: string;
  fallback?: string;
  className?: string;
  onClick?: () => void;
}> = ({ src, alt, fallback = '/placeholder.jpg', className = '', onClick }) => {
  const [imgSrc, setImgSrc] = React.useState(src || fallback);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setImgSrc(src || fallback);
    setHasError(false);
  }, [src, fallback]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallback);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      onClick={onClick}
      loading="lazy"
    />
  );
};

export const SafeList: React.FC<{
  items: any[] | null | undefined;
  renderItem: (item: any, index: number) => ReactNode;
  fallback?: ReactNode;
  className?: string;
}> = ({ items, renderItem, fallback = <p>Veri bulunamadı</p>, className = '' }) => {
  const safeItems = safeArray(items);

  if (safeItems.length === 0) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <div className={className}>
      {safeItems.map((item, index) => (
        <React.Fragment key={index}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}
    </div>
  );
};

export default SafeComponent;
