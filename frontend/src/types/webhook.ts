export type WebhookEvent = 
  | 'order.created'
  | 'order.updated'
  | 'order.deleted'
  | 'payment.success'
  | 'payment.failed'
  | 'subscription.activated'
  | 'subscription.canceled'
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'customer.created'
  | 'customer.updated'
  | 'trial.ending_soon'
  | 'trial.expired'
  | 'tenant.suspended';

export interface Webhook {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: any;
  statusCode?: number;
  response?: string;
  success: boolean;
  attempts: number;
  nextRetryAt?: string;
  createdAt: string;
}

export interface CreateWebhookInput {
  url: string;
  events: WebhookEvent[];
  description?: string;
}

export interface UpdateWebhookInput {
  url?: string;
  events?: WebhookEvent[];
  description?: string;
  isActive?: boolean;
}

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string; description: string }[] = [
  { value: 'order.created', label: 'Sipariş Oluşturuldu', description: 'Yeni sipariş oluşturulduğunda' },
  { value: 'order.updated', label: 'Sipariş Güncellendi', description: 'Sipariş güncellendiğinde' },
  { value: 'order.deleted', label: 'Sipariş Silindi', description: 'Sipariş silindiğinde' },
  { value: 'payment.success', label: 'Ödeme Başarılı', description: 'Ödeme başarıyla tamamlandığında' },
  { value: 'payment.failed', label: 'Ödeme Başarısız', description: 'Ödeme başarısız olduğunda' },
  { value: 'product.created', label: 'Ürün Oluşturuldu', description: 'Yeni ürün eklendiğinde' },
  { value: 'product.updated', label: 'Ürün Güncellendi', description: 'Ürün güncellendiğinde' },
  { value: 'product.deleted', label: 'Ürün Silindi', description: 'Ürün silindiğinde' },
  { value: 'customer.created', label: 'Müşteri Oluşturuldu', description: 'Yeni müşteri kaydolduğunda' },
  { value: 'customer.updated', label: 'Müşteri Güncellendi', description: 'Müşteri bilgileri güncellendiğinde' },
];
