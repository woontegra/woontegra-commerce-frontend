import apiClient from './apiClient';

// ── Types ──────────────────────────────────────────────────────────────────

export type CouponDiscountType = 'PERCENTAGE' | 'FIXED';

export interface Coupon {
  id:             string;
  code:           string;
  discountType:   CouponDiscountType;
  value:          number;
  minOrderAmount: number | null;
  maxDiscount:    number | null;
  usageLimit:     number | null;
  usageCount:     number;
  isActive:       boolean;
  expiresAt:      string | null;
  createdAt:      string;
  updatedAt:      string;
  remaining:      number | null;
  isExpired:      boolean;
}

export interface CouponStats {
  total:      number;
  active:     number;
  expired:    number;
  inactive:   number;
  totalUsage: number;
}

export interface CouponsResponse {
  coupons:    Coupon[];
  total:      number;
  page:       number;
  totalPages: number;
}

export interface CreateCouponDto {
  code:            string;
  discountType:    CouponDiscountType;
  value:           number;
  minOrderAmount?: number;
  maxDiscount?:    number;
  usageLimit?:     number | null;
  isActive?:       boolean;
  expiresAt?:      string | null;
}

export interface GetCouponsQuery {
  page?:   number;
  limit?:  number;
  active?: 'true' | 'false';
  search?: string;
}

export interface CouponValidationResult {
  valid:          boolean;
  coupon:         Coupon | null;
  discountAmount: number;
  finalAmount:    number;
  error?:         string;
}

// ── Service ────────────────────────────────────────────────────────────────

class CouponService {
  private base = '/coupons';

  async getAll(query: GetCouponsQuery = {}): Promise<CouponsResponse> {
    const params = Object.fromEntries(
      Object.entries(query).filter(([, v]) => v !== '' && v != null),
    );
    const res = await apiClient.get<{ data: CouponsResponse }>(this.base, { params });
    return res.data.data;
  }

  async getStats(): Promise<CouponStats> {
    const res = await apiClient.get<{ data: CouponStats }>(`${this.base}/stats`);
    return res.data.data;
  }

  async getById(id: string): Promise<Coupon> {
    const res = await apiClient.get<{ data: Coupon }>(`${this.base}/${id}`);
    return res.data.data;
  }

  async create(data: CreateCouponDto): Promise<Coupon> {
    const res = await apiClient.post<{ data: Coupon }>(this.base, data);
    return res.data.data;
  }

  async update(id: string, data: Partial<CreateCouponDto>): Promise<Coupon> {
    const res = await apiClient.put<{ data: Coupon }>(`${this.base}/${id}`, data);
    return res.data.data;
  }

  async toggle(id: string): Promise<Coupon> {
    const res = await apiClient.patch<{ data: Coupon }>(`${this.base}/${id}/toggle`, {});
    return res.data.data;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${this.base}/${id}`);
  }

  /** Validate a coupon without applying it — for pre-order checks */
  async validate(code: string, orderAmount: number): Promise<CouponValidationResult> {
    const res = await apiClient.post<{ data: CouponValidationResult }>(
      `${this.base}/validate`,
      { code, orderAmount },
    );
    return res.data.data;
  }
}

export const couponService = new CouponService();
