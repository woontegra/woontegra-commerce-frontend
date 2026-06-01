import { Link } from 'react-router-dom';

export interface ActionItem {
  id:       string;
  label:    string;
  count:    number | null;
  href:     string;
  tone:     'amber' | 'red' | 'indigo' | 'orange' | 'slate';
  emptyMsg: string;
}

const TONE_CLASSES: Record<ActionItem['tone'], string> = {
  amber:  'bg-amber-50 border-amber-100 text-amber-900 hover:bg-amber-100/60',
  red:    'bg-red-50 border-red-100 text-red-900 hover:bg-red-100/60',
  indigo: 'bg-indigo-50 border-indigo-100 text-indigo-900 hover:bg-indigo-100/60',
  orange: 'bg-orange-50 border-orange-100 text-orange-900 hover:bg-orange-100/60',
  slate:  'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100/60',
};

interface ActionRequiredPanelProps {
  items:   ActionItem[];
  loading: boolean;
}

export default function ActionRequiredPanel({ items, loading }: ActionRequiredPanelProps) {
  const active = items.filter(i => i.count != null && i.count > 0);

  return (
    <div className="wn-card p-6">
      <div className="mb-5">
        <h2 className="text-sm font-medium text-slate-900">Aksiyon Gerektirenler</h2>
        <p className="text-xs text-slate-400 mt-0.5">Operasyonunuzda dikkat gerektiren kalemler</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="py-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700">Bekleyen aksiyon yok</p>
          <p className="text-xs text-slate-400 mt-1">Tüm operasyon kalemleri güncel görünüyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(item => {
            const hasCount = item.count != null && item.count > 0;
            if (!hasCount) return null;
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${TONE_CLASSES[item.tone]}`}
              >
                <span className="text-xs font-medium leading-snug">{item.label}</span>
                <span className="text-base font-semibold tabular-nums flex-shrink-0">
                  {item.count!.toLocaleString('tr-TR')}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.filter(i => i.count == null || i.count === 0).map(item => (
            <p key={item.id} className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              {item.emptyMsg}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
