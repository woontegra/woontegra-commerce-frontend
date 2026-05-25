type Props = {
  current: number;
  max:       number;
  className?: string;
};

/** Yüzde = current / max; renk eşikleri admin tenant özetinde kullanılır. */
export default function AdminUsageProgressBar({ current, max, className = '' }: Props) {
  if (max <= 0) return null;
  const pct = Math.min(100, Math.round((current / max) * 100));
  const bar =
    pct >= 90 ? 'bg-red-500'
    : pct >= 70 ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <div className={className}>
      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
        <span>Kullanım</span>
        <span className="tabular-nums text-slate-400">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${bar}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
