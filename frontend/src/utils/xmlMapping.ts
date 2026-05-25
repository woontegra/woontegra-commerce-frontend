/** XML import — manuel düz eşleştirme yardımcıları */

export interface MappingTargetField {
  key: string;
  label: string;
}

/** Dropdown’da sabit sistem alanları (sıra korunur) */
export const FIXED_MAPPING_TARGETS: MappingTargetField[] = [
  { key: 'name',          label: 'Ürün Adı' },
  { key: 'price',         label: 'Satış Fiyatı' },
  { key: 'category',      label: 'Kategori' },
  { key: 'sku',           label: 'SKU' },
  { key: 'barcode',       label: 'Barkod' },
  { key: 'stock',         label: 'Stok' },
  { key: 'imageUrl',      label: 'Görsel URL' },
  { key: 'description',   label: 'Açıklama' },
  { key: 'brand',         label: 'Marka' },
  { key: 'discountPrice', label: 'İndirimli Fiyat' },
];

export function isCustomTargetKey(key: string): boolean {
  return key.startsWith('custom:');
}

export function slugifyCustomLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'alan';
}

export function makeCustomTargetKey(label: string): string {
  return `custom:${slugifyCustomLabel(label)}`;
}

export function getAllDropdownTargets(customTargets: MappingTargetField[]): MappingTargetField[] {
  const seen = new Set<string>();
  const out: MappingTargetField[] = [];
  for (const t of [...FIXED_MAPPING_TARGETS, ...customTargets]) {
    if (seen.has(t.key)) continue;
    seen.add(t.key);
    out.push(t);
  }
  return out;
}

/** Yeni içe aktarma — seçim yok */
export function buildEmptyMapping(xmlFields: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of xmlFields) out[f] = '';
  return out;
}

// ─── Otomatik alan tahmini (UI değişmez; yalnızca dropdown başlangıç değeri) ─

const SUGGEST_NORM: Record<string, string> = {
  productname: 'name', urunadi: 'name', title: 'name', baslik: 'name', name: 'name', ad: 'name',
  price: 'price', saleprice: 'price', fiyat: 'price', satisfiyati: 'price',
  sellprice: 'price', listprice: 'price', regularprice: 'price', normalprice: 'price',
  discountprice: 'discountPrice', discountedprice: 'discountPrice',
  indirimlifiyat: 'discountPrice', kampanyafiyat: 'discountPrice',
  barcode: 'barcode', barkod: 'barcode', ean: 'barcode', gtin: 'barcode', upc: 'barcode',
  sku: 'sku', code: 'sku', productcode: 'sku', urunkodu: 'sku', kod: 'sku',
  stockcode: 'sku', postname: 'sku', wppostname: 'sku',
  description: 'description', desc: 'description', aciklama: 'description',
  summary: 'description', ozet: 'description', tanim: 'description', icerik: 'description',
  contentencoded: 'description',
  brand: 'brand', marka: 'brand', manufacturer: 'brand', uretici: 'brand',
  stock: 'stock', quantity: 'stock', qty: 'stock', stok: 'stock', miktar: 'stock',
  stockqty: 'stock', stockquantity: 'stock',
  imageurl: 'imageUrl', image: 'imageUrl', photo: 'imageUrl', gorsel: 'imageUrl',
  resim: 'imageUrl', thumbnail: 'imageUrl', imagelink: 'imageUrl', pictureurl: 'imageUrl',
  unit: 'unit', birim: 'unit',
  category: 'category', kategori: 'category', categoryname: 'category',
  productcategory: 'category', cat: 'category', productcat: 'category',
};

const SUGGEST_DIRECT: Record<string, string> = {
  'content:encoded': 'description',
  'wp:post_name': 'sku',
  '_price': 'price',
  '_regular_price': 'price',
  '_sale_price': 'discountPrice',
  '_sku': 'sku',
  '_stock': 'stock',
  '_stock_quantity': 'stock',
  '_image_url': 'imageUrl',
  'image_url': 'imageUrl',
  '_thumbnail_url': 'imageUrl',
  'thumbnail_url': 'imageUrl',
  'g:image_link': 'imageUrl',
  'image_link': 'imageUrl',
  'g:google_product_category': 'category',
  'g:product_type': 'category',
  'product_cat': 'category',
  'category': 'category',
};

const VALID_TARGETS = new Set([
  'name', 'price', 'category', 'barcode', 'sku', 'description', 'brand',
  'stock', 'discountPrice', 'imageUrl',
]);

function guessTargetForXmlField(xmlField: string): string {
  if (SUGGEST_DIRECT[xmlField] !== undefined) {
    const t = SUGGEST_DIRECT[xmlField];
    return t === '__ignore__' ? '' : t;
  }
  const norm = xmlField.toLowerCase().replace(/[^a-z0-9]/g, '');
  const t = SUGGEST_NORM[norm];
  if (!t || t === '__ignore__' || !VALID_TARGETS.has(t)) return '';
  return t;
}

/** Tek hedefe yalnızca bir XML alanı (öncelik: alan listesi sırası) */
export function suggestAutoMapping(xmlFields: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const usedTargets = new Set<string>();
  for (const f of xmlFields) {
    const target = guessTargetForXmlField(f);
    if (target && !usedTargets.has(target)) {
      out[f] = target;
      usedTargets.add(target);
    } else {
      out[f] = '';
    }
  }
  return out;
}

/**
 * Kayıtlı eşleştirme öncelikli; kalan alanlar için otomatik tahmin.
 * UI aynı kalır — dropdown’lar dolu gelir, kullanıcı değiştirebilir.
 */
export function buildMappingWithAutoSuggest(
  xmlFields: string[],
  stored?: Record<string, string>,
): Record<string, string> {
  const out = buildEmptyMapping(xmlFields);
  const usedTargets = new Set<string>();

  if (stored) {
    for (const f of xmlFields) {
      const v = stored[f];
      if (v != null && String(v).trim() !== '' && v !== '__ignore__') {
        const t = String(v).trim();
        out[f] = t;
        usedTargets.add(t);
      }
    }
  }

  for (const f of xmlFields) {
    if (out[f]) continue;
    const target = guessTargetForXmlField(f);
    if (target && !usedTargets.has(target)) {
      out[f] = target;
      usedTargets.add(target);
    }
  }

  return out;
}

/** @deprecated buildMappingWithAutoSuggest kullanın */
export function buildMappingFromStored(
  xmlFields: string[],
  stored?: Record<string, string>,
): Record<string, string> {
  return buildMappingWithAutoSuggest(xmlFields, stored);
}

export function resolveTargetLabel(
  targetKey: string,
  customTargets: MappingTargetField[],
): string {
  if (!targetKey || targetKey === '__ignore__') return '—';
  const all = getAllDropdownTargets(customTargets);
  const found = all.find(t => t.key === targetKey);
  if (found) return found.label;
  if (isCustomTargetKey(targetKey)) {
    return targetKey.slice(7).replace(/_/g, ' ');
  }
  return targetKey;
}

export function buildCustomTargetLabels(
  customTargets: MappingTargetField[],
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const t of customTargets) {
    labels[t.key] = t.label;
  }
  return labels;
}

/** API’ye gönderim: boş → yoksay */
export function normalizeMappingForImport(
  mapping: Record<string, string>,
  xmlFields: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of xmlFields) {
    const v = (mapping[f] ?? '').trim();
    out[f] = v === '' ? '__ignore__' : v;
  }
  return out;
}

export function validateMappingForImport(mapping: Record<string, string>): string | null {
  const mapped = Object.values(mapping).filter(v => v && v !== '__ignore__' && String(v).trim() !== '');
  if (!mapped.includes('name')) {
    return 'Ürün Adı alanını eşleştirmeniz zorunludur.';
  }
  if (!mapped.includes('price')) {
    return 'Satış Fiyatı alanını eşleştirmeniz zorunludur.';
  }
  return null;
}
