import { onSignedDecimalChange } from '../../utils/priceAdjustInput';

interface BulkPriceAdjustInputsProps {
  percent: string;
  fixed: string;
  onPercentChange: (v: string) => void;
  onFixedChange: (v: string) => void;
  className?: string;
}

export function BulkPriceAdjustInputs({
  percent,
  fixed,
  onPercentChange,
  onFixedChange,
  className = '',
}: BulkPriceAdjustInputsProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Yüzde değişim (%)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={percent}
            onChange={e => onSignedDecimalChange(percent, e.target.value, onPercentChange)}
            placeholder="+20 veya -10"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Sabit değişim (TL)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={fixed}
            onChange={e => onSignedDecimalChange(fixed, e.target.value, onFixedChange)}
            placeholder="+50 veya -50"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
          />
        </div>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Pozitif değer artırır, negatif düşürür. İkisini birlikte kullanabilirsiniz.
        <span className="block mt-1 text-slate-400">
          +20 = %20 artış · -10 = %10 düşüş · +50 = 50 TL artış · -50 = 50 TL düşüş
        </span>
      </p>
    </div>
  );
}
