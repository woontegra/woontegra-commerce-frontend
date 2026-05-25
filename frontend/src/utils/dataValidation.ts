// Data validation utilities
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  url?: boolean;
  custom?: (value: any) => boolean | string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class DataValidator {
  static validate(value: any, rules: ValidationRule): ValidationResult {
    const errors: string[] = [];

    // Required validation
    if (rules.required && (value === null || value === undefined || value === '')) {
      errors.push('Bu alan zorunludur.');
    }

    // Skip other validations if value is empty and not required
    if (value === null || value === undefined || value === '') {
      return { isValid: errors.length === 0, errors };
    }

    // String validations
    if (typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(`En az ${rules.minLength} karakter olmalıdır.`);
      }

      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`En fazla ${rules.maxLength} karakter olmalıdır.`);
      }

      if (rules.email && !this.isValidEmail(value)) {
        errors.push('Geçerli bir e-posta adresi giriniz.');
      }

      if (rules.url && !this.isValidUrl(value)) {
        errors.push('Geçerli bir URL giriniz.');
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push('Geçersiz format.');
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`En az ${rules.min} olmalıdır.`);
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push(`En fazla ${rules.max} olmalıdır.`);
      }
    }

    // Custom validation
    if (rules.custom) {
      const customResult = rules.custom(value);
      if (customResult !== true) {
        errors.push(typeof customResult === 'string' ? customResult : 'Geçersiz değer.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static sanitizeString(str: string | null | undefined): string {
    if (!str) return '';
    return str.trim().replace(/[<>]/g, '');
  }

  static sanitizeHtml(html: string | null | undefined): string {
    if (!html) return '';
    // Basic HTML sanitization - in production use a proper library like DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
}

// Null safety utilities
export class NullSafety {
  // Safe property access
  static safeGet<T, K extends keyof T>(
    obj: T | null | undefined,
    key: K,
    defaultValue: T[K]
  ): T[K] {
    if (obj == null) return defaultValue;
    return obj[key] ?? defaultValue;
  }

  // Safe array access
  static safeArray<T>(arr: T[] | null | undefined): T[] {
    if (!Array.isArray(arr)) return [];
    return arr;
  }

  // Safe string access
  static safeString(str: string | null | undefined): string {
    if (str == null) return '';
    return String(str);
  }

  // Safe number access
  static safeNumber(num: number | null | undefined, defaultValue: number = 0): number {
    if (typeof num !== 'number' || isNaN(num)) return defaultValue;
    return num;
  }

  // Safe boolean access
  static safeBoolean(value: any, defaultValue: boolean = false): boolean {
    if (value == null) return defaultValue;
    return Boolean(value);
  }

  // Safe date access
  static safeDate(date: Date | string | null | undefined): Date | null {
    if (!date) return null;
    
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? null : date;
    }
    
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  // Safe JSON parse
  static safeJsonParse<T>(json: string | null | undefined, defaultValue: T): T {
    if (!json) return defaultValue;
    
    try {
      return JSON.parse(json);
    } catch {
      return defaultValue;
    }
  }

  // Safe JSON stringify
  static safeJsonStringify(obj: any, defaultValue: string = '{}'): string {
    try {
      return JSON.stringify(obj);
    } catch {
      return defaultValue;
    }
  }

  // Safe function execution
  static safeExecute<T>(
    fn: () => T,
    defaultValue: T,
    onError?: (error: Error) => void
  ): T {
    try {
      return fn();
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
      return defaultValue;
    }
  }

  // Safe async function execution
  static async safeExecuteAsync<T>(
    fn: () => Promise<T>,
    defaultValue: T,
    onError?: (error: Error) => void
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
      return defaultValue;
    }
  }
}

// Data transformation utilities
export class DataTransformer {
  // Transform API response to safe format
  static transformApiResponse<T>(response: any, defaultValue: T): T {
    if (!response || typeof response !== 'object') {
      return defaultValue;
    }

    // Handle common response formats
    if (response.data) {
      return response.data;
    }

    if (response.result) {
      return response.result;
    }

    return response;
  }

  // Transform user data
  static transformUser(user: any) {
    return {
      id: NullSafety.safeString(user?.id),
      email: NullSafety.safeString(user?.email),
      firstName: NullSafety.safeString(user?.firstName),
      lastName: NullSafety.safeString(user?.lastName),
      role: NullSafety.safeString(user?.role),
      isActive: NullSafety.safeBoolean(user?.isActive, true),
      createdAt: NullSafety.safeDate(user?.createdAt),
      updatedAt: NullSafety.safeDate(user?.updatedAt)
    };
  }

  // Transform product data
  static transformProduct(product: any) {
    return {
      id: NullSafety.safeString(product?.id),
      name: NullSafety.safeString(product?.name),
      description: NullSafety.safeString(product?.description),
      price: NullSafety.safeNumber(product?.price, 0),
      stock: NullSafety.safeNumber(product?.stock, 0),
      category: NullSafety.safeString(product?.category),
      status: NullSafety.safeString(product?.status ?? 'active'),
      images: NullSafety.safeArray(product?.images),
      variants: NullSafety.safeArray(product?.variants),
      createdAt: NullSafety.safeDate(product?.createdAt),
      updatedAt: NullSafety.safeDate(product?.updatedAt)
    };
  }

  // Transform order data
  static transformOrder(order: any) {
    return {
      id: NullSafety.safeString(order?.id),
      orderNumber: NullSafety.safeString(order?.orderNumber),
      status: NullSafety.safeString(order?.status),
      total: NullSafety.safeNumber(order?.total, 0),
      currency: NullSafety.safeString(order?.currency ?? 'TRY'),
      customer: this.transformUser(order?.customer),
      items: NullSafety.safeArray(order?.items).map(item => this.transformOrderItem(item)),
      createdAt: NullSafety.safeDate(order?.createdAt),
      updatedAt: NullSafety.safeDate(order?.updatedAt)
    };
  }

  // Transform order item
  static transformOrderItem(item: any) {
    return {
      id: NullSafety.safeString(item?.id),
      product: this.transformProduct(item?.product),
      quantity: NullSafety.safeNumber(item?.quantity, 1),
      price: NullSafety.safeNumber(item?.price, 0),
      total: NullSafety.safeNumber(item?.total, 0)
    };
  }
}

// Type guards
export const isUser = (obj: any): obj is User => {
  return obj && typeof obj === 'object' && 
         typeof obj.id === 'string' && 
         typeof obj.email === 'string';
};

export const isProduct = (obj: any): obj is Product => {
  return obj && typeof obj === 'object' && 
         typeof obj.id === 'string' && 
         typeof obj.name === 'string' && 
         typeof obj.price === 'number';
};

export const isOrder = (obj: any): obj is Order => {
  return obj && typeof obj === 'object' && 
         typeof obj.id === 'string' && 
         typeof obj.orderNumber === 'string';
};

// Default values
const DEFAULT_USER = {
  id: '',
  email: '',
  firstName: '',
  lastName: '',
  role: 'USER',
  isActive: true,
  createdAt: null,
  updatedAt: null,
} as const;

const DEFAULT_PRODUCT = {
  id: '',
  name: '',
  description: '',
  price: 0,
  stock: 0,
  category: '',
  status: 'active',
  images: [],
  variants: [],
  createdAt: null,
  updatedAt: null,
} as const;

export const DEFAULT_VALUES = {
  user: DEFAULT_USER,
  product: DEFAULT_PRODUCT,
  order: {
    id: '',
    orderNumber: '',
    status: 'pending',
    total: 0,
    currency: 'TRY',
    customer: DEFAULT_USER,
    items: [],
    createdAt: null,
    updatedAt: null,
  },
} as const;

// Type definitions
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  status: string;
  images: string[];
  variants: any[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  customer: User;
  items: any[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export default {
  DataValidator,
  NullSafety,
  DataTransformer,
  isUser,
  isProduct,
  isOrder,
  DEFAULT_VALUES
};
