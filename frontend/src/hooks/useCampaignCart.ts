import { useState, useEffect } from 'react';
import type { Cart, Campaign, UserGroup } from '../types/advancedCampaign';
import { campaignEngineService } from '../services/campaignEngine.service';

export function useCampaignCart(
  initialCart: Cart,
  campaigns: Campaign[],
  userGroup: UserGroup = 'all'
) {
  const [cart, setCart] = useState<Cart>(initialCart);

  useEffect(() => {
    // Apply campaigns whenever cart or campaigns change
    const updatedCart = campaignEngineService.applyCampaigns(
      initialCart,
      campaigns,
      userGroup
    );
    setCart(updatedCart);
  }, [initialCart, campaigns, userGroup]);

  return cart;
}
