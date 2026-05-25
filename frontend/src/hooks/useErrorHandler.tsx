import { useState, useCallback, useEffect } from 'react';
import type { ApiResponse } from '../services/apiClient';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  retryCount?: number;
}

export const useApi = <T = unknown, Args extends unknown[] = []>(
  apiCall: (...args: Args) => Promise<ApiResponse<T>>,
  options: UseApiOptions<T> = {}
) => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  const execute = useCallback(async (...args: Args) => {
    setState(prev => ({ ...prev, loading: true, error: null, success: false }));

    try {
      const response = await apiCall(...args);
      
      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          success: true,
        });
        
        options.onSuccess?.(response.data);
      } else {
        const errorMessage = response.message || 'Operation failed';
        setState({
          data: null,
          loading: false,
          error: errorMessage,
          success: false,
        });
        
        options.onError?.(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.message || 'An unexpected error occurred';
      
      setState({
        data: null,
        loading: false,
        error: errorMessage,
        success: false,
      });
      
      options.onError?.(errorMessage);
    }
  }, [apiCall, options.onSuccess, options.onError]);

  // Execute immediately if requested (zero-arg api calls only)
  useEffect(() => {
    if (options.immediate) {
      void (execute as () => Promise<void>)();
    }
  }, [execute, options.immediate]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
};

interface PaginatedPage<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Hook for paginated data
export const usePaginatedApi = <T = unknown>(
  apiCall: (page: number, limit: number) => Promise<ApiResponse<PaginatedPage<T>>>,
  options: UseApiOptions<PaginatedPage<T>> = {}
) => {
  const [state, setState] = useState<{
    data: T[];
    loading: boolean;
    error: string | null;
    success: boolean;
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  }>({
    data: [],
    loading: false,
    error: null,
    success: false,
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
  });

  const loadPage = useCallback(async (page: number, limit: number = state.limit) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiCall(page, limit);
      
      if (response.success && response.data) {
        setState({
          data: response.data.data,
          loading: false,
          error: null,
          success: true,
          page,
          limit,
          total: response.data.total,
          hasMore: response.data.data.length >= limit && (page * limit) < response.data.total,
        });
        
        options.onSuccess?.(response.data);
      } else {
        const errorMessage = response.message || 'Failed to load data';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
          success: false,
        }));
        
        options.onError?.(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.message || 'An unexpected error occurred';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        success: false,
      }));
      
      options.onError?.(errorMessage);
    }
  }, [apiCall, options.onSuccess, options.onError]);

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      loadPage(state.page + 1, state.limit);
    }
  }, [loadPage, state.hasMore, state.loading, state.page, state.limit]);

  const refresh = useCallback(() => {
    loadPage(1, state.limit);
  }, [loadPage, state.limit]);

  const reset = useCallback(() => {
    setState({
      data: [],
      loading: false,
      error: null,
      success: false,
      page: 1,
      limit: 20,
      total: 0,
      hasMore: true,
    });
  }, []);

  return {
    ...state,
    loadPage,
    loadMore,
    refresh,
    reset,
  };
};

// Hook for real-time data updates
export const useRealtimeApi = <T = any>(
  apiCall: () => Promise<ApiResponse<T>>,
  interval: number = 30000, // 30 seconds
  options: UseApiOptions<T> = {}
) => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiCall();
      
      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          success: true,
        });
        
        options.onSuccess?.(response.data);
      } else {
        const errorMessage = response.message || 'Operation failed';
        setState({
          data: null,
          loading: false,
          error: errorMessage,
          success: false,
        });
        
        options.onError?.(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.message || 'An unexpected error occurred';
      
      setState({
        data: null,
        loading: false,
        error: errorMessage,
        success: false,
      });
      
      options.onError?.(errorMessage);
    }
  }, [apiCall, options.onSuccess, options.onError]);

  // Set up interval for real-time updates
  useEffect(() => {
    if (interval > 0) {
      const intervalId = setInterval(execute, interval);
      
      return () => clearInterval(intervalId);
    }
  }, [execute, interval]);

  // Execute immediately if requested
  useEffect(() => {
    if (options.immediate) {
      execute();
    }
  }, [execute, options.immediate]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
};

// Error boundary component
export const ErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({ error, resetError }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bir Hata Oluştu</h2>
          <p className="text-gray-600 mb-4">
            Üzgünüz, beklenmedik bir hata oluştu. Lütfen sayfayı yenileyin.
          </p>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-sm text-gray-700 font-mono">
              {error.message}
            </p>
          </div>
          <button
            onClick={resetError}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sayfayı Yenile
          </button>
        </div>
      </div>
    </div>
  );
};

// Loading component
export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Yükleniyor...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
};

// Empty state component
export const EmptyState: React.FC<{ 
  title?: string; 
  description?: string; 
  action?: React.ReactNode;
}> = ({ 
  title = 'Veri Bulunamadı', 
  description = 'Gösterilecek veri bulunmuyor.',
  action 
}) => {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2v5a2 2 0 002-2h-4a2 2 0 00-2 2v7a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
};
