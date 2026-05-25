import apiClient from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  id:              string;
  name:            string;
  slug:            string;
  description?:    string | null;
  parentId?:       string | null;
  level:           number;
  path:            string;
  order:           number;
  isActive:        boolean;
  imageUrl?:       string | null;
  icon?:           string | null;
  metaTitle?:      string | null;
  metaDescription?: string | null;
  tenantId:        string;
  createdAt:       string;
  updatedAt:       string;
  _count?:         { products: number };
}

export interface CategoryNode extends Category {
  children:    CategoryNode[];
  depth?:      number;
  label?:      string;
  hasChildren?: boolean;
}

export interface FlatCategoryNode extends Category {
  depth:       number;
  label:       string;
  hasChildren: boolean;
}

export interface CreateCategoryDto {
  name:            string;
  slug?:           string;
  description?:    string;
  parentId?:       string | null;
  order?:          number;
  isActive?:       boolean;
  imageUrl?:       string;
  icon?:           string;
  metaTitle?:      string;
  metaDescription?: string;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

// ─── Service ──────────────────────────────────────────────────────────────────

// apiClient interceptor already unwraps { status, data } → returns data directly.
// So res.data is the unwrapped payload; the ?? fallback is kept for safety.

class CategoryService {
  private readonly base = '/categories';

  async getAll(): Promise<Category[]> {
    const res = await apiClient.get<any>(this.base);
    return (res.data?.data ?? res.data) as Category[];
  }

  async getTree(): Promise<CategoryNode[]> {
    const res = await apiClient.get<any>(`${this.base}/tree`);
    return (res.data?.data ?? res.data) as CategoryNode[];
  }

  async getFlat(): Promise<FlatCategoryNode[]> {
    const res = await apiClient.get<any>(`${this.base}/flat`);
    return (res.data?.data ?? res.data) as FlatCategoryNode[];
  }

  async getById(id: string): Promise<CategoryNode> {
    const res = await apiClient.get<any>(`${this.base}/${id}`);
    return (res.data?.data ?? res.data) as CategoryNode;
  }

  async getBreadcrumb(id: string): Promise<Array<{ id: string; name: string; slug: string; path: string }>> {
    const res = await apiClient.get<any>(`${this.base}/${id}/breadcrumb`);
    return res.data?.data ?? res.data;
  }

  async create(data: CreateCategoryDto): Promise<CategoryNode> {
    const res = await apiClient.post<any>(this.base, data);
    return res.data?.data ?? res.data;
  }

  async update(id: string, data: UpdateCategoryDto): Promise<CategoryNode> {
    const res = await apiClient.put<any>(`${this.base}/${id}`, data);
    return res.data?.data ?? res.data;
  }

  async delete(id: string, force = false): Promise<void> {
    await apiClient.delete(`${this.base}/${id}${force ? '?force=true' : ''}`);
  }

  async bulkDelete(ids: string[], force = false): Promise<{ deleted: number; errors: any[] }> {
    const res = await apiClient.delete(`${this.base}/bulk`, {
      data:    { ids, force },
      timeout: 120_000,  // 2 minutes for large bulk operations
    });
    return res.data?.data ?? res.data;
  }

  async reorder(items: Array<{ id: string; order: number }>): Promise<void> {
    await apiClient.post(`${this.base}/reorder`, { items });
  }
}

export const categoryService = new CategoryService();
