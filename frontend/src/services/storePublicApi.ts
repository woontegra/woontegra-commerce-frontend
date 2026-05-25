import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/** Auth gerektirmeyen mağaza vitrin API istemcisi; kiracı host bilgisini iletir. */
export const storePublicClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

let storeCustomerTokenGetter: (() => string | null) | null = null;

export function setStoreCustomerTokenGetter(getter: () => string | null) {
  storeCustomerTokenGetter = getter;
}

storePublicClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    config.headers.set('X-Store-Frontend-Host', window.location.host);
    const token = storeCustomerTokenGetter?.();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return config;
});
