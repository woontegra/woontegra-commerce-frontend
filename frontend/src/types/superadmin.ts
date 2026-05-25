export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED';
  isActive: boolean;
  trialEndsAt?: string;
  suspendedAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    products: number;
    orders: number;
  };
}

export interface TenantDetails extends Omit<Tenant, '_count'> {
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }>;
  _count: {
    products: number;
    orders: number;
    customers: number;
  };
}

export interface PlatformAnalytics {
  tenants: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
  };
  users: number;
  products: number;
  orders: number;
  planDistribution: Array<{
    plan: string;
    _count: number;
  }>;
}

export interface RecentActivity {
  recentTenants: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    createdAt: string;
    tenant: {
      name: string;
      slug: string;
    };
  }>;
}

export type TenantStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED';
export type Plan = 'STARTER' | 'PRO' | 'ENTERPRISE';
