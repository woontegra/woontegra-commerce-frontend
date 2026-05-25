import api from './api';
import type { AuthResponse, User } from '../types';

function clearDemoSessionFlags(): void {
  localStorage.removeItem('isDemo');
  localStorage.removeItem('demoMeta');
}

function persistAuthSession(token: string, user: User & { isDemo?: boolean }, demo?: unknown): void {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));

  const isDemoUser = user.isDemo === true;
  if (isDemoUser && demo) {
    localStorage.setItem('isDemo', 'true');
    localStorage.setItem('demoMeta', JSON.stringify(demo));
  } else {
    clearDemoSessionFlags();
  }
}

export const authService = {
  async demoLogin(): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/demo-login', {});
    if (response.data.data.token) {
      persistAuthSession(
        response.data.data.token,
        response.data.data.user,
        (response.data.data as { demo?: unknown }).demo,
      );
    }
    return response.data;
  },

  async login(email: string, password: string, tenantSlug: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
      tenantSlug,
    });
    
    if (response.data.data.token) {
      persistAuthSession(
        response.data.data.token,
        response.data.data.user,
      );
    }

    return response.data;
  },

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantSlug: string;
  }): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    
    if (response.data.data.token) {
      persistAuthSession(
        response.data.data.token,
        response.data.data.user,
      );
    }

    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearDemoSessionFlags();
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },
};
