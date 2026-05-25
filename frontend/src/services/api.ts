import axios from 'axios';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errorMessages';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function createTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

declare module 'axios' {
  interface AxiosRequestConfig {
    skipErrorToast?: boolean;
  }
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const traceId = createTraceId();
  config.headers['x-trace-id'] = traceId;
  config.headers['x-request-id'] = traceId;
  return config;
});

function isAuthRequest(url?: string): boolean {
  if (!url) return false;
  return /\/auth\/(login|register|demo-login|saas-register)/.test(url);
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 on login/register — show form error only, not "session expired"
    if (error.response?.status === 401 && !isAuthRequest(error.config?.url)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.error('Oturum süreniz doldu, lütfen tekrar giriş yapın');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Plan ürün limiti — apiClient ile aynı: modal + net mesaj (manuel ürün ekleme vb.)
    if (error.response?.status === 403) {
      const data = error.response.data as Record<string, unknown> | undefined;
      const code   = typeof data?.code === 'string' ? data.code : '';
      const errStr = typeof data?.error === 'string' ? data.error : '';
      if (
        code === 'PLAN_LIMIT_EXCEEDED'
        || code === 'PLAN_LIMIT_REACHED'
        || errStr === 'PLAN_LIMIT_EXCEEDED'
      ) {
        const msg = typeof data?.message === 'string' && data.message
          ? data.message
          : 'Ürün limitine ulaştınız. Planınızı yükseltin.';
        toast.error(msg);
        window.dispatchEvent(new CustomEvent('plan-limit-reached', {
          detail: {
            message:    msg,
            currentPlan: (data as any)?.data?.currentPlan,
            currentUsage: (data as any)?.data?.currentUsage,
            maxAllowed:   (data as any)?.data?.maxAllowed,
          },
        }));
        return Promise.reject(error);
      }
    }

    // Login/register errors — Login.tsx shows inline message
    if (isAuthRequest(error.config?.url)) {
      return Promise.reject(error);
    }

    const skipToast = (error.config as { skipErrorToast?: boolean })?.skipErrorToast === true;
    if (!skipToast) {
      const data = error.response?.data as { error?: string; message?: string } | undefined;
      const errorMessage = data?.error ?? data?.message ?? getErrorMessage(error);
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

export default api;
