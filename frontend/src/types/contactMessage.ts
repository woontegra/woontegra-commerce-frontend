export type ContactMessageStatus = 'NEW' | 'READ' | 'ARCHIVED';

export type ContactMessage = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
  updatedAt: string;
};
