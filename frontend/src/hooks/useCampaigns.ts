import { useMemo } from 'react';
import type { Campaign, CampaignValidation } from '../types/campaign';

interface CampaignContext {
  userId?: string;
  userRole?: string;
  productIds: string[];
  categoryIds: string[];
  cartTotal: number;
  quantity: number;
  productPrice: number;
}

interface UseCampaignsProps {
  campaigns: Campaign[];
  userId?: string;
  userRole?: string;
  productIds: string[];
  categoryIds: string[];
  cartTotal: number;
  quantity: number;
  productPrice: number;
}

function isCampaignActive(campaign: Campaign): boolean {
  if (!campaign.isActive) return false;
  const now = new Date();
  return now >= new Date(campaign.startDate) && now <= new Date(campaign.endDate);
}

function matchesRules(campaign: Campaign, ctx: CampaignContext): boolean {
  for (const rule of campaign.rules) {
    switch (rule.type) {
      case 'user_specific':
        if (rule.userIds?.length && ctx.userId && !rule.userIds.includes(ctx.userId)) return false;
        if (rule.userRoles?.length && ctx.userRole && !rule.userRoles.includes(ctx.userRole)) return false;
        break;
      case 'product_based':
        if (rule.productIds?.length && !rule.productIds.some(id => ctx.productIds.includes(id))) return false;
        if (rule.excludeProductIds?.length && rule.excludeProductIds.some(id => ctx.productIds.includes(id))) return false;
        break;
      case 'category_based':
        if (rule.categoryIds?.length && !rule.categoryIds.some(id => ctx.categoryIds.includes(id))) return false;
        break;
      case 'cart_total':
        if (rule.minCartTotal != null && ctx.cartTotal < rule.minCartTotal) return false;
        if (rule.maxCartTotal != null && ctx.cartTotal > rule.maxCartTotal) return false;
        break;
      case 'quantity_based':
        if (rule.minQuantity != null && ctx.quantity < rule.minQuantity) return false;
        if (rule.maxQuantity != null && ctx.quantity > rule.maxQuantity) return false;
        break;
    }
  }
  return true;
}

function calculateDiscount(campaign: Campaign, ctx: CampaignContext): number {
  const { discount } = campaign;
  const base = ctx.productPrice * ctx.quantity || ctx.cartTotal;

  switch (discount.type) {
    case 'percentage_discount': {
      const raw = base * ((discount.percentage ?? 0) / 100);
      return discount.maxDiscount != null ? Math.min(discount.maxDiscount, raw) : raw;
    }
    case 'fixed_discount':
      return discount.amount ?? 0;
    default:
      return 0;
  }
}

function getApplicableCampaigns(campaigns: Campaign[], ctx: CampaignContext): CampaignValidation[] {
  return campaigns
    .filter(c => isCampaignActive(c) && matchesRules(c, ctx))
    .map(campaign => ({
      isValid: true,
      campaign,
      discount: calculateDiscount(campaign, ctx),
    }));
}

function getBestCampaign(campaigns: Campaign[], ctx: CampaignContext): CampaignValidation | null {
  const applicable = getApplicableCampaigns(campaigns, ctx);
  if (applicable.length === 0) return null;
  return applicable.reduce((best, curr) => (curr.discount > best.discount ? curr : best));
}

export function useCampaigns({
  campaigns,
  userId,
  userRole,
  productIds,
  categoryIds,
  cartTotal,
  quantity,
  productPrice,
}: UseCampaignsProps) {
  const context = useMemo(() => ({
    userId,
    userRole,
    productIds,
    categoryIds,
    cartTotal,
    quantity,
    productPrice,
  }), [userId, userRole, productIds, categoryIds, cartTotal, quantity, productPrice]);

  const applicableCampaigns = useMemo(() => {
    return getApplicableCampaigns(campaigns, context);
  }, [campaigns, context]);

  const bestCampaign = useMemo(() => {
    return getBestCampaign(campaigns, context);
  }, [campaigns, context]);

  const totalDiscount = useMemo(() => {
    return applicableCampaigns.reduce((sum: number, result: CampaignValidation) => sum + result.discount, 0);
  }, [applicableCampaigns]);

  const activeCampaign = bestCampaign;

  return {
    applicableCampaigns,
    bestCampaign,
    activeCampaign,
    totalDiscount,
    hasActiveCampaign: !!activeCampaign,
  };
}
