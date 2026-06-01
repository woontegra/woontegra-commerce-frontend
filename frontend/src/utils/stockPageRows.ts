import { productService, type ProductListItem } from '../services/product.service';
import type { StockStatus } from '../types/stock';

export type StockTableRow = {
  id:            string;
  productId:     string;
  variantId?:    string;
  productName:   string;
  sku:           string | null;
  variantLabel:  string | null;
  totalStock:    number;
  reserved:      null;
  available:     number;
  threshold:     number | null;
  status:        StockStatus;
  updatedAt:     string;
};

export function computeStockStatus(available: number, threshold: number | null): StockStatus {
  if (available <= 0) return 'out_of_stock';
  if (threshold != null && available <= threshold) return 'low_stock';
  return 'in_stock';
}

function readThreshold(product: Record<string, unknown>): number | null {
  const raw =
    product.lowStockThreshold
    ?? product.low_stock_threshold
    ?? (product.stock as Record<string, unknown> | undefined)?.lowStockThreshold;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function productUpdatedAt(p: ProductListItem): string {
  return (p as ProductListItem & { updatedAt?: string }).updatedAt ?? new Date().toISOString();
}

function mapProductRow(p: ProductListItem): StockTableRow {
  const total = Number(p.stock ?? 0);
  const threshold = readThreshold(p as unknown as Record<string, unknown>);
  const available = total;

  return {
    id:           p.variantCount > 0 ? `${p.id}-summary` : p.id,
    productId:    p.id,
    productName:  p.name,
    sku:          p.sku ?? null,
    variantLabel: p.variantCount > 0 ? `${p.variantCount} varyant` : null,
    totalStock:   total,
    reserved:     null,
    available,
    threshold,
    status:       computeStockStatus(available, threshold),
    updatedAt:    productUpdatedAt(p),
  };
}

function mapVariantRow(
  product: ProductListItem,
  variant: Record<string, unknown>,
): StockTableRow {
  const total = Number(variant.stockQuantity ?? variant.stock ?? 0);
  const threshold = readThreshold(variant);
  const available = total;
  const combinationLabel = Object.values((variant.combination as Record<string, string>) ?? {}).join(' / ');
  const displayName =
    (variant.displayName as string | undefined)
    ?? (variant.name as string | undefined)
    ?? (combinationLabel || 'Varyant');

  return {
    id:           String(variant.id ?? `${product.id}-variant`),
    productId:    product.id,
    variantId:    variant.id as string | undefined,
    productName:  product.name,
    sku:          (variant.sku as string | null) ?? product.sku ?? null,
    variantLabel: displayName,
    totalStock:   total,
    reserved:     null,
    available,
    threshold,
    status:       computeStockStatus(available, threshold),
    updatedAt:    String(variant.updatedAt ?? productUpdatedAt(product)),
  };
}

async function fetchVariantRows(product: ProductListItem): Promise<StockTableRow[]> {
  try {
    const detail = await productService.getById(product.id);
    const variants = (detail as unknown as { variants?: Record<string, unknown>[] }).variants;
    if (Array.isArray(variants) && variants.length > 0) {
      return variants.map(v => mapVariantRow(product, v));
    }
  } catch {
    // fall through to product-level row
  }
  return [mapProductRow(product)];
}

/** Ürün listesinden stok tablosu satırları üretir (mock veri kullanılmaz). */
export async function loadStockTableRows(): Promise<{
  rows: StockTableRow[];
  loadFailed: boolean;
}> {
  try {
    const result = await productService.search({
      limit:   500,
      sortBy:  'updatedAt',
      sortDir: 'desc',
    });

    const items = result.items ?? [];
    if (items.length === 0) {
      return { rows: [], loadFailed: false };
    }

    const rows: StockTableRow[] = [];
    const withVariants = items.filter(p => (p.variantCount ?? 0) > 0);
    const withoutVariants = items.filter(p => (p.variantCount ?? 0) === 0);

    for (const p of withoutVariants) {
      rows.push(mapProductRow(p));
    }

    const variantRowGroups = await Promise.all(withVariants.map(fetchVariantRows));
    for (const group of variantRowGroups) {
      rows.push(...group);
    }

    rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return { rows, loadFailed: false };
  } catch {
    return { rows: [], loadFailed: true };
  }
}

export function countByStatus(rows: StockTableRow[]) {
  return {
    total:      rows.length,
    inStock:    rows.filter(r => r.status === 'in_stock').length,
    lowStock:   rows.filter(r => r.status === 'low_stock').length,
    outOfStock: rows.filter(r => r.status === 'out_of_stock').length,
  };
}
