export interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string;
  
  // Contact Info
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  
  // Settings
  isActive: boolean;
  isDefault: boolean;
  
  // Metadata
  logo?: string;
  settings?: any;
  
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  
  // Counts
  _count?: {
    products: number;
  };
}

export interface CreateStoreDto {
  name: string;
  slug: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  isActive?: boolean;
  isDefault?: boolean;
  logo?: string;
  settings?: any;
}

export interface UpdateStoreDto extends Partial<CreateStoreDto> {}
