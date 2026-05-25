import { Link } from 'react-router-dom';
import type { Stats } from '../../../pages/TrendyolIntegration';

const fmt = new Intl.NumberFormat('tr-TR');

interface CompletedStepProps {
  stats: Stats | undefined;
  onRestart?: () => void;
}

export function CompletedStep({ stats, onRestart }: CompletedStepProps) {
  const sent = stats?.sent ?? 0;
  const errors = stats?.errors ?? 0;
  const total = stats?.totalProducts ?? stats?.total ?? 0;

  return (
    <div className="max-w-lg mx-auto text-center space-y-6 py-8">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-green-100 flex items-center justify-center text-3xl">
        ✓
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Trendyol kurulumu tamamlandı</h2>
        <p className="text-sm text-gray-500 mt-2">
          Ürünleriniz gönderildi ve fiyat ayarları kaydedildi. İstediğiniz zaman bu sayfadan senkronize edebilirsiniz.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-left">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Gönderilen</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmt.format(sent)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Hatalı</p>
          <p className={`text-2xl font-bold mt-1 ${errors > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {fmt.format(errors)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Toplam</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{fmt.format(total)}</p>
        </div>
      </div>

      {errors > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {errors} üründe hata var. Ürün Gönder adımına dönerek detayları inceleyebilirsiniz.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/dashboard/products"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold"
        >
          Ürünlere Git
        </Link>
        {onRestart && (
          <button
            type="button"
            onClick={onRestart}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Kuruluma Dön
          </button>
        )}
      </div>
    </div>
  );
}
