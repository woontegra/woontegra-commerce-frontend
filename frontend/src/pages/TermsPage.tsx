import LegalTemplate from '../components/legal/LegalTemplate';

export default function TermsPage() {
  return (
    <LegalTemplate title="Kullanım Şartları" updatedAt="26.04.2026">
      <p>Woontegra hesabı oluşturarak bu şartları kabul etmiş olursunuz.</p>
      <h3>Hizmet Kullanımı</h3>
      <p>Platform yalnızca yasal ticari faaliyetler için kullanılabilir; kötüye kullanım durumunda erişim sınırlandırılabilir.</p>
      <h3>Abonelik ve Ödemeler</h3>
      <p>Plan ücretleri seçilen dönem için tahsil edilir. Yükseltme ve düşürme işlemleri panelden yönetilir.</p>
      <h3>Sorumluluk Sınırı</h3>
      <p>Yasal zorunluluklar saklı kalmak kaydıyla, hizmetin kesintisizliği için makul çaba gösterilir.</p>
    </LegalTemplate>
  );
}
