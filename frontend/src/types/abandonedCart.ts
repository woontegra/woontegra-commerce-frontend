// Abandoned Cart Recovery System

export interface AbandonedCart {
  id: string;
  userId?: string;
  sessionId: string;
  
  // Cart Data
  cartData: {
    items: Array<{
      productId: string;
      productName: string;
      variantId?: string;
      quantity: number;
      price: number;
      image?: string;
    }>;
    subtotal: number;
    total: number;
  };
  
  // Contact Info
  email?: string;
  phone?: string;
  
  // Status
  status: 'active' | 'recovered' | 'expired';
  
  // Recovery
  reminderSent: boolean;
  reminderSentAt?: string;
  recoveredAt?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface CartReminderEmail {
  to: string;
  subject: string;
  cartData: AbandonedCart['cartData'];
  recoveryUrl: string;
  expiresIn: string;
}

export interface AbandonedCartStats {
  total: number;
  active: number;
  recovered: number;
  expired: number;
  recoveryRate: number;
  potentialRevenue: number;
  recoveredRevenue: number;
}
