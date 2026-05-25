import type { Order, OrderStatus, AutomationRule, EmailType } from '../types/order';
import { logger } from './logger.service';

class OrderAutomationService {
  private rules: AutomationRule[] = [
    {
      id: 'auto-1',
      name: 'Sipariş Onayı Email',
      trigger: 'confirmed',
      action: 'send_email',
      config: { emailType: 'order_confirmation' },
      isActive: true,
    },
    {
      id: 'auto-2',
      name: 'Kargo Email',
      trigger: 'shipped',
      action: 'send_email',
      config: { emailType: 'order_shipped' },
      isActive: true,
    },
    {
      id: 'auto-3',
      name: 'Teslimat Email',
      trigger: 'delivered',
      action: 'send_email',
      config: { emailType: 'order_delivered' },
      isActive: true,
    },
    {
      id: 'auto-4',
      name: 'Stok Güncelleme',
      trigger: 'confirmed',
      action: 'update_inventory',
      config: { operation: 'decrease' },
      isActive: true,
    },
    {
      id: 'auto-5',
      name: 'Admin Bildirimi',
      trigger: 'pending',
      action: 'notify_admin',
      config: { message: 'Yeni sipariş alındı' },
      isActive: true,
    },
  ];

  // Execute automation when order status changes
  async executeAutomation(order: Order, newStatus: OrderStatus) {
    const applicableRules = this.rules.filter(
      rule => rule.isActive && rule.trigger === newStatus
    );

    for (const rule of applicableRules) {
      try {
        await this.executeRule(rule, order);
        logger.logAction('automation_executed', `${rule.name} executed for order ${order.orderNumber}`, {
          ruleId: rule.id,
          orderId: order.id,
          status: newStatus,
        });
      } catch (error) {
        logger.logError('automation_failed', error, {
          ruleId: rule.id,
          orderId: order.id,
        });
      }
    }
  }

  private async executeRule(rule: AutomationRule, order: Order) {
    switch (rule.action) {
      case 'send_email':
        await this.sendEmail(order, rule.config.emailType);
        break;

      case 'update_status':
        await this.updateStatus(order, rule.config.newStatus);
        break;

      case 'notify_admin':
        await this.notifyAdmin(order, rule.config.message);
        break;

      case 'update_inventory':
        await this.updateInventory(order, rule.config.operation);
        break;
    }
  }

  private async sendEmail(order: Order, emailType: EmailType) {
    const emailTemplates = {
      order_confirmation: {
        subject: `Sipariş Onayı - ${order.orderNumber}`,
        body: this.getOrderConfirmationTemplate(order),
      },
      order_shipped: {
        subject: `Siparişiniz Kargoya Verildi - ${order.orderNumber}`,
        body: this.getOrderShippedTemplate(order),
      },
      order_delivered: {
        subject: `Siparişiniz Teslim Edildi - ${order.orderNumber}`,
        body: this.getOrderDeliveredTemplate(order),
      },
      order_cancelled: {
        subject: `Sipariş İptali - ${order.orderNumber}`,
        body: this.getOrderCancelledTemplate(order),
      },
      payment_received: {
        subject: `Ödeme Alındı - ${order.orderNumber}`,
        body: this.getPaymentReceivedTemplate(order),
      },
    };

    const template = emailTemplates[emailType];
    
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    console.log('📧 Email sent:', {
      to: order.customerEmail,
      subject: template.subject,
      body: template.body,
    });

    return {
      id: `email-${Date.now()}`,
      type: emailType,
      to: order.customerEmail,
      subject: template.subject,
      body: template.body,
      sentAt: new Date().toISOString(),
      status: 'sent' as const,
    };
  }

  private async updateStatus(order: Order, newStatus: OrderStatus) {
    // Update order status in database
    console.log('📝 Status updated:', { orderId: order.id, newStatus });
  }

  private async notifyAdmin(order: Order, message: string) {
    // Send notification to admin
    console.log('🔔 Admin notified:', { orderId: order.id, message });
  }

  private async updateInventory(order: Order, operation: 'increase' | 'decrease') {
    // Update product stock
    for (const item of order.items) {
      const change = operation === 'decrease' ? -item.quantity : item.quantity;
      console.log('📦 Inventory updated:', {
        productId: item.productId,
        change,
      });
    }
  }

  // Email Templates
  private getOrderConfirmationTemplate(order: Order): string {
    return `
      <h2>Siparişiniz Alındı!</h2>
      <p>Merhaba ${order.customerName},</p>
      <p>Sipariş numaranız: <strong>${order.orderNumber}</strong></p>
      <p>Toplam tutar: <strong>₺${order.totalAmount.toFixed(2)}</strong></p>
      <p>Siparişiniz en kısa sürede hazırlanacaktır.</p>
      <hr>
      <h3>Sipariş Detayları:</h3>
      <ul>
        ${order.items.map(item => `
          <li>${item.productName} x ${item.quantity} = ₺${item.total.toFixed(2)}</li>
        `).join('')}
      </ul>
      <hr>
      <p>Teslimat Adresi:</p>
      <p>
        ${order.shippingAddress.fullName}<br>
        ${order.shippingAddress.addressLine1}<br>
        ${order.shippingAddress.city}, ${order.shippingAddress.zipCode}
      </p>
    `;
  }

  private getOrderShippedTemplate(order: Order): string {
    return `
      <h2>Siparişiniz Kargoya Verildi!</h2>
      <p>Merhaba ${order.customerName},</p>
      <p>Sipariş numaranız: <strong>${order.orderNumber}</strong></p>
      ${order.trackingNumber ? `<p>Takip numaranız: <strong>${order.trackingNumber}</strong></p>` : ''}
      ${order.trackingUrl ? `<p><a href="${order.trackingUrl}">Kargonuzu takip edin</a></p>` : ''}
      <p>Siparişiniz en kısa sürede adresinize teslim edilecektir.</p>
    `;
  }

  private getOrderDeliveredTemplate(order: Order): string {
    return `
      <h2>Siparişiniz Teslim Edildi!</h2>
      <p>Merhaba ${order.customerName},</p>
      <p>Sipariş numaranız: <strong>${order.orderNumber}</strong></p>
      <p>Siparişiniz başarıyla teslim edilmiştir.</p>
      <p>Bizi tercih ettiğiniz için teşekkür ederiz!</p>
    `;
  }

  private getOrderCancelledTemplate(order: Order): string {
    return `
      <h2>Siparişiniz İptal Edildi</h2>
      <p>Merhaba ${order.customerName},</p>
      <p>Sipariş numaranız: <strong>${order.orderNumber}</strong></p>
      <p>Siparişiniz iptal edilmiştir.</p>
      ${order.notes.adminNote ? `<p>İptal nedeni: ${order.notes.adminNote}</p>` : ''}
    `;
  }

  private getPaymentReceivedTemplate(order: Order): string {
    return `
      <h2>Ödemeniz Alındı!</h2>
      <p>Merhaba ${order.customerName},</p>
      <p>Sipariş numaranız: <strong>${order.orderNumber}</strong></p>
      <p>Ödeme tutarı: <strong>₺${order.totalAmount.toFixed(2)}</strong></p>
      <p>Ödemeniz başarıyla alınmıştır. Siparişiniz hazırlanmaya başlandı.</p>
    `;
  }

  // Get all automation rules
  getRules(): AutomationRule[] {
    return this.rules;
  }

  // Add new rule
  addRule(rule: AutomationRule) {
    this.rules.push(rule);
  }

  // Update rule
  updateRule(ruleId: string, updates: Partial<AutomationRule>) {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
    }
  }

  // Delete rule
  deleteRule(ruleId: string) {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }
}

export const orderAutomationService = new OrderAutomationService();
