// Product Variant System
export interface VariantOption {
  id: string;
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  combination: Record<string, string>; // { color: 'Red', size: 'M' }
  price: number;
  stock: number;
  images?: string[];
  isActive: boolean;
  wholesalePrice?: number;
  groupPrices?: Record<string, number>; // {groupId: price}
}

// Custom Fields
export type CustomFieldType = 'text' | 'textarea' | 'file' | 'number' | 'date' | 'select';

export interface CustomField {
  id: string;
  name: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select type
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  fileTypes?: string[]; // For file type
  maxFileSize?: number; // In MB
}

export interface CustomFieldValue {
  fieldId: string;
  value: string | number | File;
}

// Unit System
export type UnitType = 'piece' | 'kg' | 'gram' | 'meter' | 'cm' | 'liter' | 'ml';

export interface ProductUnit {
  type: UnitType;
  value: number;
  label: string;
}

// Min/Max Order
export interface OrderLimits {
  minQuantity: number;
  maxQuantity?: number;
  stepQuantity?: number; // e.g., must order in multiples of 5
}

// Enhanced Product
export interface EnhancedProduct {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  
  // Variant System
  hasVariants: boolean;
  variantOptions?: VariantOption[];
  variants?: ProductVariant[];
  
  // Custom Fields
  customFields?: CustomField[];
  
  // Unit System
  unit: ProductUnit;
  
  // Order Limits
  orderLimits: OrderLimits;
  
  // Basic fields
  categoryId?: string;
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Bulk Import
export interface BulkImportRow {
  name: string;
  description: string;
  price: number;
  stock: number;
  sku?: string;
  category?: string;
  unit?: string;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}
