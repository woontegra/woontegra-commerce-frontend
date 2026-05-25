import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type PlanLimitDetail = {
  message?: string;
  currentPlan?: string;
  currentUsage?: number;
  maxAllowed?: number;
};

export default function PlanLimitModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<PlanLimitDetail>({});

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<PlanLimitDetail>;
      setDetail(custom.detail || {});
      setOpen(true);
    };

    window.addEventListener('plan-limit-reached', handler as EventListener);
    return () => window.removeEventListener('plan-limit-reached', handler as EventListener);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Plan Limitine Ulaştınız</h2>
        <p className="text-sm text-slate-600 mt-2">
          {detail.message || 'Bu işlem için plan yükseltmeniz gerekiyor.'}
        </p>
        {(detail.currentUsage !== undefined && detail.maxAllowed !== undefined) && (
          <p className="text-xs text-slate-500 mt-2">
            Kullanım: {detail.currentUsage} / {detail.maxAllowed}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-1 h-10 rounded-xl border border-slate-300 text-slate-700 font-medium"
          >
            Kapat
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/dashboard/billing');
            }}
            className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
          >
            Ödeme / Faturalama
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/plans');
            }}
            className="flex-1 h-10 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-800 font-semibold hover:bg-indigo-100"
          >
            Planları Gör
          </button>
        </div>
      </div>
    </div>
  );
}
