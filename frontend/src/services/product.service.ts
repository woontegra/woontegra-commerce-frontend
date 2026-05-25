import api from './api';

export interface Product {
  id:           string;
  name:         string;
  slug:         string;
  description:  string | null;
  price:        number;
  sku?:         string | null;
  barcode?:     string | null;
  brand?:       string | null;
  unit?:        string | null;
  status:       string;
  isActive:     boolean;
  images:       string[];
  categoryId?:  string | null;
  category?:    { id: string; name: string } | null;
  pricing?:     { salePrice: number; discountPrice?: number | null; vatRate: number } | null;
  stock?:       { quantity: number; unit: string } | null;
  variants?:    { id: string; isActive: boolean }[];
  productImages?: { id: string; url: string; order: number; isMain: boolean }[];
  createdAt:    string;
  updatedAt:    string;
}

export interface ProductListFilters {
  search?:     string;
  categoryId?: string;
  status?:     string;
  isActive?:   boolean;
  minPrice?:   number;
  maxPrice?:   number;
  page?:       number;
  limit?:      number;
  sortBy?:     string;
  sortDir?:    'asc' | 'desc';
}

/** Shape returned by GET /api/products for each list row */
export interface ProductListItem {
  id:              string;
  name:            string;
  slug:            string;
  status:          string;
  isActive:        boolean;
  sku:             string | null;
  brand:           string | null;
  mainImage:       string | null;
  price:           number;
  stock:           number;
  variantCount:    number;
  category:        { id: string; name: string } | null;
  trendyolStatus:  string | null;
  trendyolSentAt:  string | null;
}

export interface ProductListResult {
  items:      ProductListItem[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface CreateProductDto {
  name:        string;
  description?: string;
  price:       number;
  stock:       number;
  sku?:        string;
  categoryId?: string | null;
  images:      string[];
  isActive?:   boolean;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

// ─── API response wrapper ─────────────────────────────────────────────────────

type ApiItem<T>   = { status: string; data: T };
type ApiUpload    = { status: string; url: string };

class ProductService {
  private readonly base = '/products';

  /** Full paginated list — returns ProductListItem[] (optimized for table view) */
  async search(filters?: ProductListFilters): Promise<ProductListResult> {
    const r    = await api.get<any>(this.base, { params: filters });
    // apiClient interceptor unwraps: r.data = response.data.data
    // backend returns { status, data: { items, total, page, limit, totalPages } }
    const body = (r.data as any);
    const payload = body?.items ? body : body?.data ?? body;
    return {
      items:      Array.isArray(payload?.items) ? payload.items : [],
      total:      payload?.total      ?? 0,
      page:       payload?.page       ?? 1,
      limit:      payload?.limit      ?? 20,
      totalPages: payload?.totalPages ?? 0,
    };
  }

  /** Legacy: returns flat array (kept for backward-compat hooks) */
  async getAll(filters?: ProductListFilters): Promise<Product[]> {
    const result = await this.search(filters);
    return result.items as unknown as Product[];
  }

  async getById(id: string): Promise<Product> {
    const r = await api.get<ApiItem<Product>>(`${this.base}/${id}`);
    return (r.data as any)?.data ?? r.data;
  }

  async create(data: CreateProductDto): Promise<Product> {
    const r = await api.post<ApiItem<Product>>(this.base, data);
    return (r.data as any)?.data ?? r.data;
  }

  async update(id: string, data: UpdateProductDto): Promise<Product> {
    const r = await api.put<ApiItem<Product>>(`${this.base}/${id}`, data);
    return (r.data as any)?.data ?? r.data;
  }

  /** Inline quick update: price, stock, isActive, status */
  async quickUpdate(id: string, data: { price?: number; stock?: number; isActive?: boolean; status?: string }): Promise<Product> {
    const r = await api.patch<ApiItem<Product>>(`${this.base}/${id}/quick`, data);
    return (r.data as any)?.data ?? r.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`${this.base}/${id}`);
  }

  async bulkDelete(ids: string[]): Promise<{ deleted: number; notFound: number }> {
    const r = await api.post(`${this.base}/bulk-delete`, { ids }, { skipErrorToast: true } as any);
    const raw = r.data as { data?: { deleted?: number; notFound?: number }; deleted?: number; notFound?: number };
    const body = raw?.data ?? raw ?? {};
    return {
      deleted:  body.deleted  ?? 0,
      notFound: body.notFound ?? 0,
    };
  }

  /** Upload a single image, returns the public URL */
  async uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append('image', file);
    const r = await api.post<ApiUpload>(`${this.base}/upload-image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return (r.data as any)?.url ?? r.data;
  }

  async updateStock(id: string, stock: number): Promise<void> {
    await api.patch(`${this.base}/${id}/quick`, { stock });
  }
}

export const productService = new ProductService();
