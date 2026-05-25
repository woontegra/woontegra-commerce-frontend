import apiClient from './apiClient';

// ── Rule types ────────────────────────────────────────────────────────────────

export type CampaignRuleType =
  | 'PRODUCT_DISCOUNT'
  | 'CART_DISCOUNT'
  | 'BUY_X_GET_Y'
  | 'BULK_DISCOUNT';

export interface CampaignRule {
  id:         string;
  campaignId: string;
  type:       CampaignRuleType;
  conditions: Record<string, any>;
  actions:    Record<string, any>;
  priority:   number;
  isActive:   boolean;
  createdAt:  string;
  updatedAt:  string;
}

export interface CreateRuleDto {
  type:       CampaignRuleType;
  conditions: Record<string, any>;
  actions:    Record<string, any>;
  priority?:  number;
  isActive?:  boolean;
}

// ── Campaign types ────────────────────────────────────────────────────────────

export type LegacyCampaignType = 'percentage' | 'fixed';

export interface Campaign {
  id:          string;
  tenantId:    string;
  name:        string;
  description: string | null;
  isActive:    boolean;
  priority:    number;
  startDate:   string;
  endDate:     string;
  usageCount:  number;
  usageLimit:  number | null;
  createdAt:   string;
  updatedAt:   string;
  isExpired:   boolean;
  isScheduled: boolean;
  isRunning:   boolean;
  rules:       CampaignRule[];
  // legacy
  type:        LegacyCampaignType;
  value:       number;
  maxDiscount: number | null;
}

export interface CampaignStats {
  total:     number;
  active:    number;
  scheduled: number;
  expired:   number;
}

export interface CampaignsResponse {
  campaigns:  Campaign[];
  total:      number;
  page:       number;
  totalPages: number;
}

export interface CreateCampaignDto {
  name:         string;
  description?: string;
  startDate:    string;
  endDate:      string;
  isActive?:    boolean;
  priority?:    number;
  type?:        LegacyCampaignType;
  value?:       number;
  maxDiscount?: number;
}

export interface GetCampaignsQuery {
  page?:   number;
  limit?:  number;
  active?: 'true' | 'false';
  search?: string;
}

// ── Cart engine types ─────────────────────────────────────────────────────────

export interface CartItem {
  productId:   string;
  variantId?:  string | null;
  quantity:    number;
  price:       number;
  categoryId?: string | null;
}

export interface DiscountLine {
  campaignId:         string;
  campaignName:       string;
  ruleId:             string;
  ruleType:           CampaignRuleType;
  description:        string;
  discountAmount:     number;
  freeQty?:           number;
  affectedProductIds: string[];
}

export interface ItemBreakdown {
  productId:      string;
  variantId:      string | null;
  quantity:       number;
  originalPrice:  number;
  unitDiscount:   number;
  finalUnitPrice: number;
  lineTotal:      number;
  appliedRule:    string | null;
}

export interface ApplyCartResult {
  originalTotal:  number;
  finalPrice:     number;
  savings:        number;
  discounts:      DiscountLine[];
  itemBreakdown:  ItemBreakdown[];
}

export interface PriceCalcResult {
  originalPrice:   number;
  discountedPrice: number;
  discountAmount:  number;
  discountPct:     number;
  campaign: { id: string; name: string } | null;
}

// ── Service ───────────────────────────────────────────────────────────────────

class CampaignService {
  private base = '/campaigns';

  // Campaign CRUD
  async getAll(query: GetCampaignsQuery = {}): Promise<CampaignsResponse> {
    const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== '' && v != null));
    const res = await apiClient.get<CampaignsResponse>(this.base, { params });
    return res.data;
  }

  async getStats(): Promise<CampaignStats> {
    const res = await apiClient.get<CampaignStats>(`${this.base}/stats`);
    return res.data;
  }

  async getActive(): Promise<Campaign[]> {
    const res = await apiClient.get<Campaign[]>(`${this.base}/active`);
    return res.data;
  }

  async getById(id: string): Promise<Campaign> {
    const res = await apiClient.get<Campaign>(`${this.base}/${id}`);
    return res.data;
  }

  async create(data: CreateCampaignDto): Promise<Campaign> {
    const res = await apiClient.post<Campaign>(this.base, data);
    return res.data;
  }

  async update(id: string, data: Partial<CreateCampaignDto>): Promise<Campaign> {
    const res = await apiClient.put<Campaign>(`${this.base}/${id}`, data);
    return res.data;
  }

  async toggle(id: string): Promise<Campaign> {
    const res = await apiClient.patch<Campaign>(`${this.base}/${id}/toggle`, {});
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${this.base}/${id}`);
  }

  // Rule CRUD
  async addRule(campaignId: string, data: CreateRuleDto): Promise<CampaignRule> {
    const res = await apiClient.post<CampaignRule>(`${this.base}/${campaignId}/rules`, data);
    return res.data;
  }

  async updateRule(campaignId: string, ruleId: string, data: Partial<CreateRuleDto>): Promise<CampaignRule> {
    const res = await apiClient.put<CampaignRule>(`${this.base}/${campaignId}/rules/${ruleId}`, data);
    return res.data;
  }

  async deleteRule(campaignId: string, ruleId: string): Promise<void> {
    await apiClient.delete(`${this.base}/${campaignId}/rules/${ruleId}`);
  }

  // Engine
  async applyToCart(cartItems: CartItem[]): Promise<ApplyCartResult> {
    const res = await apiClient.post<ApplyCartResult>(`${this.base}/apply`, { cartItems });
    return res.data;
  }

  async calculatePrice(price: number): Promise<PriceCalcResult> {
    const res = await apiClient.post<PriceCalcResult>(`${this.base}/calculate`, { price });
    return res.data;
  }
}

export const campaignService = new CampaignService();
