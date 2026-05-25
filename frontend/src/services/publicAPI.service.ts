import type { APIResponse } from '../types/api';
import { apiTokenService } from './apiToken.service';

class PublicAPIService {
  // Authenticate request
  private authenticate(token: string, permission?: any): APIResponse {
    const validation = apiTokenService.validateToken(token, permission);

    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: validation.error || 'Authentication failed',
        },
      };
    }

    // Increment usage
    apiTokenService.incrementUsage(token);

    return { success: true };
  }

  // GET /products - List products
  getProducts(token: string, query?: { page?: number; limit?: number; search?: string }): APIResponse {
    const auth = this.authenticate(token, 'products:read');
    if (!auth.success) return auth;

    // Mock data
    const products = [
      {
        id: 'prod-1',
        name: 'Premium T-Shirt',
        slug: 'premium-t-shirt',
        price: 99.90,
        stock: 50,
        status: 'active',
        createdAt: '2026-04-01T00:00:00Z',
      },
      {
        id: 'prod-2',
        name: 'Classic Jeans',
        slug: 'classic-jeans',
        price: 299.90,
        stock: 30,
        status: 'active',
        createdAt: '2026-04-02T00:00:00Z',
      },
    ];

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      success: true,
      data: products.slice(start, end),
      meta: {
        page,
        limit,
        total: products.length,
        hasMore: end < products.length,
      },
    };
  }

  // GET /products/:id - Get product
  getProduct(token: string, productId: string): APIResponse {
    const auth = this.authenticate(token, 'products:read');
    if (!auth.success) return auth;

    // Mock data
    const product = {
      id: productId,
      name: 'Premium T-Shirt',
      slug: 'premium-t-shirt',
      description: 'High quality cotton t-shirt',
      price: 99.90,
      compareAtPrice: 129.90,
      stock: 50,
      sku: 'T-001',
      status: 'active',
      images: ['/images/product1.jpg'],
      variants: [
        { id: 'var-1', color: 'Blue', size: 'M', stock: 15 },
        { id: 'var-2', color: 'Red', size: 'L', stock: 20 },
      ],
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-05T00:00:00Z',
    };

    return {
      success: true,
      data: product,
    };
  }

  // POST /products - Create product
  createProduct(token: string, productData: any): APIResponse {
    const auth = this.authenticate(token, 'products:write');
    if (!auth.success) return auth;

    // Validate
    if (!productData.name || !productData.price) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name and price are required',
        },
      };
    }

    // Mock creation
    const product = {
      id: `prod-${Date.now()}`,
      ...productData,
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: product,
    };
  }

  // PUT /products/:id - Update product
  updateProduct(token: string, productId: string, updates: any): APIResponse {
    const auth = this.authenticate(token, 'products:write');
    if (!auth.success) return auth;

    // Mock update
    const product = {
      id: productId,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: product,
    };
  }

  // GET /orders - List orders
  getOrders(token: string, query?: { page?: number; limit?: number; status?: string }): APIResponse {
    const auth = this.authenticate(token, 'orders:read');
    if (!auth.success) return auth;

    // Mock data
    const orders = [
      {
        id: 'order-1',
        orderNumber: 'ORD-001234',
        status: 'shipped',
        total: 599.90,
        customerEmail: 'customer@example.com',
        createdAt: '2026-04-05T10:00:00Z',
      },
      {
        id: 'order-2',
        orderNumber: 'ORD-001235',
        status: 'delivered',
        total: 299.90,
        customerEmail: 'customer2@example.com',
        createdAt: '2026-04-04T15:30:00Z',
      },
    ];

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      success: true,
      data: orders.slice(start, end),
      meta: {
        page,
        limit,
        total: orders.length,
        hasMore: end < orders.length,
      },
    };
  }

  // GET /orders/:id - Get order
  getOrder(token: string, orderId: string): APIResponse {
    const auth = this.authenticate(token, 'orders:read');
    if (!auth.success) return auth;

    // Mock data
    const order = {
      id: orderId,
      orderNumber: 'ORD-001234',
      status: 'shipped',
      subtotal: 500.00,
      shippingCost: 29.90,
      discount: 50.00,
      total: 479.90,
      customerEmail: 'customer@example.com',
      customerName: 'Ahmet Yılmaz',
      shippingAddress: {
        address: 'Test Mahallesi, Test Sokak No:1',
        city: 'Istanbul',
        country: 'Turkey',
      },
      items: [
        {
          productId: 'prod-1',
          productName: 'Premium T-Shirt',
          quantity: 2,
          price: 99.90,
        },
      ],
      createdAt: '2026-04-05T10:00:00Z',
      updatedAt: '2026-04-05T14:00:00Z',
    };

    return {
      success: true,
      data: order,
    };
  }

  // PUT /orders/:id - Update order
  updateOrder(token: string, orderId: string, updates: any): APIResponse {
    const auth = this.authenticate(token, 'orders:write');
    if (!auth.success) return auth;

    // Mock update
    const order = {
      id: orderId,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: order,
    };
  }
}

export const publicAPIService = new PublicAPIService();
