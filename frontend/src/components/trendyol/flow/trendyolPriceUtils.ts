export type PriceStrategyForm = {
  mode: 'none' | 'percent' | 'fixed';
  value: number;
  vatRate: number;
  vatIncluded: boolean;
  roundTo: number;
};

export interface TrendyolCalculatedPrice {
  basePrice: number;
  finalPrice: number;
  listPrice: number;
  vatRate: number;
}

export interface SendPreviewBreakdown {
  basePrice: number;
  finalPrice: number;
  vatAmount: number;
  commissionAmount: number;
  commissionPct: number;
  netAfterFees: number;
  netProfitVsCost: number;
}

const DEFAULT_STRATEGY: PriceStrategyForm = {
  mode: 'none',
  value: 0,
  vatRate: 20,
  vatIncluded: false,
  roundTo: 2,
};

export function applyTrendyolPriceStrategy(
  basePrice: number,
  strategy: PriceStrategyForm | null | undefined,
  listPrice = basePrice,
): TrendyolCalculatedPrice {
  const s = strategy ?? DEFAULT_STRATEGY;
  const roundTo = s.roundTo ?? 2;
  const round = (n: number) => Math.round(n * 10 ** roundTo) / 10 ** roundTo;

  let finalPrice = basePrice;
  if (s.mode === 'percent' && s.value !== 0) {
    finalPrice = basePrice * (1 + s.value / 100);
  } else if (s.mode === 'fixed' && s.value !== 0) {
    finalPrice = basePrice + s.value;
  }

  const rounded = round(Math.max(finalPrice, 0));
  return {
    basePrice,
    finalPrice: rounded,
    listPrice: Math.max(round(listPrice), rounded),
    vatRate: s.vatRate ?? 20,
  };
}

export function buildSendPreview(
  basePrice: number,
  strategy: PriceStrategyForm | null | undefined,
  commissionPct = 12,
): SendPreviewBreakdown {
  const { finalPrice, vatRate } = applyTrendyolPriceStrategy(basePrice, strategy);
  const commissionFactor = commissionPct / 100;
  const vatFactor = vatRate / (100 + vatRate);
  const commissionAmount = finalPrice * commissionFactor;
  const vatAmount = finalPrice * vatFactor;
  const netAfterFees = finalPrice - commissionAmount - vatAmount;
  const netProfitVsCost = netAfterFees - basePrice;

  return {
    basePrice,
    finalPrice,
    vatAmount,
    commissionAmount,
    commissionPct,
    netAfterFees,
    netProfitVsCost,
  };
}

export const moneyTr = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPriceArrow(base: number, final: number): string {
  if (Math.abs(base - final) < 0.005) {
    return `${moneyTr.format(base)} ₺`;
  }
  return `${moneyTr.format(base)} → ${moneyTr.format(final)} ₺`;
}
