import { ProductsTab, type TabId } from '../../../pages/TrendyolIntegration';

const noopNav = (_tab: TabId) => {};

interface ProductSendStepProps {
  isActive: boolean;
  onContinue: () => void;
  onBack: () => void;
}

export function ProductSendStep({ isActive, onContinue, onBack }: ProductSendStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Kategoriye göre filtreleyin, ürünleri seçin ve Trendyol&apos;a gönderin. Hatalı ürünler kırmızı rozetle işaretlenir.
      </p>
      <ProductsTab
        onNavigate={noopNav}
        isActive={isActive}
        flowMode
        onContinue={onContinue}
      />
      <div className="flex justify-start pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← Geri
        </button>
      </div>
    </div>
  );
}
