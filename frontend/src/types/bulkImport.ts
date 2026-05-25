// Bulk Product Import System

export interface ExcelRow {
  rowNumber: number;
  data: Record<string, any>;
  status: 'pending' | 'success' | 'error' | 'warning';
  errors?: string[];
  warnings?: string[];
  productId?: string;
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  warnings: number;
  rows: ExcelRow[];
  duration: number;
}

export interface ProductImportData {
  // Basic Info
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  
  // Pricing
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  
  // Inventory
  stock: number;
  lowStockThreshold?: number;
  
  // Category & Tags
  categoryId?: string;
  categoryName?: string;
  tags?: string[];
  
  // Variants
  variants?: Array<{
    color?: string;
    size?: string;
    sku?: string;
    price?: number;
    stock?: number;
  }>;
  
  // Images
  imageUrls?: string[];
  
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  
  // Status
  status?: 'active' | 'draft' | 'archived';
}

export interface ImportError {
  rowNumber: number;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
  value?: any;
}

export interface ImportLog {
  id: string;
  filename: string;
  startedAt: string;
  completedAt?: string;
  status: 'processing' | 'completed' | 'failed';
  result?: ImportResult;
  errors: ImportError[];
}
