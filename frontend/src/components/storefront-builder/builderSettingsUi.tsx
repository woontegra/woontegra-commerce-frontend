const inputCls =
  'w-full bg-white border border-slate-200 text-slate-900 text-[13px] px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300';

export function ImageUrlField({
  value,
  onChange,
  label = 'Görsel URL',
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const trimmed = value.trim();
  const showPreview = trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/');

  return (
    <div>
      <label className="block text-[12px] font-medium text-slate-600 mb-1">{label}</label>
      <input
        type="url"
        className={inputCls}
        value={value}
        placeholder="https://..."
        onChange={e => onChange(e.target.value)}
      />
      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
        {showPreview ? (
          <img
            src={trimmed}
            alt=""
            className="w-full h-28 object-cover"
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="h-28 flex items-center justify-center text-[12px] text-slate-400">
            Görsel önizlemesi
          </div>
        )}
      </div>
    </div>
  );
}

export function ColorField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-slate-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith('#') ? value : '#4f46e5'}
          onChange={e => onChange(e.target.value)}
          className="h-10 w-12 rounded-lg border border-slate-200 cursor-pointer"
        />
        <input
          type="text"
          className={`${inputCls} flex-1`}
          value={value}
          placeholder="#4f46e5"
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export { inputCls };
