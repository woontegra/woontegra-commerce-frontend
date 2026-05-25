export function formatTry(amount: number): string {
  return amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
}

export function effectivePrice(price: number, discountPrice?: number | null): number {
  if (discountPrice != null && discountPrice > 0 && discountPrice < price) {
    return discountPrice;
  }
  return price;
}
