import type { AbandonedCart, AbandonedCartRecovery } from '../types/marketing';

class AbandonedCartService {
  private readonly STORAGE_KEY = 'abandoned_carts';
  private readonly EXPIRY_HOURS = 72; // 3 days

  // Track cart activity
  trackCartActivity(cart: {
    items: any[];
    totalAmount: number;
    customerEmail?: string;
  }) {
    if (cart.items.length === 0) return;

    const sessionId = this.getSessionId();
    const existingCart = this.getAbandonedCart(sessionId);

    const abandonedCart: AbandonedCart = {
      id: existingCart?.id || `cart-${Date.now()}`,
      sessionId,
      customerEmail: cart.customerEmail,
      items: cart.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
      })),
      totalAmount: cart.totalAmount,
      recoveryEmailSent: existingCart?.recoveryEmailSent || false,
      recovered: false,
      abandonedAt: existingCart?.abandonedAt || new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
    };

    this.saveAbandonedCart(abandonedCart);
    this.scheduleRecoveryEmail(abandonedCart);
  }

  // Mark cart as recovered
  markAsRecovered(sessionId: string, orderId: string) {
    const cart = this.getAbandonedCart(sessionId);
    if (cart) {
      cart.recovered = true;
      cart.recoveredAt = new Date().toISOString();
      cart.recoveryOrderId = orderId;
      this.saveAbandonedCart(cart);
    }
  }

  // Get abandoned carts
  getAbandonedCarts(): AbandonedCart[] {
    const carts = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    
    // Filter expired carts
    const now = new Date();
    return carts.filter((cart: AbandonedCart) => 
      new Date(cart.expiresAt) > now
    );
  }

  // Send recovery email
  async sendRecoveryEmail(cart: AbandonedCart): Promise<boolean> {
    if (!cart.customerEmail) return false;
    if (cart.recoveryEmailSent) return false;

    try {
      // In production, integrate with email service
      const recovery: AbandonedCartRecovery = {
        id: `recovery-${Date.now()}`,
        cartId: cart.id,
        emailSubject: '🛒 Sepetinizde ürünler kaldı!',
        emailBody: this.generateRecoveryEmail(cart),
        discountPercentage: 10, // 10% discount for recovery
        sent: true,
        sentAt: new Date().toISOString(),
        opened: false,
        clicked: false,
        recovered: false,
      };

      console.log('📧 Recovery email sent:', {
        to: cart.customerEmail,
        subject: recovery.emailSubject,
        discountCode: 'COMEBACK10',
      });

      // Update cart
      cart.recoveryEmailSent = true;
      cart.recoveryEmailSentAt = new Date().toISOString();
      this.saveAbandonedCart(cart);

      return true;
    } catch (error) {
      console.error('Recovery email failed:', error);
      return false;
    }
  }

  // Generate recovery email content
  private generateRecoveryEmail(cart: AbandonedCart): string {
    return `
      <h2>Sepetinizde unuttuğunuz ürünler var! 🛍️</h2>
      <p>Merhaba,</p>
      <p>Sepetinizde ${cart.items.length} ürün bulunuyor. Siparişinizi tamamlamak için geri dönün!</p>
      
      <h3>Sepetinizdeki Ürünler:</h3>
      <ul>
        ${cart.items.map(item => `
          <li>${item.productName} x ${item.quantity} = ₺${(item.price * item.quantity).toFixed(2)}</li>
        `).join('')}
      </ul>
      
      <p><strong>Toplam: ₺${cart.totalAmount.toFixed(2)}</strong></p>
      
      <p>🎁 <strong>Özel İndirim!</strong> COMEBACK10 kodu ile %10 indirim kazanın!</p>
      
      <a href="/checkout?cart=${cart.sessionId}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
        Siparişi Tamamla
      </a>
      
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        Bu email size sepetinizde ürünler olduğu için gönderildi. 
        Artık bu tür emailler almak istemiyorsanız, <a href="#">buradan</a> abonelikten çıkabilirsiniz.
      </p>
    `;
  }

  // Schedule recovery email (1 hour after abandonment)
  private scheduleRecoveryEmail(cart: AbandonedCart) {
    if (!cart.customerEmail) return;
    if (cart.recoveryEmailSent) return;

    setTimeout(() => {
      const currentCart = this.getAbandonedCart(cart.sessionId);
      if (currentCart && !currentCart.recovered && !currentCart.recoveryEmailSent) {
        this.sendRecoveryEmail(currentCart);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  // Helper methods
  private getSessionId(): string {
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  private getAbandonedCart(sessionId: string): AbandonedCart | null {
    const carts = this.getAbandonedCarts();
    return carts.find(c => c.sessionId === sessionId) || null;
  }

  private saveAbandonedCart(cart: AbandonedCart) {
    const carts = this.getAbandonedCarts();
    const index = carts.findIndex(c => c.id === cart.id);
    
    if (index !== -1) {
      carts[index] = cart;
    } else {
      carts.push(cart);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(carts));
  }

  // Analytics
  getRecoveryStats() {
    const carts = this.getAbandonedCarts();
    const recovered = carts.filter(c => c.recovered);
    
    return {
      totalAbandoned: carts.length,
      totalValue: carts.reduce((sum, c) => sum + c.totalAmount, 0),
      recoveryRate: carts.length > 0 ? (recovered.length / carts.length) * 100 : 0,
      recoveredValue: recovered.reduce((sum, c) => sum + c.totalAmount, 0),
      emailsSent: carts.filter(c => c.recoveryEmailSent).length,
    };
  }
}

export const abandonedCartService = new AbandonedCartService();
