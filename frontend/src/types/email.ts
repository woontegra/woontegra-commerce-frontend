// Email System

export type EmailTemplateKey =
  | 'order_received'      // Sipariş alındı
  | 'order_shipped'       // Kargo çıktı
  | 'order_delivered'     // Teslim edildi
  | 'order_cancelled'     // İptal edildi
  | 'coupon_created'      // Kupon oluşturuldu
  | 'abandoned_cart'      // Terk edilmiş sepet
  | 'welcome'             // Hoş geldiniz
  | 'password_reset';     // Şifre sıfırlama

/** @deprecated Use EmailTemplateKey */
export type EmailTemplate = EmailTemplateKey;

export interface EmailData {
  to: string;
  subject: string;
  template: EmailTemplateKey;
  data: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: string;
  }>;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailTemplateDefinition {
  name: string;
  subject: string;
  html: string;
  text?: string;
}
