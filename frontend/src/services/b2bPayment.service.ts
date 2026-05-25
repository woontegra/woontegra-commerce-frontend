import type { User, B2BPaymentMethod } from '../types/b2b';

class B2BPaymentService {
  // Get available payment methods for user
  getAvailablePaymentMethods(user: User, orderTotal: number): B2BPaymentMethod[] {
    const allMethods = this.getAllPaymentMethods();

    return allMethods.filter(method => {
      // Check if available for user group
      if (!method.availableFor.includes(user.group)) return false;

      // Check amount limits
      if (method.minAmount && orderTotal < method.minAmount) return false;
      if (method.maxAmount && orderTotal > method.maxAmount) return false;

      // Check credit limit for on_credit
      if (method.type === 'on_credit' && user.b2bProfile) {
        const availableCredit = user.b2bProfile.creditLimit - user.b2bProfile.currentDebt;
        if (orderTotal > availableCredit) return false;
      }

      return true;
    });
  }

  // Get all payment methods (mock)
  private getAllPaymentMethods(): B2BPaymentMethod[] {
    // In production: fetch from API
    // const response = await fetch('/api/b2b/payment-methods');
    // return response.json();

    return [
      {
        id: 'credit_card',
        name: 'Kredi Kartı',
        type: 'credit_card',
        availableFor: ['normal', 'bayi'],
        installments: [1, 3, 6, 9, 12],
        fee: 2.5, // %2.5 işlem ücreti
      },
      {
        id: 'bank_transfer',
        name: 'Havale/EFT',
        type: 'bank_transfer',
        availableFor: ['normal', 'bayi'],
        fee: 0,
      },
      {
        id: 'on_credit_30',
        name: 'Vadeli Ödeme (30 Gün)',
        type: 'on_credit',
        availableFor: ['bayi'],
        paymentTerms: 30,
        minAmount: 1000,
      },
      {
        id: 'on_credit_60',
        name: 'Vadeli Ödeme (60 Gün)',
        type: 'on_credit',
        availableFor: ['bayi'],
        paymentTerms: 60,
        minAmount: 5000,
      },
      {
        id: 'on_credit_90',
        name: 'Vadeli Ödeme (90 Gün)',
        type: 'on_credit',
        availableFor: ['bayi'],
        paymentTerms: 90,
        minAmount: 10000,
      },
      {
        id: 'cash',
        name: 'Kapıda Ödeme',
        type: 'cash',
        availableFor: ['normal'],
        maxAmount: 5000,
      },
    ];
  }

  // Calculate payment fee
  calculatePaymentFee(method: B2BPaymentMethod, orderTotal: number): number {
    if (!method.fee) return 0;
    return (orderTotal * method.fee) / 100;
  }

  // Calculate due date
  calculateDueDate(paymentTerms: number): Date {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    return dueDate;
  }

  // Check credit availability
  checkCreditAvailability(user: User, orderTotal: number): {
    available: boolean;
    creditLimit: number;
    currentDebt: number;
    availableCredit: number;
    requiredCredit: number;
  } {
    if (!user.b2bProfile) {
      return {
        available: false,
        creditLimit: 0,
        currentDebt: 0,
        availableCredit: 0,
        requiredCredit: orderTotal,
      };
    }

    const creditLimit = user.b2bProfile.creditLimit;
    const currentDebt = user.b2bProfile.currentDebt;
    const availableCredit = creditLimit - currentDebt;
    const available = availableCredit >= orderTotal;

    return {
      available,
      creditLimit,
      currentDebt,
      availableCredit,
      requiredCredit: orderTotal,
    };
  }

  // Get payment method display
  getPaymentMethodDisplay(method: B2BPaymentMethod, orderTotal: number): {
    name: string;
    description: string;
    fee: number;
    feeText?: string;
    badge?: string;
  } {
    const fee = this.calculatePaymentFee(method, orderTotal);
    
    let description = method.name;
    let badge: string | undefined;

    if (method.type === 'on_credit') {
      description = `${method.name} - ${method.paymentTerms} gün vade`;
      badge = 'Vadeli';
    }

    if (method.type === 'credit_card' && method.installments) {
      description = `${method.name} - ${method.installments.length} taksit seçeneği`;
    }

    return {
      name: method.name,
      description,
      fee,
      feeText: fee > 0 ? `+₺${fee.toFixed(2)} işlem ücreti` : undefined,
      badge,
    };
  }
}

export const b2bPaymentService = new B2BPaymentService();
