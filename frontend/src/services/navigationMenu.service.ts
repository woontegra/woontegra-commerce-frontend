import api from './api';
import type {
  NavigationMenuOptions,
  NavigationMenuType,
  NavigationMenuItem,
  TenantNavigationMenu,
} from '../types/navigationMenu';

export type MenuItemPayload = {
  label: string;
  linkType: string;
  targetId?: string | null;
  url?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  openInNewTab?: boolean;
};

export async function fetchNavigationMenus(): Promise<{
  header: TenantNavigationMenu;
  footer: TenantNavigationMenu;
}> {
  const res = await api.get('/navigation-menus');
  const data = res.data?.data ?? res.data;
  return {
    header: data.header,
    footer: data.footer,
  };
}

export async function fetchNavigationMenuOptions(
  productQ?: string,
): Promise<NavigationMenuOptions> {
  const res = await api.get('/navigation-menus/options', {
    params: productQ?.trim() ? { productQ: productQ.trim() } : undefined,
  });
  return res.data?.data ?? res.data;
}

export async function saveNavigationMenu(
  type: NavigationMenuType,
  payload: { title: string; items: MenuItemPayload[] },
): Promise<TenantNavigationMenu> {
  const res = await api.put(`/navigation-menus/${type}`, payload);
  return res.data?.data ?? res.data;
}

export function emptyMenuItem(sortOrder = 0): MenuItemPayload {
  return {
    label: '',
    linkType: 'custom',
    targetId: null,
    url: '',
    parentId: null,
    sortOrder,
    isActive: true,
    openInNewTab: false,
  };
}

export function menuItemFromRecord(item: NavigationMenuItem): MenuItemPayload {
  return {
    label: item.label,
    linkType: item.linkType,
    targetId: item.targetId,
    url: item.url ?? '',
    parentId: item.parentId,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
    openInNewTab: item.openInNewTab,
  };
}
