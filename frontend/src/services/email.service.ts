import type { EmailData, SMTPConfig, EmailTemplateKey } from '../types/email';
import { emailTemplates } from './emailTemplates';

type DefinedEmailTemplate = keyof typeof emailTemplates;

function isDefinedEmailTemplate(template: EmailTemplateKey): template is DefinedEmailTemplate {
  return template in emailTemplates;
}

class EmailService {
  private smtpConfig: SMTPConfig | null = null;

  // Initialize SMTP config from env
  initialize() {
    // In production: Load from environment variables
    this.smtpConfig = {
      host: import.meta.env.VITE_SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(import.meta.env.VITE_SMTP_PORT || '587'),
      secure: import.meta.env.VITE_SMTP_SECURE === 'true',
      auth: {
        user: import.meta.env.VITE_SMTP_USER || '',
        pass: import.meta.env.VITE_SMTP_PASS || '',
      },
    };
  }

  // Send email
  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      // Get template
      if (!isDefinedEmailTemplate(emailData.template)) {
        throw new Error(`Template not found: ${emailData.template}`);
      }

      const template = emailTemplates[emailData.template];

      // Render template with data
      const html = this.renderTemplate(template.html, emailData.data);
      const text = 'text' in template && typeof template.text === 'string'
        ? this.renderTemplate(template.text, emailData.data)
        : this.htmlToText(html);

      // Prepare email
      const email = {
        from: this.smtpConfig?.auth.user || 'noreply@woontegra.com',
        to: emailData.to,
        subject: this.renderTemplate(emailData.subject || template.subject, emailData.data),
        html,
        text,
        attachments: emailData.attachments,
      };

      // Send via SMTP (in production)
      console.log('📧 Sending email:', {
        to: email.to,
        subject: email.subject,
        template: emailData.template,
      });

      // Mock send for demo
      this.mockSend(email);

      return true;
    } catch (error) {
      console.error('❌ Email send failed:', error);
      return false;
    }
  }

  // Render template with data
  private renderTemplate(template: string, data: Record<string, any>): string {
    let rendered = template;

    // Replace {{variable}} with data
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, String(data[key] || ''));
    });

    return rendered;
  }

  // Convert HTML to plain text
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Mock send (for demo)
  private mockSend(email: any): void {
    console.log('📧 Email Preview:');
    console.log('─'.repeat(50));
    console.log('From:', email.from);
    console.log('To:', email.to);
    console.log('Subject:', email.subject);
    console.log('─'.repeat(50));
    console.log('HTML:', email.html.substring(0, 200) + '...');
    console.log('─'.repeat(50));

    // In production: Use nodemailer or email service
    // const transporter = nodemailer.createTransport(this.smtpConfig);
    // await transporter.sendMail(email);
  }

  // Send order received email
  async sendOrderReceivedEmail(order: any): Promise<boolean> {
    return this.sendEmail({
      to: order.customerEmail,
      subject: `Siparişiniz Alındı - ${order.orderNumber}`,
      template: 'order_received',
      data: {
        orderNumber: order.orderNumber,
        customerName: order.shippingAddress.name,
        items: order.items,
        subtotal: order.subtotal.toFixed(2),
        shippingCost: order.shippingCost.toFixed(2),
        total: order.total.toFixed(2),
        orderDate: new Date(order.createdAt).toLocaleDateString('tr-TR'),
      },
    });
  }

  // Send order shipped email
  async sendOrderShippedEmail(order: any, tracking: any): Promise<boolean> {
    return this.sendEmail({
      to: order.customerEmail,
      subject: `Siparişiniz Kargoya Verildi - ${order.orderNumber}`,
      template: 'order_shipped',
      data: {
        orderNumber: order.orderNumber,
        customerName: order.shippingAddress.name,
        trackingNumber: tracking.trackingNumber,
        shippingCompany: tracking.shippingCompany,
        trackingUrl: tracking.trackingUrl || '#',
        estimatedDelivery: tracking.estimatedDelivery 
          ? new Date(tracking.estimatedDelivery).toLocaleDateString('tr-TR')
          : 'Yakında',
      },
    });
  }

  // Send coupon email
  async sendCouponEmail(email: string, coupon: any): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: `Özel Kupon Kodunuz: ${coupon.code}`,
      template: 'coupon_created',
      data: {
        couponCode: coupon.code,
        discountType: coupon.type === 'percentage' ? 'İndirim Oranı' : 'İndirim Tutarı',
        discountValue: coupon.type === 'percentage' 
          ? `%${coupon.value}`
          : `₺${coupon.value.toFixed(2)}`,
        minCartTotal: coupon.minCartTotal 
          ? `₺${coupon.minCartTotal.toFixed(2)}`
          : 'Yok',
        expiryDate: new Date(coupon.endDate).toLocaleDateString('tr-TR'),
      },
    });
  }

  // Send abandoned cart email
  async sendAbandonedCartEmail(cart: any): Promise<boolean> {
    return this.sendEmail({
      to: cart.email,
      subject: 'Sepetiniz Sizi Bekliyor! 🛒',
      template: 'abandoned_cart',
      data: {
        items: cart.cartData.items,
        total: cart.cartData.total.toFixed(2),
        recoveryUrl: `${window.location.origin}/cart?recover=${cart.id}`,
        expiresIn: '7 gün',
      },
    });
  }
}

export const emailService = new EmailService();
emailService.initialize();
