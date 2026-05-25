import type { AbandonedCart, CartReminderEmail, AbandonedCartStats } from '../types/abandonedCart';
import toast from 'react-hot-toast';

class AbandonedCartTrackingService {
  private readonly STORAGE_KEY = 'abandoned_carts';
  private readonly REMINDER_DELAY = 30 * 60 * 1000; // 30 minutes
  private readonly EXPIRY_DELAY = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Track cart abandonment
  async trackAbandonedCart(
    cartData: AbandonedCart['cartData'],
    userId?: string,
    email?: string,
    phone?: string
  ): Promise<AbandonedCart> {
    const sessionId = this.getSessionId();
    
    // Check if already exists
    const existing = this.getBySessionId(sessionId);
    
    if (existing) {
      // Update existing
      const updated: AbandonedCart = {
        ...existing,
        cartData,
        email: email || existing.email,
        phone: phone || existing.phone,
        updatedAt: new Date().toISOString(),
      };
      
      this.save(updated);
      return updated;
    }
    
    // Create new
    const abandonedCart: AbandonedCart = {
      id: `cart-${Date.now()}`,
      userId,
      sessionId,
      cartData,
      email,
      phone,
      status: 'active',
      reminderSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.EXPIRY_DELAY).toISOString(),
    };
    
    this.save(abandonedCart);
    
    // Schedule reminder
    this.scheduleReminder(abandonedCart);
    
    console.log('🛒 Cart abandonment tracked:', abandonedCart.id);
    
    return abandonedCart;
  }

  // Mark cart as recovered
  async recoverCart(cartId: string): Promise<void> {
    const cart = this.getById(cartId);
    
    if (!cart) return;
    
    const updated: AbandonedCart = {
      ...cart,
      status: 'recovered',
      recoveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.save(updated);
    
    console.log('✅ Cart recovered:', cartId);
    toast.success('Sepetiniz geri yüklendi!');
  }

  // Schedule reminder email
  private scheduleReminder(cart: AbandonedCart): void {
    setTimeout(() => {
      this.sendReminder(cart);
    }, this.REMINDER_DELAY);
  }

  // Send reminder email
  private async sendReminder(cart: AbandonedCart): Promise<void> {
    // Check if cart is still active
    const current = this.getById(cart.id);
    
    if (!current || current.status !== 'active' || current.reminderSent) {
      return;
    }
    
    // Check if email exists
    if (!current.email) {
      console.log('⚠️ No email for abandoned cart:', cart.id);
      return;
    }
    
    // Create reminder email
    const email: CartReminderEmail = {
      to: current.email,
      subject: 'Sepetiniz Sizi Bekliyor! 🛒',
      cartData: current.cartData,
      recoveryUrl: `${window.location.origin}/cart?recover=${cart.id}`,
      expiresIn: this.getExpiryTime(current.expiresAt),
    };
    
    // Send email (in production: use email service)
    console.log('📧 Sending cart reminder:', email);
    
    // Mock email send
    this.mockSendEmail(email);
    
    // Update cart
    const updated: AbandonedCart = {
      ...current,
      reminderSent: true,
      reminderSentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.save(updated);
    
    toast.success('Hatırlatma emaili gönderildi!');
  }

  // Mock email send (for demo)
  private mockSendEmail(email: CartReminderEmail): void {
    console.log('📧 Email Preview:');
    console.log('To:', email.to);
    console.log('Subject:', email.subject);
    console.log('Cart Items:', email.cartData.items.length);
    console.log('Total:', email.cartData.total);
    console.log('Recovery URL:', email.recoveryUrl);
    console.log('Expires In:', email.expiresIn);
    
    // In production:
    // await emailService.send({
    //   to: email.to,
    //   subject: email.subject,
    //   template: 'abandoned-cart',
    //   data: email
    // });
  }

  // Get all abandoned carts
  getAll(): AbandonedCart[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Get by ID
  getById(id: string): AbandonedCart | null {
    const carts = this.getAll();
    return carts.find(c => c.id === id) || null;
  }

  // Get by session ID
  getBySessionId(sessionId: string): AbandonedCart | null {
    const carts = this.getAll();
    return carts.find(c => c.sessionId === sessionId && c.status === 'active') || null;
  }

  // Save cart
  private save(cart: AbandonedCart): void {
    const carts = this.getAll();
    const index = carts.findIndex(c => c.id === cart.id);
    
    if (index >= 0) {
      carts[index] = cart;
    } else {
      carts.push(cart);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(carts));
  }

  // Get session ID
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    
    return sessionId;
  }

  // Get expiry time
  private getExpiryTime(expiresAt: string): string {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} gün`;
    }
    return `${hours} saat`;
  }

  // Get stats
  getStats(): AbandonedCartStats {
    const carts = this.getAll();
    
    const active = carts.filter(c => c.status === 'active');
    const recovered = carts.filter(c => c.status === 'recovered');
    const expired = carts.filter(c => c.status === 'expired');
    
    const potentialRevenue = active.reduce((sum, c) => sum + c.cartData.total, 0);
    const recoveredRevenue = recovered.reduce((sum, c) => sum + c.cartData.total, 0);
    
    const recoveryRate = carts.length > 0 
      ? (recovered.length / carts.length) * 100 
      : 0;
    
    return {
      total: carts.length,
      active: active.length,
      recovered: recovered.length,
      expired: expired.length,
      recoveryRate,
      potentialRevenue,
      recoveredRevenue,
    };
  }

  // Clean expired carts
  cleanExpired(): void {
    const carts = this.getAll();
    const now = new Date();
    
    const updated = carts.map(cart => {
      if (cart.status === 'active' && new Date(cart.expiresAt) < now) {
        return { ...cart, status: 'expired' as const };
      }
      return cart;
    });
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  // Clear all
  clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const abandonedCartTrackingService = new AbandonedCartTrackingService();
