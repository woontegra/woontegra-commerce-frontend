// Real E-commerce Variant System

// 1. VARIANT GROUP
export interface VariantGroup {
  id: string;
  name: string; // Renk, Beden, Materyal, etc.
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 2. VARIANT OPTION
export interface VariantOption {
  id: string;
  groupId: string;
  value: string; // Kırmızı, M, L, etc.
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

// 3. PRODUCT VARIANT MATRIX
export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  
  // Combination as JSON array
  // Example: ["Kırmızı", "M"] or [{"Renk": "Kırmızı"}, {"Beden": "M"}]
  options: Record<string, string>; // { "Renk": "Kırmızı", "Beden": "M" }
  
  price: number;
  stock: number;
  images?: string[];
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Variant Configuration for Product
export interface ProductVariantConfig {
  groups: Array<{
    groupId: string;
    groupName: string;
    selectedOptions: string[]; // Option IDs
  }>;
}

// Generated Variant Combination
export interface VariantCombination {
  options: Record<string, string>; // { "Renk": "Kırmızı", "Beden": "M" }
  sku: string;
  price: number;
  stock: number;
}

// Variant Matrix for Admin
export interface VariantMatrix {
  productId: string;
  basePrice: number;
  baseSku: string;
  
  groups: VariantGroup[];
  selectedOptions: Record<string, VariantOption[]>; // groupId -> options
  
  combinations: VariantCombination[];
}
