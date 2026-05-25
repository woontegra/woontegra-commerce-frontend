export type FlowStep = 1 | 2 | 3 | 4 | 5;

export const FLOW_STEPS: { id: FlowStep; label: string; description: string }[] = [
  {
    id: 1,
    label: 'Bağlantı',
    description: 'Trendyol API bilgilerinizi girin ve bağlantıyı doğrulayın.',
  },
  {
    id: 2,
    label: 'Eşleştirme',
    description: 'Kategori, marka ve zorunlu özellikleri tek ekranda eşleştirin.',
  },
  {
    id: 3,
    label: 'Ürün Gönder',
    description: 'Ürünleri seçin veya toplu gönderin; hataları bu adımda görün.',
  },
  {
    id: 4,
    label: 'Fiyat & Senkron',
    description: 'Global fiyat stratejisi, toplu fiyat ve fiyat/stok senkronu.',
  },
  {
    id: 5,
    label: 'Tamam',
    description: 'Kurulum özeti ve sonraki adımlar.',
  },
];
