import {
  CategoryMappingTab,
  BrandMappingTab,
  AttributeMappingTab,
  type TabId,
} from '../../../pages/TrendyolIntegration';
import { useMatchingCompletion } from './useMatchingCompletion';

const noopNav = (_tab: TabId) => {};

interface MatchingStepProps {
  onContinue: () => void;
  onBack: () => void;
}

function CompletionChip({
  label,
  done,
  detail,
}: {
  label: string;
  done: boolean;
  detail: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
        done ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}
    >
      <span className="font-bold">{done ? '✔' : '○'}</span>
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs opacity-80">{detail}</p>
      </div>
    </div>
  );
}

export function MatchingStep({ onContinue, onBack }: MatchingStepProps) {
  const {
    loading,
    categoriesComplete,
    brandsComplete,
    attributeComplete,
    matchingComplete,
    localCategoryCount,
    mappedCategoryCount,
    brandMappingCount,
  } = useMatchingCompletion();

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Tüm eşleştirmeleri bu sayfada tamamlayın. Her bölüm kaydedildiğinde üstteki durum güncellenir.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CompletionChip
          label="Kategori"
          done={categoriesComplete}
          detail={
            loading
              ? 'Yükleniyor…'
              : localCategoryCount === 0
                ? 'Yerel kategori yok'
                : `${mappedCategoryCount} / ${localCategoryCount} eşleşti`
          }
        />
        <CompletionChip
          label="Marka"
          done={brandsComplete}
          detail={loading ? 'Yükleniyor…' : `${brandMappingCount} marka eşleşmesi`}
        />
        <CompletionChip
          label="Özellik"
          done={attributeComplete}
          detail={loading ? 'Yükleniyor…' : attributeComplete ? 'Kayıtlı eşleme var' : 'Zorunlu özellikleri doldurun'}
        />
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">Kategori eşleştirme</h2>
        <CategoryMappingTab onNavigate={noopNav} flowMode />
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">Marka eşleştirme</h2>
        <BrandMappingTab onNavigate={noopNav} flowMode />
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">Özellik eşleştirme</h2>
        <AttributeMappingTab onNavigate={noopNav} flowMode />
      </section>

      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← Geri
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!matchingComplete}
          title={matchingComplete ? undefined : 'Marka ve özellik eşleştirmelerini tamamlayın'}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Devam Et
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
