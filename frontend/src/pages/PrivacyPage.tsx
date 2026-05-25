import LegalTemplate from '../components/legal/LegalTemplate';

export default function PrivacyPage() {
  return (
    <LegalTemplate title="Gizlilik Politikası" updatedAt="26.04.2026">
      <p>Bu politika Woontegra SaaS platformunda veri toplama ve kullanma yöntemlerini açıklar.</p>
      <h3>Toplanan Bilgiler</h3>
      <p>Hesap bilgileri, mağaza verileri, işlem logları ve teknik telemetri toplanabilir.</p>
      <h3>Veri Güvenliği</h3>
      <p>Veriler erişim kontrolü, şifreleme, denetim logları ve yedekleme politikaları ile korunur.</p>
      <h3>Üçüncü Taraflar</h3>
      <p>Ödeme, e-posta ve altyapı hizmet sağlayıcılarıyla yalnızca gerekli kapsamda veri paylaşılır.</p>
    </LegalTemplate>
  );
}
