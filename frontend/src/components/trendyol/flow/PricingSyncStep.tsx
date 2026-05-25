import { SyncTab, type TabId } from '../../../pages/TrendyolIntegration';

const noopNav = (_tab: TabId) => {};

interface PricingSyncStepProps {
  onContinue: () => void;
  onBack: () => void;
}

export function PricingSyncStep({ onContinue, onBack }: PricingSyncStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Global fiyat stratejisi sayfanın üstündeki Genel Ayarlar panelinden yönetilir. Burada toplu fiyat değişimi ve fiyat/stok senkronu yapabilirsiniz.
      </p>

      <section>
        <h2 className="text-base font-bold text-gray-900 mb-3">Fiyat, stok ve toplu güncelleme</h2>
        <SyncTab onNavigate={noopNav} flowMode onContinue={onContinue} showBulkPrice />
      </section>

      <div className="flex justify-start">
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
