import { inputCls } from './builderSettingsUi';

export function SettingCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/60">
        <p className="text-[11px] font-semibold text-slate-700">{title}</p>
        {hint && <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{hint}</p>}
      </div>
      <div className="p-3 space-y-3">{children}</div>
    </div>
  );
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-slate-400 leading-snug">{children}</p>;
}

export function SegmentControl<T extends string>({
  value,
  options,
  onChange,
  columns,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  columns?: number;
}) {
  const cols = columns ?? Math.min(options.length, 3);
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {options.map(opt => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
            value === opt.id
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ToggleSwitch({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="text-[12px] font-medium text-slate-700">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </label>
      {hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}

export function PlacementGrid<T extends string>({
  value,
  points,
  onChange,
}: {
  value: T;
  points: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-grid grid-cols-3 gap-1 p-1.5 rounded-xl border border-slate-200 bg-slate-50/80">
      {points.map(pt => (
        <button
          key={pt.id}
          type="button"
          title={pt.label}
          onClick={() => onChange(pt.id)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            value === pt.id
              ? 'bg-indigo-600 shadow-md ring-2 ring-indigo-200'
              : 'bg-white border border-slate-200 hover:border-indigo-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${value === pt.id ? 'bg-white' : 'bg-slate-300'}`}
          />
        </button>
      ))}
    </div>
  );
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = 'px',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-medium text-slate-600">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(Number(e.target.value) || min)}
            className="w-16 text-[11px] text-right border border-slate-200 rounded-md px-1.5 py-0.5 tabular-nums"
          />
          <span className="text-[10px] text-slate-400">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-600 mb-1">{label}</label>
      <input
        type="text"
        className={inputCls}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
      {hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}
