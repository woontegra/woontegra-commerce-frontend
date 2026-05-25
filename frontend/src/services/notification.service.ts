import type { Notification, NotificationStats, NotificationFilter, NotificationType } from '../types/notification';
import toast from 'react-hot-toast';

class NotificationService {
  private readonly STORAGE_KEY = 'notifications';
  private listeners: Array<(notifications: Notification[]) => void> = [];

  // Get all notifications
  getAll(filter?: NotificationFilter): Notification[] {
    let notifications = this.loadFromStorage();

    if (filter) {
      notifications = this.applyFilter(notifications, filter);
    }

    return notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Get unread count
  getUnreadCount(): number {
    const notifications = this.loadFromStorage();
    return notifications.filter(n => !n.isRead).length;
  }

  // Get stats
  getStats(): NotificationStats {
    const notifications = this.loadFromStorage();
    
    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      byType: {
        order: notifications.filter(n => n.type === 'order').length,
        stock: notifications.filter(n => n.type === 'stock').length,
        campaign: notifications.filter(n => n.type === 'campaign').length,
        system: notifications.filter(n => n.type === 'system').length,
      },
    };
  }

  // Create notification
  create(
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
    isImportant: boolean = false
  ): Notification {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      data,
      isRead: false,
      isImportant,
      createdAt: new Date().toISOString(),
    };

    const notifications = this.loadFromStorage();
    notifications.unshift(notification);
    
    // Keep only last 100 notifications
    const trimmed = notifications.slice(0, 100);
    this.saveToStorage(trimmed);

    // Show toast for important notifications
    if (isImportant) {
      toast.success(title, {
        icon: this.getIcon(type),
      });
    }

    // Notify listeners
    this.notifyListeners();

    console.log('🔔 Notification created:', notification);

    return notification;
  }

  // Mark as read
  markAsRead(id: string): void {
    const notifications = this.loadFromStorage();
    const notification = notifications.find(n => n.id === id);

    if (notification && !notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date().toISOString();
      this.saveToStorage(notifications);
      this.notifyListeners();
    }
  }

  // Mark all as read
  markAllAsRead(): void {
    const notifications = this.loadFromStorage();
    const now = new Date().toISOString();

    notifications.forEach(n => {
      if (!n.isRead) {
        n.isRead = true;
        n.readAt = now;
      }
    });

    this.saveToStorage(notifications);
    this.notifyListeners();
    toast.success('Tüm bildirimler okundu olarak işaretlendi');
  }

  // Delete notification
  delete(id: string): void {
    const notifications = this.loadFromStorage();
    const filtered = notifications.filter(n => n.id !== id);
    this.saveToStorage(filtered);
    this.notifyListeners();
  }

  // Clear all
  clearAll(): void {
    this.saveToStorage([]);
    this.notifyListeners();
    toast.success('Tüm bildirimler temizlendi');
  }

  // Subscribe to changes
  subscribe(callback: (notifications: Notification[]) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Notify listeners
  private notifyListeners(): void {
    const notifications = this.loadFromStorage();
    this.listeners.forEach(listener => listener(notifications));
  }

  // Apply filter
  private applyFilter(notifications: Notification[], filter: NotificationFilter): Notification[] {
    let filtered = [...notifications];

    if (filter.type) {
      filtered = filtered.filter(n => n.type === filter.type);
    }

    if (filter.isRead !== undefined) {
      filtered = filtered.filter(n => n.isRead === filter.isRead);
    }

    if (filter.isImportant !== undefined) {
      filtered = filtered.filter(n => n.isImportant === filter.isImportant);
    }

    if (filter.startDate) {
      filtered = filtered.filter(n => new Date(n.createdAt) >= new Date(filter.startDate!));
    }

    if (filter.endDate) {
      filtered = filtered.filter(n => new Date(n.createdAt) <= new Date(filter.endDate!));
    }

    return filtered;
  }

  // Get icon for type
  private getIcon(type: NotificationType): string {
    const icons = {
      order: '📦',
      stock: '📊',
      campaign: '🎉',
      system: '⚙️',
    };
    return icons[type];
  }

  // Storage helpers
  private loadFromStorage(): Notification[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private saveToStorage(notifications: Notification[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notifications));
  }

  // Notification creators
  notifyNewOrder(orderId: string, orderNumber: string, total: number): void {
    this.create(
      'order',
      'Yeni Sipariş Geldi! 🎉',
      `Sipariş #${orderNumber} - ₺${total.toFixed(2)}`,
      { orderId, orderNumber, total },
      true
    );
  }

  notifyLowStock(productId: string, productName: string, stock: number, threshold: number): void {
    this.create(
      'stock',
      'Düşük Stok Uyarısı! ⚠️',
      `${productName} - Stok: ${stock} (Eşik: ${threshold})`,
      { productId, productName, stock, threshold },
      true
    );
  }

  notifyCampaignStarted(campaignId: string, campaignName: string): void {
    this.create(
      'campaign',
      'Kampanya Başladı! 🎉',
      campaignName,
      { campaignId, campaignName },
      false
    );
  }

  notifyCampaignEnding(campaignId: string, campaignName: string, hoursLeft: number): void {
    this.create(
      'campaign',
      'Kampanya Bitiyor! ⏰',
      `${campaignName} - ${hoursLeft} saat kaldı`,
      { campaignId, campaignName, hoursLeft },
      true
    );
  }
}

export const notificationService = new NotificationService();
