import type { LucideIcon } from 'lucide-react';
import {
  Grid3x3,
  ImageIcon,
  LayoutTemplate,
  Megaphone,
  ShieldCheck,
  ShoppingBag,
  TextQuote,
} from 'lucide-react';
import type { StorefrontBlockType } from '../../types/storefrontBuilder.types';

export const BLOCK_ICONS: Record<StorefrontBlockType, LucideIcon> = {
  hero: LayoutTemplate,
  categoryGrid: Grid3x3,
  featuredProducts: ShoppingBag,
  campaignBanner: Megaphone,
  trustBadges: ShieldCheck,
  textImage: TextQuote,
};

export const BLOCK_ICON_COLORS: Record<StorefrontBlockType, string> = {
  hero: 'bg-indigo-100 text-indigo-600',
  categoryGrid: 'bg-violet-100 text-violet-600',
  featuredProducts: 'bg-emerald-100 text-emerald-600',
  campaignBanner: 'bg-amber-100 text-amber-600',
  trustBadges: 'bg-sky-100 text-sky-600',
  textImage: 'bg-rose-100 text-rose-600',
};

export { ImageIcon };
