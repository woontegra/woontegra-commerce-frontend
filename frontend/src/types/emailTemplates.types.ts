export type SystemEmailTemplateKey =
  | 'order_received'
  | 'payment_success'
  | 'payment_failed'
  | 'bank_transfer_pending'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'return_request_received'
  | 'password_reset'
  | 'contact_form_notification';

/** @deprecated sistem anahtarları için — tüm şablonlar string key kullanır */
export type EmailTemplateKey = SystemEmailTemplateKey;

export type EmailTemplateListItem = {
  id: string;
  key: string;
  name: string;
  subject: string;
  preheader: string | null;
  isActive: boolean;
  isSystem: boolean;
  canDelete: boolean;
  updatedAt: string;
};

export type EmailTemplateDetail = EmailTemplateListItem & {
  bodyHtml: string;
  bodyText: string | null;
};

export type EmailTemplateVariable = {
  key: string;
  desc: string;
};

export type EmailTemplateMeta = {
  keys: Array<{ key: SystemEmailTemplateKey; name: string }>;
  variables: EmailTemplateVariable[];
};

export type CreateEmailTemplateBody = {
  name: string;
  templateCode?: string;
  subject: string;
  preheader: string | null;
  bodyHtml: string;
  bodyText: string | null;
  isActive: boolean;
};

export type UpdateEmailTemplateBody = {
  name?: string;
  subject: string;
  preheader: string | null;
  bodyHtml: string;
  bodyText: string | null;
  isActive: boolean;
};
