export type InvoiceType = 'ORDER' | 'SUBSCRIPTION' | 'MANUAL';
export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'COMPLETED' | 'VOIDED' | 'OVERDUE';

export interface InvoiceLineItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate?: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId?: string;
  paymentId?: string;
  type: InvoiceType;
  status: InvoiceStatus;
  number: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  description?: string;
  lineItems: InvoiceLineItem[];
  dueDate?: string;
  paidAt?: string;
  voidedAt?: string;
  periodStart?: string;
  periodEnd?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  subscription?: {
    plan: string;
    billingCycle: string;
    startDate: string;
    endDate: string;
  };
  payment?: {
    amount: number;
    status: string;
    transactionId?: string;
    createdAt: string;
  };
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
