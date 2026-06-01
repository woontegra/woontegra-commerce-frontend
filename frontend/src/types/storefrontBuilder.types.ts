export type StorefrontBlockType =
  | 'hero'
  | 'categoryGrid'
  | 'featuredProducts'
  | 'campaignBanner'
  | 'trustBadges'
  | 'textImage'
  | string;

export interface StorefrontSection {
  id: string;
  type: string;
  enabled: boolean;
  settings: Record<string, unknown>;
}

export interface StorefrontLayout {
  version: number;
  theme: Record<string, unknown>;
  sections: StorefrontSection[];
}

export interface StorefrontDraftMeta {
  isDefault: boolean;
  status: string;
  version: number;
  publishedAt: string | null;
  updatedAt: string | null;
  hasPublished: boolean;
}

export type StorefrontDraftLoadResult =
  | { ok: true; layout: StorefrontLayout; meta: StorefrontDraftMeta }
  | { ok: false; message: string };
