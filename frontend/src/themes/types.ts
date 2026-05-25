import type { ComponentType, ReactNode } from 'react';
import type { StorefrontTenantInfo } from '../contexts/StorefrontTenantContext';

export type ThemeLayoutProps = {
  children:   ReactNode;
  tenant:     StorefrontTenantInfo;
  storeLink:  (path: string) => string;
};

export type StorefrontThemeModule = {
  Layout:         ComponentType<ThemeLayoutProps>;
  HomePage:       ComponentType;
  ProductList:    ComponentType;
  ProductDetail:  ComponentType;
};
