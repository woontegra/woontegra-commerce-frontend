// Public API System

export interface APIToken {
  id: string;
  name: string;
  token: string;
  
  // Permissions
  permissions: APIPermission[];
  
  // Rate limiting
  rateLimit: number;          // Requests per minute
  currentUsage: number;
  
  // Status
  isActive: boolean;
  expiresAt?: string;
  
  // Metadata
  createdAt: string;
  lastUsedAt?: string;
  createdBy: string;
}

export type APIPermission = 
  | 'products:read'
  | 'products:write'
  | 'orders:read'
  | 'orders:write'
  | 'customers:read'
  | 'customers:write';

export interface APIRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  permissions: APIPermission[];
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  example?: {
    request?: any;
    response?: any;
  };
}
