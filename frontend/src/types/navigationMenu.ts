export type NavigationMenuType = 'HEADER' | 'FOOTER';

export type MenuLinkType = 'page' | 'category' | 'blog' | 'product' | 'custom';

export type NavigationMenuItem = {
  id: string;
  menuId: string;
  tenantId: string;
  label: string;
  linkType: MenuLinkType;
  targetId: string | null;
  url: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  openInNewTab: boolean;
};

export type TenantNavigationMenu = {
  id: string;
  tenantId: string;
  title: string;
  type: NavigationMenuType;
  items: NavigationMenuItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type NavigationMenuOptions = {
  pages: Array<{ id: string; title: string; slug: string; status: string; isPublished?: boolean }>;
  posts: Array<{ id: string; title: string; slug: string; isPublished: boolean }>;
  categories: Array<{ id: string; name: string; slug: string; path: string }>;
  products: Array<{ id: string; name: string; slug: string; status: string; sku?: string | null }>;
};

export type ResolvedNavItem = {
  id: string;
  label: string;
  href: string;
  openInNewTab: boolean;
  parentId: string | null;
  linkType: string;
};
