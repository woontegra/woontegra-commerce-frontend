// Marketing System Types

// Popup Campaigns
export type PopupTrigger = 
  | 'page_load'        // Sayfa yüklendiğinde
  | 'exit_intent'      // Çıkış niyeti
  | 'scroll'           // Scroll yüzdesi
  | 'time_delay'       // Zaman gecikmesi
  | 'click';           // Tıklama

export type PopupType = 
  | 'newsletter'       // Email toplama
  | 'discount'         // İndirim kodu
  | 'announcement'     // Duyuru
  | 'survey';          // Anket

export interface PopupCampaign {
  id: string;
  name: string;
  type: PopupType;
  isActive: boolean;
  
  // Trigger Settings
  trigger: PopupTrigger;
  triggerValue?: number; // scroll %, delay seconds
  
  // Display Settings
  title: string;
  description: string;
  image?: string;
  buttonText: string;
  buttonLink?: string;
  
  // Email Collection
  collectEmail?: boolean;
  emailPlaceholder?: string;
  
  // Discount Code
  discountCode?: string;
  discountAmount?: number;
  
  // Targeting
  showOnPages?: string[]; // URL patterns
  showToNewVisitors?: boolean;
  showToReturningVisitors?: boolean;
  maxDisplayPerUser?: number;
  
  // Timing
  startDate?: string;
  endDate?: string;
  
  // Stats
  views: number;
  conversions: number;
  
  createdAt: string;
  updatedAt: string;
}

// Email Collection
export interface EmailSubscriber {
  id: string;
  email: string;
  source: 'popup' | 'footer' | 'checkout' | 'manual';
  tags?: string[];
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt?: string;
}

export interface EmailList {
  id: string;
  name: string;
  description?: string;
  subscriberCount: number;
  tags: string[];
  createdAt: string;
}

// Abandoned Cart
export interface AbandonedCart {
  id: string;
  sessionId: string;
  customerId?: string;
  customerEmail?: string;
  
  items: Array<{
    productId: string;
    productName: string;
    variantId?: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  
  totalAmount: number;
  
  // Recovery
  recoveryEmailSent: boolean;
  recoveryEmailSentAt?: string;
  recovered: boolean;
  recoveredAt?: string;
  recoveryOrderId?: string;
  
  // Timestamps
  abandonedAt: string;
  expiresAt: string;
}

export interface AbandonedCartRecovery {
  id: string;
  cartId: string;
  
  // Email Campaign
  emailSubject: string;
  emailBody: string;
  discountCode?: string;
  discountPercentage?: number;
  
  // Results
  sent: boolean;
  sentAt?: string;
  opened: boolean;
  openedAt?: string;
  clicked: boolean;
  clickedAt?: string;
  recovered: boolean;
  recoveredAt?: string;
}

// Marketing Analytics
export interface MarketingStats {
  popupCampaigns: {
    totalViews: number;
    totalConversions: number;
    conversionRate: number;
    emailsCollected: number;
  };
  
  emailMarketing: {
    totalSubscribers: number;
    activeSubscribers: number;
    unsubscribeRate: number;
    growthRate: number;
  };
  
  abandonedCarts: {
    totalAbandoned: number;
    totalValue: number;
    recoveryRate: number;
    recoveredValue: number;
  };
}
