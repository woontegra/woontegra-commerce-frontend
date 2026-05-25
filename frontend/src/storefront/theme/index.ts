/**
 * Default Storefront Theme — tema modülü (themes/registry ile uyumlu)
 */
import type { StorefrontThemeModule } from '../../themes/types';
import StorefrontLayout from '../layouts/StorefrontLayout';
import StoreHomePage from '../pages/StoreHomePage';
import StoreProductListPage from '../pages/StoreProductListPage';
import StoreProductDetailPage from '../pages/StoreProductDetailPage';

export const defaultStorefrontTheme: StorefrontThemeModule = {
  Layout:         StorefrontLayout,
  HomePage:       StoreHomePage,
  ProductList:    StoreProductListPage,
  ProductDetail:  StoreProductDetailPage,
};

export default defaultStorefrontTheme;
