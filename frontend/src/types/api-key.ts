export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  rateLimit: number;
  requestCount: number;
  lastReset: string;
  permissions?: any;
  isActive: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyInput {
  name: string;
  rateLimit?: number;
  expiresAt?: string;
  permissions?: {
    [resource: string]: string[]; // e.g., { "orders": ["read", "write"], "products": ["read"] }
  };
}

export interface ApiKeyWithPlainKey extends ApiKey {
  key: string; // Only available on creation
}

export const DEFAULT_RATE_LIMIT = 100;

export const AVAILABLE_PERMISSIONS = {
  orders: ['read', 'write', 'delete'],
  products: ['read', 'write', 'delete'],
  customers: ['read', 'write', 'delete'],
  analytics: ['read'],
  export: ['read'],
};
