import apiClient from './apiClient';
import type { Tenant, TenantDetails, PlatformAnalytics, RecentActivity, TenantStatus, Plan } from '../types/superadmin';

export const superAdminService = {
  /**
   * Get platform analytics
   */
  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    const response = await apiClient.get('/superadmin/analytics');
    return response.data.data;
  },

  /**
   * Get recent activity
   */
  async getRecentActivity(limit: number = 50): Promise<RecentActivity> {
    const response = await apiClient.get('/superadmin/activity', {
      params: { limit },
    });
    return response.data.data;
  },

  /**
   * Get all tenants
   */
  async getAllTenants(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: TenantStatus;
  }): Promise<{
    tenants: Tenant[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const response = await apiClient.get('/superadmin/tenants', { params });
    return response.data.data;
  },

  /**
   * Get tenant details
   */
  async getTenantDetails(tenantId: string): Promise<TenantDetails> {
    const response = await apiClient.get(`/superadmin/tenants/${tenantId}`);
    return response.data.data;
  },

  /**
   * Update tenant status
   */
  async updateTenantStatus(tenantId: string, status: TenantStatus): Promise<Tenant> {
    const response = await apiClient.put(`/superadmin/tenants/${tenantId}/status`, {
      status,
    });
    return response.data.data;
  },

  /**
   * Update tenant plan
   */
  async updateTenantPlan(tenantId: string, plan: Plan): Promise<void> {
    await apiClient.put(`/superadmin/tenants/${tenantId}/plan`, {
      plan,
    });
  },

  /**
   * Delete tenant
   */
  async deleteTenant(tenantId: string, confirm: string): Promise<void> {
    await apiClient.delete(`/superadmin/tenants/${tenantId}`, {
      data: { confirm },
    });
  },
};
