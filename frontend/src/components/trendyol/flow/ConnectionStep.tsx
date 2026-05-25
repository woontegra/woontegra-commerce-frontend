import type { Stats } from '../../../pages/TrendyolIntegration';
import { SetupTab } from '../../../pages/TrendyolIntegration';

interface ConnectionStepProps {
  stats: Stats | undefined;
  onContinue: () => void;
}

export function ConnectionStep({ stats, onContinue }: ConnectionStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Trendyol Satıcı Paneli → Hesabım → Entegrasyon Bilgileri bölümünden API bilgilerinizi alın.
        Kaydettikten sonra bağlantıyı test edin; başarılı olunca bir sonraki adıma geçebilirsiniz.
      </p>
      <SetupTab stats={stats} flowMode onContinue={onContinue} />
    </div>
  );
}
