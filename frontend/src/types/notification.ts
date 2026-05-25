// Notification Center

export type NotificationType = 'order' | 'stock' | 'campaign' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  
  // Metadata
  data?: {
    orderId?: string;
    productId?: string;
    campaignId?: string;
    [key: string]: any;
  };
  
  // Status
  isRead: boolean;
  isImportant: boolean;
  
  // Timestamps
  createdAt: string;
  readAt?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    order: number;
    stock: number;
    campaign: number;
    system: number;
  };
}

export interface NotificationFilter {
  type?: NotificationType;
  isRead?: boolean;
  isImportant?: boolean;
  startDate?: string;
  endDate?: string;
}
