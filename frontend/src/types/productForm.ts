import type { VariantGroup, VariantOption, VariantCombination } from './variant';

export interface ProductFormData {
  // Step 1: Basic Info
  name: string;
  description: string; // Rich text HTML
  categoryId: string;
  price: number;
  stock: number;
  sku: string;
  
  // Step 2: Variants
  hasVariants: boolean;
  variantGroups: VariantGroup[];
  variantOptions: Record<string, VariantOption[]>;
  variants: VariantCombination[];
  
  // Step 3: Media
  images: string[];
  
  // Additional
  isActive: boolean;
}

export const defaultProductFormData: ProductFormData = {
  name: '',
  description: '',
  categoryId: '',
  price: 0,
  stock: 0,
  sku: '',
  hasVariants: false,
  variantGroups: [],
  variantOptions: {},
  variants: [],
  images: [],
  isActive: true,
};

export type ProductFormStep = 1 | 2 | 3;
