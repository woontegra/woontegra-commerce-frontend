import type { 
  Campaign, 
  Cart, 
  CartItem, 
  CampaignApplicationResult,
  AppliedCampaign,
  UserGroup
} from '../types/advancedCampaign';

class CampaignEngineService {
  // Main function: Apply campaigns to cart
  applyCampaigns(
    cart: Cart, 
    campaigns: Campaign[], 
    userGroup: UserGroup = 'all'
  ): Cart {
    let updatedCart = { ...cart };
    const appliedCampaigns: AppliedCampaign[] = [];
    let totalDiscount = 0;

    // Sort campaigns by priority (highest discount first)
    const sortedCampaigns = this.sortCampaignsByPriority(campaigns);

    for (const campaign of sortedCampaigns) {
      // Check if campaign is applicable
      if (!this.isCampaignApplicable(campaign, updatedCart, userGroup)) {
        continue;
      }

      // Apply campaign
      const result = this.applyCampaign(campaign, updatedCart);

      if (result.success && result.appliedCampaign) {
        appliedCampaigns.push(result.appliedCampaign);
        totalDiscount += result.discountAmount;

        // Update cart items with discounted prices
        updatedCart = this.updateCartWithDiscount(updatedCart, result.appliedCampaign);
      }
    }

    // Calculate final totals
    const subtotal = updatedCart.items.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
    const total = Math.max(0, subtotal - totalDiscount);

    return {
      ...updatedCart,
      subtotal,
      discount: totalDiscount,
      total,
      appliedCampaigns,
    };
  }

  // Apply single campaign
  private applyCampaign(campaign: Campaign, cart: Cart): CampaignApplicationResult {
    switch (campaign.type) {
      case 'percentage':
        return this.applyPercentageCampaign(campaign, cart);
      
      case 'fixed':
        return this.applyFixedCampaign(campaign, cart);
      
      case 'bxgy':
        return this.applyBXGYCampaign(campaign, cart);
      
      default:
        return { success: false, discountAmount: 0, message: 'Unknown campaign type' };
    }
  }

  // PERCENTAGE CAMPAIGN (e.g., 10% off)
  private applyPercentageCampaign(campaign: Campaign, cart: Cart): CampaignApplicationResult {
    const targetItems = this.getTargetItems(campaign, cart);
    
    if (targetItems.length === 0) {
      return { success: false, discountAmount: 0, message: 'No target items in cart' };
    }

    const targetTotal = targetItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discountAmount = (targetTotal * campaign.value) / 100;

    // Apply max discount limit
    if (campaign.target.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, campaign.target.maxDiscountAmount);
    }

    return {
      success: true,
      discountAmount,
      appliedCampaign: {
        campaignId: campaign.id,
        campaignName: campaign.name,
        campaignType: 'percentage',
        discountAmount,
        affectedItems: targetItems.map(item => item.id),
      },
    };
  }

  // FIXED CAMPAIGN (e.g., 50 TL off)
  private applyFixedCampaign(campaign: Campaign, cart: Cart): CampaignApplicationResult {
    const targetItems = this.getTargetItems(campaign, cart);
    
    if (targetItems.length === 0) {
      return { success: false, discountAmount: 0, message: 'No target items in cart' };
    }

    const discountAmount = campaign.value;

    return {
      success: true,
      discountAmount,
      appliedCampaign: {
        campaignId: campaign.id,
        campaignName: campaign.name,
        campaignType: 'fixed',
        discountAmount,
        affectedItems: targetItems.map(item => item.id),
      },
    };
  }

  // BXGY CAMPAIGN (e.g., Buy 3 Pay 2)
  private applyBXGYCampaign(campaign: Campaign, cart: Cart): CampaignApplicationResult {
    if (!campaign.bxgyConfig) {
      return { success: false, discountAmount: 0, message: 'BXGY config missing' };
    }

    const { buy, pay } = campaign.bxgyConfig;
    const targetItems = this.getTargetItems(campaign, cart);
    
    if (targetItems.length === 0) {
      return { success: false, discountAmount: 0, message: 'No target items in cart' };
    }

    // Calculate total quantity
    const totalQuantity = targetItems.reduce((sum, item) => sum + item.quantity, 0);

    // Check if eligible for BXGY
    if (totalQuantity < buy) {
      return { success: false, discountAmount: 0, message: `Need ${buy} items for this offer` };
    }

    // Calculate how many free items
    const sets = Math.floor(totalQuantity / buy);
    const freeItems = sets * (buy - pay);

    // Sort items by price (cheapest first for free items)
    const sortedItems = [...targetItems].sort((a, b) => a.price - b.price);

    // Calculate discount (sum of cheapest items)
    let discountAmount = 0;
    let remainingFreeItems = freeItems;

    for (const item of sortedItems) {
      if (remainingFreeItems === 0) break;

      const freeFromThisItem = Math.min(item.quantity, remainingFreeItems);
      discountAmount += freeFromThisItem * item.price;
      remainingFreeItems -= freeFromThisItem;
    }

    return {
      success: true,
      discountAmount,
      appliedCampaign: {
        campaignId: campaign.id,
        campaignName: campaign.name,
        campaignType: 'bxgy',
        discountAmount,
        affectedItems: targetItems.map(item => item.id),
      },
    };
  }

  // Check if campaign is applicable
  private isCampaignApplicable(campaign: Campaign, cart: Cart, userGroup: UserGroup): boolean {
    // Check if active
    if (!campaign.active) return false;

    // Check date range
    const now = new Date();
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);

    if (now < startDate || now > endDate) return false;

    // Check user group
    if (campaign.target.userGroup && campaign.target.userGroup !== 'all' && campaign.target.userGroup !== userGroup) {
      return false;
    }

    // Check minimum cart amount
    if (campaign.target.minCartAmount) {
      const cartTotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      if (cartTotal < campaign.target.minCartAmount) return false;
    }

    return true;
  }

  // Get target items based on campaign targeting
  private getTargetItems(campaign: Campaign, cart: Cart): CartItem[] {
    const { productIds, categoryIds } = campaign.target;

    // If no targeting specified, apply to all items
    if (!productIds && !categoryIds) {
      return cart.items;
    }

    return cart.items.filter(item => {
      // Product-based targeting
      if (productIds && productIds.length > 0) {
        if (productIds.includes(item.productId)) return true;
      }

      // Category-based targeting
      if (categoryIds && categoryIds.length > 0) {
        if (categoryIds.includes(item.categoryId)) return true;
      }

      return false;
    });
  }

  // Update cart items with discount
  private updateCartWithDiscount(cart: Cart, appliedCampaign: AppliedCampaign): Cart {
    const updatedItems = cart.items.map(item => {
      if (appliedCampaign.affectedItems.includes(item.id)) {
        // Calculate item's share of discount
        const itemTotal = item.price * item.quantity;
        const affectedTotal = cart.items
          .filter(i => appliedCampaign.affectedItems.includes(i.id))
          .reduce((sum, i) => sum + (i.price * i.quantity), 0);
        
        const itemDiscount = (itemTotal / affectedTotal) * appliedCampaign.discountAmount;
        const discountedPrice = Math.max(0, item.price - (itemDiscount / item.quantity));

        return {
          ...item,
          price: discountedPrice,
        };
      }
      return item;
    });

    return {
      ...cart,
      items: updatedItems,
    };
  }

  // Sort campaigns by priority (highest discount first)
  private sortCampaignsByPriority(campaigns: Campaign[]): Campaign[] {
    return [...campaigns].sort((a, b) => {
      // Active campaigns first
      if (a.active !== b.active) return a.active ? -1 : 1;

      // BXGY has highest priority
      if (a.type === 'bxgy' && b.type !== 'bxgy') return -1;
      if (a.type !== 'bxgy' && b.type === 'bxgy') return 1;

      // Then by value (for percentage and fixed)
      return b.value - a.value;
    });
  }

  // Get best campaign for a product
  getBestCampaignForProduct(
    productId: string, 
    categoryId: string, 
    campaigns: Campaign[]
  ): Campaign | null {
    const applicableCampaigns = campaigns.filter(campaign => {
      if (!campaign.active) return false;

      const now = new Date();
      const startDate = new Date(campaign.startDate);
      const endDate = new Date(campaign.endDate);
      if (now < startDate || now > endDate) return false;

      const { productIds, categoryIds } = campaign.target;
      
      if (productIds && productIds.includes(productId)) return true;
      if (categoryIds && categoryIds.includes(categoryId)) return true;
      if (!productIds && !categoryIds) return true;

      return false;
    });

    if (applicableCampaigns.length === 0) return null;

    // Return campaign with highest discount
    return this.sortCampaignsByPriority(applicableCampaigns)[0];
  }
}

export const campaignEngineService = new CampaignEngineService();
