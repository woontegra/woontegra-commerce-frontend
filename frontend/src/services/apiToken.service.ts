import type { APIToken, APIPermission } from '../types/api';
import toast from 'react-hot-toast';

class APITokenService {
  private readonly STORAGE_KEY = 'api_tokens';

  // Generate API token
  generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'wtn_';
    
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return token;
  }

  // Create API token
  createToken(
    name: string,
    permissions: APIPermission[],
    rateLimit: number = 60,
    expiresAt?: string
  ): APIToken {
    const token: APIToken = {
      id: `token-${Date.now()}`,
      name,
      token: this.generateToken(),
      permissions,
      rateLimit,
      currentUsage: 0,
      isActive: true,
      expiresAt,
      createdAt: new Date().toISOString(),
      createdBy: 'admin', // In production: get from auth
    };

    const tokens = this.getAll();
    tokens.push(token);
    this.save(tokens);

    toast.success('API token oluşturuldu');
    return token;
  }

  // Get all tokens
  getAll(): APIToken[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Get token by value
  getByToken(tokenValue: string): APIToken | null {
    const tokens = this.getAll();
    return tokens.find(t => t.token === tokenValue) || null;
  }

  // Validate token
  validateToken(tokenValue: string, requiredPermission?: APIPermission): {
    valid: boolean;
    token?: APIToken;
    error?: string;
  } {
    const token = this.getByToken(tokenValue);

    if (!token) {
      return { valid: false, error: 'Invalid token' };
    }

    if (!token.isActive) {
      return { valid: false, error: 'Token is inactive' };
    }

    if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
      return { valid: false, error: 'Token has expired' };
    }

    if (requiredPermission && !token.permissions.includes(requiredPermission)) {
      return { valid: false, error: 'Insufficient permissions' };
    }

    // Check rate limit
    if (token.currentUsage >= token.rateLimit) {
      return { valid: false, error: 'Rate limit exceeded' };
    }

    return { valid: true, token };
  }

  // Increment usage
  incrementUsage(tokenValue: string): void {
    const tokens = this.getAll();
    const token = tokens.find(t => t.token === tokenValue);

    if (token) {
      token.currentUsage++;
      token.lastUsedAt = new Date().toISOString();
      this.save(tokens);
    }
  }

  // Reset usage (called every minute)
  resetUsage(): void {
    const tokens = this.getAll();
    tokens.forEach(token => {
      token.currentUsage = 0;
    });
    this.save(tokens);
  }

  // Revoke token
  revokeToken(tokenId: string): void {
    const tokens = this.getAll();
    const token = tokens.find(t => t.id === tokenId);

    if (token) {
      token.isActive = false;
      this.save(tokens);
      toast.success('Token iptal edildi');
    }
  }

  // Delete token
  deleteToken(tokenId: string): void {
    const tokens = this.getAll();
    const filtered = tokens.filter(t => t.id !== tokenId);
    this.save(filtered);
    toast.success('Token silindi');
  }

  // Save tokens
  private save(tokens: APIToken[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokens));
  }
}

export const apiTokenService = new APITokenService();

// Reset usage every minute
setInterval(() => {
  apiTokenService.resetUsage();
}, 60000);
