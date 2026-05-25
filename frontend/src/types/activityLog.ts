// User Activity Logging System

export type ActivityType = 
  | 'auth'           // Giriş/Çıkış
  | 'product'        // Ürün işlemleri
  | 'order'          // Sipariş işlemleri
  | 'user'           // Kullanıcı işlemleri
  | 'settings'       // Ayar değişiklikleri
  | 'system';        // Sistem işlemleri

export type ActivityAction = 
  // Auth
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password_reset'
  
  // Product
  | 'product_create'
  | 'product_update'
  | 'product_delete'
  | 'product_view'
  
  // Order
  | 'order_create'
  | 'order_update'
  | 'order_cancel'
  | 'order_refund'
  
  // User
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  
  // Settings
  | 'settings_update'
  | 'campaign_create'
  | 'campaign_update';

export interface ActivityLog {
  id: string;
  
  // User info
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  
  // Activity
  type: ActivityType;
  action: ActivityAction;
  description: string;
  
  // Target
  targetType?: string;      // 'product', 'order', 'user'
  targetId?: string;
  targetName?: string;
  
  // Changes
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  
  // Metadata
  metadata?: {
    ip?: string;
    userAgent?: string;
    location?: string;
    duration?: number;
    [key: string]: any;
  };
  
  // Status
  status: 'success' | 'failed' | 'warning';
  errorMessage?: string;
  
  // Timestamp
  timestamp: string;
}

export interface ActivityLogFilter {
  userId?: string;
  type?: ActivityType;
  action?: ActivityAction;
  status?: 'success' | 'failed' | 'warning';
  targetType?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface ActivityLogStats {
  total: number;
  byType: Record<ActivityType, number>;
  byStatus: {
    success: number;
    failed: number;
    warning: number;
  };
  recentActivity: ActivityLog[];
  topUsers: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;
}
