import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider }    from './context/ThemeContext';
import { BrandingProvider } from './context/BrandingContext';
import { LanguageProvider } from './context/LanguageContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { FeatureProvider }     from './context/FeatureContext';
import { PermissionProvider }  from './context/PermissionContext';
import PlanLimitModal from './components/billing/PlanLimitModal';
import { StorefrontThemedHome } from './pages/store/StorefrontThemedPages';
import StoreTenantLegacyRedirect from './components/StoreTenantListRedirect';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const RegisterTenant = lazy(() => import('./pages/RegisterTenant'));
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'));
const Support = lazy(() => import('./pages/Support'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products           = lazy(() => import('./pages/Products'));
const ProductNew         = lazy(() => import('./pages/ProductEdit'));
const ProductEdit        = lazy(() => import('./pages/ProductEdit'));
const Categories         = lazy(() => import('./pages/Categories'));
const Brands             = lazy(() => import('./pages/Brands'));
const Attributes         = lazy(() => import('./pages/Attributes'));
const ProductSearchPage  = lazy(() => import('./pages/ProductSearchPage'));
const ImportExport       = lazy(() => import('./pages/ImportExport'));
const XmlImport          = lazy(() => import('./pages/XmlImport'));
const XmlSources         = lazy(() => import('./pages/XmlSources'));
const Developer          = lazy(() => import('./pages/Developer'));
const Orders = lazy(() => import('./pages/Orders'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const Settings = lazy(() => import('./pages/Settings'));
const DomainSettings = lazy(() => import('./pages/DomainSettings'));
const Reports = lazy(() => import('./pages/Reports'));
const Logs = lazy(() => import('./pages/Logs'));
const Observability = lazy(() => import('./pages/Observability'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const CampaignManagement = lazy(() => import('./pages/CampaignManagement'));
const CouponManagement = lazy(() => import('./pages/CouponManagement'));
const Coupons          = lazy(() => import('./pages/Coupons'));
const ShippingManagement = lazy(() => import('./pages/ShippingManagement'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const TrendyolOrderDetail = lazy(() => import('./pages/TrendyolOrderDetail'));
const Returns = lazy(() => import('./pages/Returns'));
const ReturnDetail = lazy(() => import('./pages/ReturnDetail'));
const Marketing = lazy(() => import('./pages/Marketing'));
const Integrations = lazy(() => import('./pages/Integrations'));
const PageBuilder = lazy(() => import('./pages/PageBuilder'));
const StorefrontBuilder = lazy(() => import('./pages/StorefrontBuilder'));
const BlogManagement = lazy(() => import('./pages/BlogManagement'));
const PagesManagement = lazy(() => import('./pages/PagesManagement'));
const MenusManagement = lazy(() => import('./pages/MenusManagement'));
const StoreContentPage = lazy(() => import('./pages/store/StoreContentPage'));
const MediaLibrary = lazy(() => import('./pages/MediaLibrary'));
const AbandonedCarts = lazy(() => import('./pages/AbandonedCarts'));
const DiscountRules = lazy(() => import('./pages/DiscountRules'));
const TrendyolIntegration  = lazy(() => import('./pages/TrendyolIntegrationPage'));
const TrendyolOrders       = lazy(() => import('./pages/TrendyolOrders'));
const MarketplaceQuestions = lazy(() => import('./pages/MarketplaceQuestions'));
const StoreSettings   = lazy(() => import('./pages/StoreSettings'));
const PaymentSettingsPage = lazy(() => import('./pages/PaymentSettingsPage'));
const ShippingSettingsPage = lazy(() => import('./pages/ShippingSettingsPage'));
const Notifications   = lazy(() => import('./pages/Notifications'));
const SEOManagement   = lazy(() => import('./pages/SEOManagement'));
const StockManagement = lazy(() => import('./pages/StockManagement'));
const PlanSelection   = lazy(() => import('./pages/PlanSelection'));
const PlanStatus = lazy(() => import('./pages/PlanStatus'));
const PlanUpgrade = lazy(() => import('./pages/PlanUpgrade'));
const PaymentMethods = lazy(() => import('./pages/PaymentMethods'));
const BillingHistory = lazy(() => import('./pages/BillingHistory'));
const PaymentResult = lazy(() => import('./pages/PaymentResult'));
const BillingDashboard = lazy(() => import('./pages/BillingDashboard'));
const Invoices         = lazy(() => import('./pages/Invoices'));

// Admin pages
const AdminLayout        = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard     = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminTenants       = lazy(() => import('./pages/admin/AdminTenants'));
const AdminTenantDetail  = lazy(() => import('./pages/admin/AdminTenantDetail'));
const AdminUsers         = lazy(() => import('./pages/admin/AdminUsers'));
const AdminBilling       = lazy(() => import('./pages/admin/AdminBilling'));
const AdminAuditLogs     = lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminSystemLogs    = lazy(() => import('./pages/admin/AdminSystemLogs'));
const AdminFeatureFlags       = lazy(() => import('./pages/admin/AdminFeatureFlags'));
const AdminSupportTickets     = lazy(() => import('./pages/admin/AdminSupportTickets'));
const AdminUserPermissions    = lazy(() => import('./pages/admin/AdminUserPermissions'));
const PanelRouteRedirect = lazy(() => import('./components/PanelRouteRedirect'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const DemoDashboard = lazy(() => import('./pages/DemoDashboard'));
const CustomerSupport = lazy(() => import('./pages/CustomerSupport'));
const AdminSupportPanel = lazy(() => import('./pages/AdminSupportPanel'));
const SystemHealthDashboard = lazy(() => import('./pages/SystemHealthDashboard'));
const KvkkPage = lazy(() => import('./pages/KvkkPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const MesafeliSatisPage = lazy(() => import('./pages/MesafeliSatisPage'));
const IadeVeIptalPage = lazy(() => import('./pages/IadeVeIptalPage'));
const CerezPolitikasiPage = lazy(() => import('./pages/CerezPolitikasiPage'));

// Marketplace pages
const MarketplacePage  = lazy(() => import('./pages/marketplace/MarketplacePage'));
const MarketplaceHub   = lazy(() => import('./pages/MarketplaceHub'));
const MarketplaceDetail = lazy(() => import('./pages/MarketplaceDetail'));

// Storefront (multi-tenant vitrin + tema)
const TenantStorefrontLayout = lazy(() => import('./layouts/TenantStorefrontLayout'));
const Blog = lazy(() => import('./pages/store/Blog'));
const BlogPost = lazy(() => import('./pages/store/BlogPost'));
const OrderConfirmation = lazy(() => import('./pages/store/OrderConfirmation'));

// Default Storefront Theme — ek sayfalar (admin panelden ayrı)
const StoreCartPage       = lazy(() => import('./storefront/pages/StoreCartPage'));
const StoreCheckoutPage   = lazy(() => import('./storefront/pages/StoreCheckoutPage'));
const StoreCategoryPage   = lazy(() => import('./storefront/pages/StoreCategoryPage'));
const StoreProductDetailPage = lazy(() => import('./storefront/pages/StoreProductDetailPage'));
const StoreProductListPage   = lazy(() => import('./storefront/pages/StoreProductListPage'));
const StoreLoginPage      = lazy(() => import('./storefront/pages/StoreLoginPage'));
const StoreForgotPasswordPage = lazy(() => import('./storefront/pages/StoreForgotPasswordPage'));
const StoreResetPasswordPage  = lazy(() => import('./storefront/pages/StoreResetPasswordPage'));
const StoreRegisterPage   = lazy(() => import('./storefront/pages/StoreRegisterPage'));
const StoreAccountPage    = lazy(() => import('./storefront/pages/StoreAccountPage'));
const StoreAccountOverview = lazy(() => import('./storefront/pages/StoreAccountPage').then(m => ({ default: m.StoreAccountOverview })));
const StoreOrdersPage     = lazy(() => import('./storefront/pages/StoreOrdersPage'));
const StoreOrderDetailPage = lazy(() => import('./storefront/pages/StoreOrderDetailPage'));
const StoreAddressesPage  = lazy(() => import('./storefront/pages/StoreAddressesPage'));
const StoreProfilePage    = lazy(() => import('./storefront/pages/StoreProfilePage'));
const StoreReturnRequestsPage = lazy(() => import('./storefront/pages/StoreReturnRequestsPage'));
const StoreFavoritesPage  = lazy(() => import('./storefront/pages/StoreFavoritesPage'));
const StoreOrderSuccessPage = lazy(() => import('./storefront/pages/StoreOrderSuccessPage'));
const StorePaymentPage = lazy(() => import('./storefront/pages/StorePaymentPage'));
const StoreIyzicoPaymentPage = lazy(() => import('./storefront/pages/StoreIyzicoPaymentPage'));
const StorePaymentSuccessPage = lazy(() => import('./storefront/pages/StorePaymentSuccessPage'));
const StorePaymentFailPage = lazy(() => import('./storefront/pages/StorePaymentFailPage'));
const StorePaymentPendingPage = lazy(() => import('./storefront/pages/StorePaymentPendingPage'));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Yükleniyor...</p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <BrandingProvider>
        <ThemeProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <CartProvider>
              <FeatureProvider>
              <PermissionProvider>
              <NotificationProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/register-tenant" element={<RegisterTenant />} />
                  {/* Onboarding Wizard - protected but no onboarding check */}
                  <Route path="/onboarding" element={
                    <ProtectedRoute requireOnboarding={false}>
                      <OnboardingWizard />
                    </ProtectedRoute>
                  } />
                  <Route path="/plans" element={<PlanSelection />} />
                  <Route path="/plan-status" element={<PlanStatus />} />
                  <Route path="/plan-upgrade" element={<PlanUpgrade />} />
                  <Route path="/payment-methods" element={<PaymentMethods />} />
                  <Route path="/billing-history" element={<BillingHistory />} />
                  <Route path="/payment-result" element={<PaymentResult />} />
                  <Route path="/kvkk" element={<KvkkPage />} />
                  <Route path="/gizlilik" element={<PrivacyPage />} />
                  <Route path="/kullanim-sartlari" element={<TermsPage />} />
                  <Route path="/mesafeli-satis-sozlesmesi" element={<MesafeliSatisPage />} />
                  <Route path="/iade-ve-iptal-kosullari" element={<IadeVeIptalPage />} />
                  <Route path="/cerez-politikasi" element={<CerezPolitikasiPage />} />
                  <Route
                    path="/panel/*"
                    element={
                      <ProtectedRoute>
                        <PanelRouteRedirect />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/demo" element={<DemoDashboard />} />
                  <Route path="/customer-support" element={<CustomerSupport />} />
                  <Route path="/support" element={<Navigate to="/customer-support" replace />} />
                  <Route path="/admin-support" element={<AdminSupportPanel />} />
                  <Route path="/system-health" element={<SystemHealthDashboard />} />
                  {/* Convenience route (legacy / requested): redirect to dashboard page */}
                  <Route
                    path="/xml-sources"
                    element={
                      <ProtectedRoute>
                        <Navigate to="/dashboard/xml-sources" replace />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* Store routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/store" element={<TenantStorefrontLayout />}>
                    <Route index element={<StorefrontThemedHome />} />
                    {/* Türkçe vitrin rotaları (Default Storefront Theme) */}
                    <Route path="urunler" element={<StoreProductListPage />} />
                    <Route path="kategori/:slug" element={<StoreCategoryPage />} />
                    <Route path="urun/:slug" element={<StoreProductDetailPage />} />
                    <Route path="sepet" element={<StoreCartPage />} />
                    <Route path="odeme" element={<StoreCheckoutPage />} />
                    <Route path="odeme/paytr/:orderNumber" element={<StorePaymentPage />} />
                    <Route path="odeme/iyzico/:orderNumber" element={<StoreIyzicoPaymentPage />} />
                    <Route path="odeme-bekleniyor/:orderNumber" element={<StorePaymentPendingPage />} />
                    <Route path="odeme-basarili/:orderNumber" element={<StorePaymentSuccessPage />} />
                    <Route path="odeme-basarisiz/:orderNumber" element={<StorePaymentFailPage />} />
                    <Route path="siparis-basarili/:orderNumber" element={<StoreOrderSuccessPage />} />
                    <Route path="giris" element={<StoreLoginPage />} />
                    <Route path="sifremi-unuttum" element={<StoreForgotPasswordPage />} />
                    <Route path="sifre-sifirla" element={<StoreResetPasswordPage />} />
                    <Route path="kayit" element={<StoreRegisterPage />} />
                    <Route path="favoriler" element={<StoreFavoritesPage />} />
                    <Route path="hesabim" element={<StoreAccountPage />}>
                      <Route index element={<StoreAccountOverview />} />
                      <Route path="siparisler" element={<StoreOrdersPage />} />
                      <Route path="siparisler/:orderNumber" element={<StoreOrderDetailPage />} />
                      <Route path="iade-taleplerim" element={<StoreReturnRequestsPage />} />
                      <Route path="iade-taleplerim/:id" element={<StoreReturnRequestsPage />} />
                      <Route path="adresler" element={<StoreAddressesPage />} />
                      <Route path="profil" element={<StoreProfilePage />} />
                    </Route>
                    {/* Geriye dönük uyumluluk */}
                    <Route path="products" element={<StoreProductListPage />} />
                    <Route path="p/:slug" element={<StoreProductDetailPage />} />
                    <Route path="cart" element={<StoreCartPage />} />
                    <Route path="checkout" element={<StoreCheckoutPage />} />
                    <Route path="order-confirmation/:id" element={<OrderConfirmation />} />
                    <Route path="blog" element={<Blog />} />
                    <Route path="blog/:slug" element={<BlogPost />} />
                    <Route path="sayfa/:slug" element={<StoreContentPage />} />
                  </Route>

                  <Route path="/p/:slug" element={<TenantStorefrontLayout />}>
                    <Route index element={<StoreProductDetailPage />} />
                  </Route>

                  {/* Legacy /store/:tenantSlug/* → yeni vitrin (?tenant=) */}
                  <Route path="/store/:tenantSlug/urunler" element={<StoreTenantLegacyRedirect target="list" />} />
                  <Route path="/store/:tenantSlug/products" element={<StoreTenantLegacyRedirect target="list" />} />
                  <Route path="/store/:tenantSlug/category/:categorySlug" element={<StoreTenantLegacyRedirect target="category" />} />
                  <Route path="/store/:tenantSlug/kategori/:categorySlug" element={<StoreTenantLegacyRedirect target="category" />} />
                  <Route path="/store/:tenantSlug/product/:productSlug" element={<StoreTenantLegacyRedirect target="product" />} />
                  <Route path="/store/:tenantSlug/urun/:productSlug" element={<StoreTenantLegacyRedirect target="product" />} />
                  <Route path="/store/:tenantSlug" element={<StoreTenantLegacyRedirect target="home" />} />

                  {/* Dashboard routes */}
                  <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products"             element={<Products />} />
          <Route path="products/new"         element={<ProductNew />} />
          <Route path="products/:id/edit"    element={<ProductEdit />} />
          <Route path="product-search"  element={<ProductSearchPage />} />
          <Route path="import-export"   element={<ImportExport />} />
          <Route path="products/import/xml" element={<XmlImport />} />
          <Route path="xml-sources" element={<XmlSources />} />
          <Route path="developer"       element={<Developer />} />
          <Route path="categories" element={<Categories />} />
          <Route path="brands"     element={<Brands />} />
          <Route path="attributes" element={<Attributes />} />
          <Route path="orders" element={<Orders />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="campaign-management" element={<CampaignManagement />} />
          <Route path="coupons"           element={<Coupons />} />
          <Route path="coupon-management" element={<CouponManagement />} />
          <Route path="shipping-management" element={<ShippingManagement />} />
          <Route path="orders/trendyol/:id" element={<TrendyolOrderDetail />} />
          <Route path="orders/:orderId" element={<OrderDetail />} />
                    <Route path="returns" element={<Returns />} />
                    <Route path="returns/:id" element={<ReturnDetail />} />
          <Route path="checkout" element={<Navigate to="/dashboard/orders" replace />} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="page-builder" element={<PageBuilder />} />
          <Route path="storefront-builder" element={<StorefrontBuilder />} />
          <Route path="blog-management" element={<BlogManagement />} />
          <Route path="pages" element={<PagesManagement />} />
          <Route path="menus" element={<MenusManagement />} />
          <Route path="pages-management" element={<Navigate to="/dashboard/pages" replace />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="cart-management" element={<Navigate to="/dashboard/abandoned-carts" replace />} />
          <Route path="product-variants" element={<Navigate to="/dashboard/products" replace />} />
          <Route path="abandoned-carts" element={<AbandonedCarts />} />
          <Route path="discount-rules" element={<DiscountRules />} />
          <Route path="b2b-customers" element={<Navigate to="/dashboard/customers" replace />} />
          <Route path="trendyol-integration" element={<TrendyolIntegration />} />
          <Route path="trendyol-orders"      element={<TrendyolOrders />} />
          <Route path="marketplace-questions" element={<MarketplaceQuestions />} />
          <Route path="marketplace"          element={<MarketplacePage />} />
          <Route path="marketplaces"         element={<MarketplaceHub />} />
          <Route path="marketplaces/:slug"   element={<MarketplaceDetail />} />
          <Route path="store-settings"       element={<StoreSettings />} />
          <Route path="notifications"        element={<Notifications />} />
          <Route path="seo"                  element={<SEOManagement />} />
          <Route path="stock"                element={<StockManagement />} />
          <Route path="support"              element={<Support />} />
          <Route path="settings"             element={<Settings />} />
          <Route path="settings/payments"     element={<PaymentSettingsPage />} />
          <Route path="settings/shipping"    element={<ShippingSettingsPage />} />
          <Route path="billing"   element={<BillingDashboard />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="domain" element={<DomainSettings />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="api-tokens" element={<Navigate to="/dashboard/developer" replace />} />
          <Route path="reports"     element={<Reports />} />
          <Route path="observability" element={<Observability />} />
          <Route 
            path="logs" 
            element={
              <AdminRoute requireAdmin>
                <Logs />
              </AdminRoute>
            } 
          />
        </Route>

        {/* Super Admin Panel — yalnızca SUPER_ADMIN */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireSuperAdmin requireOnboarding={false}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index                   element={<AdminDashboard />} />
          <Route path="tenants"          element={<AdminTenants />} />
          <Route path="tenants/:id"      element={<AdminTenantDetail />} />
          <Route path="users"            element={<AdminUsers />} />
          <Route path="billing"          element={<AdminBilling />} />
          <Route path="support"          element={<AdminSupportTickets />} />
          <Route path="audit-logs"            element={<AdminAuditLogs />} />
          <Route path="system-logs"           element={<AdminSystemLogs />} />
          <Route path="users/:userId/permissions" element={<AdminUserPermissions />} />
          <Route path="feature-flags"    element={<AdminFeatureFlags />} />
        </Route>

        {/* Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PlanLimitModal />
    </Suspense>
  </NotificationProvider>
</PermissionProvider>
</FeatureProvider>
</CartProvider>
</CurrencyProvider>
</LanguageProvider>
</ThemeProvider>
</BrandingProvider>
</BrowserRouter>
</ErrorBoundary>
  );
}

export default App;
