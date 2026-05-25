import apiClient from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AttributeType = 'select' | 'multiselect' | 'text' | 'number' | 'boolean' | 'color';

export interface AttributeValue {
  id:           string;
  attributeId:  string;
  value:        string;
  label:        string;
  color?:       string | null;
  displayOrder: number;
}

export interface Attribute {
  id:           string;
  name:         string;
  slug:         string;
  type:         AttributeType;
  unit?:        string | null;
  isFilterable: boolean;
  isRequired:   boolean;
  displayOrder: number;
  tenantId:     string;
  values:       AttributeValue[];
}

export interface CategoryAttribute {
  id:           string;
  categoryId:   string;
  attributeId:  string;
  required:     boolean;
  isVariant:    boolean;   // true → feeds variant engine
  displayOrder: number;
  attribute:    Attribute;
}

export interface ProductAttributeValue {
  id:               string;
  productId:        string;
  attributeId:      string;
  value?:           string | null;
  attributeValueId?: string | null;
  attribute:        Attribute;
  attributeValue?:  AttributeValue | null;
}

export interface CreateAttributeDto {
  name:         string;
  type:         AttributeType;
  unit?:        string;
  isFilterable?: boolean;
  isRequired?:  boolean;
  displayOrder?: number;
  values?:      Array<{ label: string; value?: string; color?: string; displayOrder?: number }>;
}

// ─── API calls ────────────────────────────────────────────────────────────────

const BASE = '/attributes';

const attributeService = {
  // ── Attribute CRUD ──────────────────────────────────────────────────────────

  getAll: async (): Promise<Attribute[]> => {
    const { data } = await apiClient.get(BASE);
    return data.data ?? data;
  },

  getById: async (id: string): Promise<Attribute> => {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data.data ?? data;
  },

  create: async (dto: CreateAttributeDto): Promise<Attribute> => {
    const { data } = await apiClient.post(BASE, dto);
    return data.data ?? data;
  },

  update: async (id: string, dto: Partial<CreateAttributeDto>): Promise<Attribute> => {
    const { data } = await apiClient.put(`${BASE}/${id}`, dto);
    return data.data ?? data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  // ── Values ──────────────────────────────────────────────────────────────────

  addValue: async (attributeId: string, value: { label: string; value?: string; color?: string }): Promise<AttributeValue> => {
    const { data } = await apiClient.post(`${BASE}/${attributeId}/values`, value);
    return data.data ?? data;
  },

  deleteValue: async (attributeId: string, valueId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${attributeId}/values/${valueId}`);
  },

  // ── Category attributes ─────────────────────────────────────────────────────

  /**
   * GET /api/categories/:categoryId/attributes
   * Returns all attributes (+ ancestor attrs when ancestors=true) for the category.
   */
  getCategoryAttributes: async (categoryId: string, ancestors = true): Promise<CategoryAttribute[]> => {
    // apiClient interceptor already unwraps { status, data } → data is the array directly
    const res = await apiClient.get(`/categories/${categoryId}/attributes`, {
      params: { ancestors: ancestors ? 'true' : 'false' },
    });
    const payload = (res as any).data;
    return (Array.isArray(payload) ? payload : payload?.data ?? payload ?? []) as CategoryAttribute[];
  },

  /**
   * POST /api/category-attributes
   * Create new binding — returns 409 if already assigned.
   */
  createCategoryAttribute: async (
    categoryId:  string,
    attributeId: string,
    opts?: { required?: boolean; isVariant?: boolean; displayOrder?: number },
  ): Promise<CategoryAttribute> => {
    const res = await apiClient.post('/category-attributes', { categoryId, attributeId, ...opts });
    const payload = (res as any).data;
    return (payload?.data ?? payload) as CategoryAttribute;
  },

  /**
   * PUT /api/category-attributes/:categoryId/:attributeId
   * Upsert (update flags on existing binding).
   */
  assignToCategory: async (
    categoryId:  string,
    attributeId: string,
    opts?: { required?: boolean; isVariant?: boolean; displayOrder?: number },
  ): Promise<void> => {
    await apiClient.put(`/category-attributes/${categoryId}/${attributeId}`, { ...opts });
  },

  removeFromCategory: async (categoryId: string, attributeId: string): Promise<void> => {
    await apiClient.delete(`/category-attributes/${categoryId}/${attributeId}`);
  },

  // ── Product attribute values ─────────────────────────────────────────────────

  getProductValues: async (productId: string): Promise<ProductAttributeValue[]> => {
    const { data } = await apiClient.get(`${BASE}/products/${productId}/values`);
    return data.data ?? data;
  },

  saveProductValues: async (productId: string, values: Array<{ attributeId: string; value?: string; attributeValueId?: string }>): Promise<ProductAttributeValue[]> => {
    const { data } = await apiClient.put(`${BASE}/products/${productId}/values`, { values });
    return data.data ?? data;
  },
};

export default attributeService;
