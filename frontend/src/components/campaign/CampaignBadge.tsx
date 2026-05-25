import type { Campaign } from '../../types/campaign';

interface CampaignBadgeProps {
  campaign: Campaign;
  discount: number;
}

export default function CampaignBadge({ campaign, discount }: CampaignBadgeProps) {
  const getDiscountText = () => {
    switch (campaign.discount.type) {
      case 'percentage_discount':
        return `%${campaign.discount.percentage} İndirim`;
      
      case 'fixed_discount':
        return `₺${campaign.discount.amount} İndirim`;
      
      case 'buy_x_get_y':
        return `${campaign.discount.buyQuantity} Al ${campaign.discount.getQuantity} Öde`;
      
      case 'category_discount':
        return `%${campaign.discount.percentage} Kategori İndirimi`;
      
      default:
        return 'İndirim';
    }
  };

  const getBadgeColor = () => {
    switch (campaign.discount.type) {
      case 'percentage_discount':
        return 'bg-gradient-to-r from-red-500 to-pink-500';
      
      case 'fixed_discount':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      
      case 'buy_x_get_y':
        return 'bg-gradient-to-r from-green-500 to-emerald-500';
      
      case 'category_discount':
        return 'bg-gradient-to-r from-purple-500 to-indigo-500';
      
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <div className={`${getBadgeColor()} text-white px-3 py-1.5 rounded-lg shadow-lg`}>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className="text-sm font-bold">
            {getDiscountText()}
          </span>
        </div>
      </div>
      
      {discount > 0 && (
        <div className="text-xs text-center font-medium text-green-600 dark:text-green-400">
          ₺{discount.toFixed(2)} tasarruf
        </div>
      )}
    </div>
  );
}
