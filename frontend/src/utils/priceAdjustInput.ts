/** İmzalı ondalık: boş, "-", "-10", "+20", "12.5" */
export const SIGNED_DECIMAL_RE = /^[+-]?\d*\.?\d*$/;

export function parseOptionalSigned(raw: string): number | undefined {
  const t = raw.trim();
  if (t === '' || t === '+' || t === '-') return undefined;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : undefined;
}

export function hasPriceAdjustment(percentRaw: string, fixedRaw: string): boolean {
  const p = parseOptionalSigned(percentRaw);
  const f = parseOptionalSigned(fixedRaw);
  return (p != null && p !== 0) || (f != null && f !== 0);
}

export function onSignedDecimalChange(
  _prev: string,
  next: string,
  setter: (v: string) => void,
): void {
  if (next === '' || SIGNED_DECIMAL_RE.test(next)) setter(next);
}
