/**
 * apiClient — central Axios instance with auth, tracing and global error handling.
 *
 * Per-call toast suppression:
 *   Pass `{ skipErrorToast: true }` in the request config when the calling
 *   component already handles errors with its own contextual toast.
 *
 *   Example:
 *     apiClient.post('/trendyol/products/send', body, { skipErrorToast: true })
 */

import axios from 'axios';
import type {
  AxiosError,
  AxiosResponse,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { toast } from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success:  boolean;
  data?:    T;
  message?: string;
  code?:    string;
  traceId?: string;
  errors?:  any[];
}

export interface ApiError {
  message:  string;
  code:     string;
  traceId?: string;
  details?: any;
  status?:  number;
}

/** Extend Axios config with our custom flags */
declare module 'axios' {
  interface AxiosRequestConfig {
    /** Set to true when the caller handles errors with its own toast/UI.
     *  Prevents the global interceptor from firing a duplicate notification. */
    skipErrorToast?: boolean;
    /** Internal — request start time for duration logging */
    _startTime?: number;
  }
}

const isDev = import.meta.env.DEV;

// ── Instance ──────────────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────────────────────────────────────

function createTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function getRequestHeader(config: AxiosRequestConfig | undefined, name: string): string | undefined {
  if (!config?.headers) return undefined;
  const headers = config.headers;
  if (typeof headers.get === 'function') {
    const value = headers.get(name);
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    return undefined;
  }
  const record = headers as Record<string, string | undefined>;
  return record[name] ?? record[name.toLowerCase()];
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.set('Authorization', `Bearer ${token}`);

    const traceId = createTraceId();
    config.headers.set('x-trace-id', traceId);
    config.headers.set('x-request-id', traceId);
    (config as any)._traceId = traceId;
    (config as any)._startTime = Date.now();
    if (isDev) {
      console.debug(`→ ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    if (isDev) console.error('[apiClient] Request setup error:', error);
    return Promise.reject(error);
  }
);

// ── Response interceptor ──────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    if (isDev) {
      const ms = Date.now() - ((response.config as any)._startTime ?? Date.now());
      console.debug(
        `← ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${ms}ms)`
      );
    }
    return response;
  },

  (error: AxiosError) => {
    // Silent — AbortController / React Query cancellation
    if (axios.isCancel(error)) {
      return Promise.reject({ message: 'canceled', code: 'CANCELLED' });
    }

    const cfg       = error.config as AxiosRequestConfig & { skipErrorToast?: boolean; _startTime?: number };
    const traceId   =
      (cfg as AxiosRequestConfig & { _traceId?: string })?._traceId ||
      getRequestHeader(cfg, 'x-trace-id');
    const skip      = cfg?.skipErrorToast === true;

    if (isDev) {
      console.error(
        `← ERR ${error.response?.status ?? 'NET'} ${cfg?.method?.toUpperCase()} ${cfg?.url}`,
        error.response?.data ?? error.message
      );
    }

    // ── Server responded (4xx / 5xx) ─────────────────────────────────────────
    if (error.response) {
      const { status, data } = error.response as { status: number; data: any };

      const serverCode =
        (typeof data?.code === 'string' && data.code) ||
        (typeof data?.error === 'string' && data.error) ||
        'SERVER_ERROR';

      const apiError: ApiError = {
        message:
          typeof data?.message === 'string' && data.message
            ? data.message
            : typeof data?.error === 'string' && data.error && data.error !== serverCode
              ? data.error
              : error.message ?? 'Bir hata oluştu.',
        code:    serverCode,
        details: data?.details ?? data?.errors,
        traceId,
        status,
      };

      if (!skip) {
        switch (status) {
          case 401:
            toast.error('Oturum süreniz doldu. Tekrar giriş yapın.');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('tenant');
            setTimeout(() => { window.location.href = '/login'; }, 1800);
            break;

          case 403:
            if (data?.code === 'SUBSCRIPTION_EXPIRED') {
              toast.error('Aboneliğiniz sona erdi. Planınızı yenileyin.');
              setTimeout(() => { window.location.href = '/plans'; }, 1800);
            } else if (
              data?.code === 'PLAN_LIMIT_REACHED'
              || data?.code === 'PLAN_LIMIT_EXCEEDED'
              || data?.error === 'PLAN_LIMIT_EXCEEDED'
            ) {
              toast.error(data?.message ?? 'Plan limitine ulaştınız. Planınızı yükseltin.');
              window.dispatchEvent(new CustomEvent('plan-limit-reached', {
                detail: {
                  message: data?.message,
                  currentPlan: data?.data?.currentPlan,
                  currentUsage: data?.data?.currentUsage,
                  maxAllowed: data?.data?.maxAllowed,
                },
              }));
            } else {
              toast.error(apiError.message || 'Bu işlem için yetkiniz yok.');
            }
            break;

          case 429:
            toast.error('Çok fazla istek. Lütfen bekleyin.');
            break;

          case 500:
          case 502:
          case 503:
            toast.error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
            break;

          default:
            // 400, 404, etc. — show the server's message
            toast.error(apiError.message);
        }
      }

      return Promise.reject(apiError);
    }

    // ── No response (network / timeout) ──────────────────────────────────────
    if (error.request) {
      const apiError: ApiError = {
        message: error.code === 'ECONNABORTED'
          ? 'İstek zaman aşımına uğradı. Bağlantınızı kontrol edin.'
          : 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.',
        code:    error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR',
        traceId,
      };
      if (!skip) toast.error(apiError.message);
      return Promise.reject(apiError);
    }

    // ── Setup / unknown error ─────────────────────────────────────────────────
    const apiError: ApiError = {
      message: error.message || 'Beklenmeyen bir hata oluştu.',
      code:    'UNKNOWN_ERROR',
      traceId,
    };
    if (!skip) toast.error(apiError.message);
    return Promise.reject(apiError);
  }
);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extracts the best human-readable message from an API error.
 * Use in component catch blocks instead of hand-rolling the same pattern.
 */
export function extractErrorMessage(err: any, fallback = 'Bir hata oluştu.'): string {
  return (
    err?.message          ||  // ApiError (already normalized by interceptor)
    err?.response?.data?.message ||
    err?.response?.data?.error   ||
    fallback
  );
}

/**
 * Loading-state wrapper.
 * Usage: const data = await withLoading(apiCall, setLoading)
 */
export async function withLoading<T>(
  apiCall:    () => Promise<T>,
  setLoading?: (v: boolean) => void
): Promise<T> {
  setLoading?.(true);
  try {
    return await apiCall();
  } finally {
    setLoading?.(false);
  }
}

/**
 * Retry wrapper with exponential back-off.
 * Usage: const data = await withRetry(() => apiClient.get('/...'), 3)
 */
export async function withRetry<T>(
  apiCall:    () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  throw lastError;
}

export default apiClient;

// Named alias so files using `import { api } from './apiClient'` keep working
export { apiClient as api };
