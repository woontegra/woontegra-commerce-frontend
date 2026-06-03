import LegalTemplate from '../components/legal/LegalTemplate';

export default function MesafeliSatisPage() {
  return (
    <LegalTemplate title="Mesafeli Satış Sözleşmesi" updatedAt="02.06.2026">
      <p>
        Bu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler
        Yönetmeliği kapsamında, internet sitesi üzerinden gerçekleştirilen satışlara ilişkin
        tarafların hak ve yükümlülüklerini düzenler.
      </p>

      <h3>1. Taraflar</h3>
      <p>
        Satıcı: İnternet sitesinde belirtilen ticari unvan ve iletişim bilgilerine sahip
        işletme. Alıcı: Site üzerinden sipariş veren gerçek veya tüzel kişi.
      </p>

      <h3>2. Sözleşmenin Konusu</h3>
      <p>
        Alıcının, satıcıya ait internet sitesinden elektronik ortamda sipariş verdiği ürün
        veya hizmetin satışı ve teslimine ilişkin koşullar ile tarafların hak ve
        yükümlülüklerinin belirlenmesidir.
      </p>

      <h3>3. Ürün ve Hizmet Bilgileri</h3>
      <p>
        Satışa sunulan ürün ve hizmetlerin temel nitelikleri, vergiler dahil toplam satış
        bedeli, ödeme ve teslimat bilgileri sipariş öncesi alıcıya açık şekilde sunulur.
        Kampanya, indirim veya kupon uygulamaları sipariş onay ekranında gösterilen tutar
        üzerinden hesaplanır.
      </p>

      <h3>4. Ödeme ve Teslimat</h3>
      <p>
        Ödeme, sitede sunulan güvenli ödeme yöntemleri ile alınır. Teslimat süresi, kargo
        firması ve teslimat adresi sipariş sırasında alıcı tarafından belirlenir. Teslimat
        süresi aşımında alıcı, sipariş iptali veya bedel iadesi talebinde bulunabilir.
      </p>

      <h3>5. Cayma Hakkı</h3>
      <p>
        Alıcı, teslim aldığı tarihten itibaren 14 gün içinde herhangi bir gerekçe
        göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir. Cayma
        hakkının kullanılması, yasal istisnalar saklı kalmak kaydıyla İade ve İptal
        Koşullarında belirtilen usule tabidir.
      </p>

      <h3>6. Uyuşmazlık Çözümü</h3>
      <p>
        Uyuşmazlıklarda alıcının yerleşim yerindeki veya işlemin yapıldığı yerdeki Tüketici
        Hakem Heyetleri ile Tüketici Mahkemeleri yetkilidir. Tüketici, şikâyet ve itiraz
        konularında Ticaret Bakanlığı tarafından belirlenen parasal sınırlar dahilinde il
        veya ilçe tüketici hakem heyetlerine başvurabilir.
      </p>
    </LegalTemplate>
  );
}
