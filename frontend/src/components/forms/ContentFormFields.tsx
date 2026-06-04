import type { ReactNode } from 'react';

/** Blog / Sayfa CMS formlarında ortak input stilleri */
export const contentInputCls =
  'w-full bg-white border border-slate-200 text-slate-900 text-[13px] px-3 py-2.5 rounded-lg shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-shadow';

export const contentTextareaCls =
  'w-full bg-white border border-slate-200 text-slate-900 text-[13px] px-3 py-2.5 rounded-lg shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-shadow resize-y';

export function ContentFieldLabel({
  children,
  required,
  hint,
  hintInline,
  counter,
}: {
  children: ReactNode;
  required?: boolean;
  hint?: string;
  /** Kısa yardım metni etiketin yanında (ör. Etiketler · Virgülle ayırın) */
  hintInline?: boolean;
  counter?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2 mb-1.5">
      <div className="min-w-0 flex-1">
        <span className="text-[13px] font-medium text-slate-700 leading-5">
          {children}
          {required && <span className="text-red-500 ml-0.5">*</span>}
          {hint && hintInline && (
            <span className="font-normal text-slate-400"> · {hint}</span>
          )}
        </span>
        {hint && !hintInline && (
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{hint}</p>
        )}
      </div>
      {counter ? <div className="shrink-0 pt-0.5">{counter}</div> : null}
    </div>
  );
}

export function ContentFormField({
  label,
  required,
  hint,
  hintInline,
  counter,
  children,
  className = '',
}: {
  label: ReactNode;
  required?: boolean;
  hint?: string;
  hintInline?: boolean;
  counter?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 flex flex-col ${className}`.trim()}>
      <ContentFieldLabel required={required} hint={hint} hintInline={hintInline} counter={counter}>
        {label}
      </ContentFieldLabel>
      {children}
    </div>
  );
}
