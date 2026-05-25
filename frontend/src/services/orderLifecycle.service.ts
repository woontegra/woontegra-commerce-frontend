import type { Order, OrderStatus, OrderStatusHistory, OrderTracking } from '../types/orderLifecycle';
import { ORDER_STATUS_FLOW } from '../types/orderLifecycle';
import toast from 'react-hot-toast';

class OrderLifecycleService {
  // Update order status
  async updateOrderStatus(
    order: Order,
    newStatus: OrderStatus,
    note?: string,
    updatedBy: string = 'system'
  ): Promise<Order> {
    // 1. Validate status transition
    if (!this.canTransitionTo(order.status, newStatus)) {
      throw new Error(`Cannot transition from ${order.status} to ${newStatus}`);
    }

    // 2. Create status history entry
    const historyEntry: OrderStatusHistory = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      note,
      updatedBy,
    };

    // 3. Update order
    const updatedOrder: Order = {
      ...order,
      status: newStatus,
      statusHistory: [...order.statusHistory, historyEntry],
      updatedAt: new Date().toISOString(),
    };

    // 4. Trigger automation
    await this.triggerAutomation(updatedOrder, newStatus);

    // 5. Send notification
    await this.sendNotification(updatedOrder, newStatus);

    return updatedOrder;
  }

  // Check if status transition is allowed
  canTransitionTo(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const allowedTransitions = ORDER_STATUS_FLOW[currentStatus];
    return allowedTransitions.includes(newStatus);
  }

  // Get allowed next statuses
  getAllowedNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
    return ORDER_STATUS_FLOW[currentStatus];
  }

  // Add tracking information
  async addTracking(
    order: Order,
    tracking: OrderTracking
  ): Promise<Order> {
    const updatedOrder: Order = {
      ...order,
      tracking,
      updatedAt: new Date().toISOString(),
    };

    // Auto-update status to SHIPPED
    if (order.status !== 'shipped') {
      return this.updateOrderStatus(
        updatedOrder,
        'shipped',
        `Kargo takip numarası: ${tracking.trackingNumber}`,
        'system'
      );
    }

    return updatedOrder;
  }

  // Automation triggers
  private async triggerAutomation(_order: Order, newStatus: OrderStatus): Promise<void> {
    switch (newStatus) {
      case 'paid':
        // Payment received automation
        console.log('🤖 Automation: Payment received');
        // In production: Update inventory, create invoice, etc.
        break;

      case 'shipped':
        // Shipping automation
        console.log('🤖 Automation: Order shipped');
        // In production: Update tracking, notify customer, etc.
        break;

      case 'delivered':
        // Delivery automation
        console.log('🤖 Automation: Order delivered');
        // In production: Request review, update analytics, etc.
        break;

      case 'cancelled':
        // Cancellation automation
        console.log('🤖 Automation: Order cancelled');
        // In production: Refund payment, restore inventory, etc.
        break;
    }
  }

  // Send notification
  private async sendNotification(order: Order, newStatus: OrderStatus): Promise<void> {
    const notification = this.generateNotification(order, newStatus);
    
    // Email notification
    console.log('📧 Email notification:', {
      to: order.customerEmail,
      subject: notification.subject,
      body: notification.body,
    });

    // In production: Send actual email
    // await emailService.send({
    //   to: order.customerEmail,
    //   subject: notification.subject,
    //   template: 'order-status-update',
    //   data: { order, newStatus }
    // });

    // SMS notification (future)
    // await smsService.send({
    //   to: order.shippingAddress.phone,
    //   message: notification.sms
    // });

    // Show toast for demo
    toast.success(notification.toast);
  }

  // Generate notification content
  private generateNotification(order: Order, status: OrderStatus) {
    const messages = {
      pending: {
        subject: `Sipariş Alındı - ${order.orderNumber}`,
        body: `Siparişiniz alındı ve ödeme bekleniyor.`,
        toast: 'Sipariş oluşturuldu',
        sms: `Siparişiniz alındı: ${order.orderNumber}`,
      },
      paid: {
        subject: `Ödeme Alındı - ${order.orderNumber}`,
        body: `Ödemeniz başarıyla alındı. Siparişiniz hazırlanmaya başlayacak.`,
        toast: 'Ödeme alındı',
        sms: `Ödemeniz alındı. Sipariş: ${order.orderNumber}`,
      },
      preparing: {
        subject: `Siparişiniz Hazırlanıyor - ${order.orderNumber}`,
        body: `Siparişiniz hazırlanıyor. Kısa süre içinde kargoya verilecek.`,
        toast: 'Sipariş hazırlanıyor',
        sms: `Siparişiniz hazırlanıyor: ${order.orderNumber}`,
      },
      shipped: {
        subject: `Siparişiniz Kargoda - ${order.orderNumber}`,
        body: `Siparişiniz kargoya verildi. Takip numarası: ${order.tracking?.trackingNumber}`,
        toast: 'Sipariş kargoya verildi',
        sms: `Kargoya verildi. Takip: ${order.tracking?.trackingNumber}`,
      },
      delivered: {
        subject: `Siparişiniz Teslim Edildi - ${order.orderNumber}`,
        body: `Siparişiniz başarıyla teslim edildi. Teşekkür ederiz!`,
        toast: 'Sipariş teslim edildi',
        sms: `Siparişiniz teslim edildi: ${order.orderNumber}`,
      },
      cancelled: {
        subject: `Sipariş İptal Edildi - ${order.orderNumber}`,
        body: `Siparişiniz iptal edildi. İade işleminiz başlatıldı.`,
        toast: 'Sipariş iptal edildi',
        sms: `Sipariş iptal edildi: ${order.orderNumber}`,
      },
    };

    return messages[status];
  }

  // Get status progress percentage
  getStatusProgress(status: OrderStatus): number {
    const progressMap = {
      pending: 0,
      paid: 20,
      preparing: 40,
      shipped: 70,
      delivered: 100,
      cancelled: 0,
    };
    return progressMap[status];
  }

  // Check if order can be cancelled
  canBeCancelled(order: Order): boolean {
    return ['pending', 'paid', 'preparing'].includes(order.status);
  }

  // Auto-update status based on payment
  async handlePaymentSuccess(order: Order): Promise<Order> {
    if (order.status === 'pending') {
      return this.updateOrderStatus(
        order,
        'paid',
        'Ödeme başarıyla alındı',
        'payment-gateway'
      );
    }
    return order;
  }

  // Auto-update status based on shipping
  async handleShippingCreated(
    order: Order,
    tracking: OrderTracking
  ): Promise<Order> {
    const orderWithTracking = await this.addTracking(order, tracking);
    return orderWithTracking;
  }
}

export const orderLifecycleService = new OrderLifecycleService();
