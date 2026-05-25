import type { ActivityLog, ActivityType, ActivityAction, ActivityLogFilter, ActivityLogStats } from '../types/activityLog';

class ActivityLoggerService {
  private readonly STORAGE_KEY = 'activity_logs';
  private readonly MAX_LOGS = 1000;

  // Log activity
  log(
    type: ActivityType,
    action: ActivityAction,
    description: string,
    options?: {
      userId?: string;
      userName?: string;
      userEmail?: string;
      userRole?: string;
      targetType?: string;
      targetId?: string;
      targetName?: string;
      changes?: ActivityLog['changes'];
      metadata?: ActivityLog['metadata'];
      status?: 'success' | 'failed' | 'warning';
      errorMessage?: string;
    }
  ): ActivityLog {
    const log: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      action,
      description,
      status: options?.status || 'success',
      timestamp: new Date().toISOString(),
      ...options,
    };

    // Add to storage
    const logs = this.loadFromStorage();
    logs.unshift(log);

    // Keep only last MAX_LOGS
    const trimmed = logs.slice(0, this.MAX_LOGS);
    this.saveToStorage(trimmed);

    console.log('📝 Activity logged:', log);

    return log;
  }

  // Get all logs
  getAll(filter?: ActivityLogFilter): ActivityLog[] {
    let logs = this.loadFromStorage();

    if (filter) {
      logs = this.applyFilter(logs, filter);
    }

    return logs;
  }

  // Get stats
  getStats(): ActivityLogStats {
    const logs = this.loadFromStorage();

    // By type
    const byType: Record<ActivityType, number> = {
      auth: 0,
      product: 0,
      order: 0,
      user: 0,
      settings: 0,
      system: 0,
    };

    logs.forEach(log => {
      byType[log.type]++;
    });

    // By status
    const byStatus = {
      success: logs.filter(l => l.status === 'success').length,
      failed: logs.filter(l => l.status === 'failed').length,
      warning: logs.filter(l => l.status === 'warning').length,
    };

    // Recent activity (last 10)
    const recentActivity = logs.slice(0, 10);

    // Top users
    const userCounts = new Map<string, { userName: string; count: number }>();
    logs.forEach(log => {
      if (log.userId) {
        const existing = userCounts.get(log.userId);
        if (existing) {
          existing.count++;
        } else {
          userCounts.set(log.userId, {
            userName: log.userName || 'Unknown',
            count: 1,
          });
        }
      }
    });

    const topUsers = Array.from(userCounts.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: logs.length,
      byType,
      byStatus,
      recentActivity,
      topUsers,
    };
  }

  // Apply filter
  private applyFilter(logs: ActivityLog[], filter: ActivityLogFilter): ActivityLog[] {
    let filtered = [...logs];

    if (filter.userId) {
      filtered = filtered.filter(l => l.userId === filter.userId);
    }

    if (filter.type) {
      filtered = filtered.filter(l => l.type === filter.type);
    }

    if (filter.action) {
      filtered = filtered.filter(l => l.action === filter.action);
    }

    if (filter.status) {
      filtered = filtered.filter(l => l.status === filter.status);
    }

    if (filter.targetType) {
      filtered = filtered.filter(l => l.targetType === filter.targetType);
    }

    if (filter.targetId) {
      filtered = filtered.filter(l => l.targetId === filter.targetId);
    }

    if (filter.startDate) {
      filtered = filtered.filter(l => new Date(l.timestamp) >= new Date(filter.startDate!));
    }

    if (filter.endDate) {
      filtered = filtered.filter(l => new Date(l.timestamp) <= new Date(filter.endDate!));
    }

    if (filter.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(l =>
        l.description.toLowerCase().includes(search) ||
        l.userName?.toLowerCase().includes(search) ||
        l.targetName?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }

  // Storage helpers
  private loadFromStorage(): ActivityLog[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private saveToStorage(logs: ActivityLog[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
  }

  // Convenience methods for common actions

  // Auth
  logLogin(userId: string, userName: string, userEmail: string, metadata?: any): void {
    this.log('auth', 'login', `${userName} giriş yaptı`, {
      userId,
      userName,
      userEmail,
      metadata,
    });
  }

  logLogout(userId: string, userName: string): void {
    this.log('auth', 'logout', `${userName} çıkış yaptı`, {
      userId,
      userName,
    });
  }

  logLoginFailed(email: string, reason: string, metadata?: any): void {
    this.log('auth', 'login_failed', `Başarısız giriş denemesi: ${email}`, {
      userEmail: email,
      status: 'failed',
      errorMessage: reason,
      metadata,
    });
  }

  // Product
  logProductCreate(userId: string, userName: string, productId: string, productName: string): void {
    this.log('product', 'product_create', `${userName} yeni ürün ekledi: ${productName}`, {
      userId,
      userName,
      targetType: 'product',
      targetId: productId,
      targetName: productName,
    });
  }

  logProductUpdate(
    userId: string,
    userName: string,
    productId: string,
    productName: string,
    changes: { before: any; after: any }
  ): void {
    this.log('product', 'product_update', `${userName} ürünü güncelledi: ${productName}`, {
      userId,
      userName,
      targetType: 'product',
      targetId: productId,
      targetName: productName,
      changes,
    });
  }

  logProductDelete(userId: string, userName: string, productId: string, productName: string): void {
    this.log('product', 'product_delete', `${userName} ürünü sildi: ${productName}`, {
      userId,
      userName,
      targetType: 'product',
      targetId: productId,
      targetName: productName,
      status: 'warning',
    });
  }

  // Order
  logOrderCreate(userId: string, userName: string, orderId: string, orderNumber: string, total: number): void {
    this.log('order', 'order_create', `${userName} sipariş oluşturdu: ${orderNumber} (₺${total.toFixed(2)})`, {
      userId,
      userName,
      targetType: 'order',
      targetId: orderId,
      targetName: orderNumber,
      metadata: { total },
    });
  }

  logOrderUpdate(
    userId: string,
    userName: string,
    orderId: string,
    orderNumber: string,
    changes: { before: any; after: any }
  ): void {
    this.log('order', 'order_update', `${userName} siparişi güncelledi: ${orderNumber}`, {
      userId,
      userName,
      targetType: 'order',
      targetId: orderId,
      targetName: orderNumber,
      changes,
    });
  }

  logOrderCancel(userId: string, userName: string, orderId: string, orderNumber: string, reason?: string): void {
    this.log('order', 'order_cancel', `${userName} siparişi iptal etti: ${orderNumber}`, {
      userId,
      userName,
      targetType: 'order',
      targetId: orderId,
      targetName: orderNumber,
      status: 'warning',
      metadata: { reason },
    });
  }

  // Settings
  logSettingsUpdate(userId: string, userName: string, settingName: string, changes: { before: any; after: any }): void {
    this.log('settings', 'settings_update', `${userName} ayarı değiştirdi: ${settingName}`, {
      userId,
      userName,
      targetType: 'settings',
      targetName: settingName,
      changes,
    });
  }
}

export const activityLogger = new ActivityLoggerService();
