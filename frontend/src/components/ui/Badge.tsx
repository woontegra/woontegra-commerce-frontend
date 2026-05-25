import React from 'react';

type Color = 'indigo' | 'emerald' | 'amber' | 'red' | 'slate' | 'blue' | 'purple' | 'pink';
type BadgeVariant = 'danger' | 'success' | 'warning' | 'info' | 'primary' | 'secondary';

interface BadgeProps {
  children:   React.ReactNode;
  color?:     Color;
  variant?:   BadgeVariant | Color | string;
  size?:      'sm' | 'md' | 'lg';
  dot?:       boolean;
  className?: string;
}

const VARIANT_TO_COLOR: Record<BadgeVariant, Color> = {
  danger:    'red',
  success:   'emerald',
  warning:   'amber',
  info:      'blue',
  primary:   'indigo',
  secondary: 'slate',
};

const COLOR_CLS: Record<Color, string> = {
  indigo:  'badge-indigo',
  emerald: 'badge-emerald',
  amber:   'badge-amber',
  red:     'badge-red',
  slate:   'badge-slate',
  blue:    'badge-blue',
  purple:  'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20',
  pink:    'bg-pink-500/10   text-pink-400   ring-1 ring-pink-500/20',
};

const DOT_COLOR: Record<Color, string> = {
  indigo:  'bg-indigo-400',
  emerald: 'bg-emerald-400',
  amber:   'bg-amber-400',
  red:     'bg-red-400',
  slate:   'bg-slate-400',
  blue:    'bg-blue-400',
  purple:  'bg-purple-400',
  pink:    'bg-pink-400',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  color,
  variant,
  size: _size,
  dot       = false,
  className = '',
}) => {
  const resolvedColor: Color =
    color ??
    (variant && variant in VARIANT_TO_COLOR
      ? VARIANT_TO_COLOR[variant as BadgeVariant]
      : (variant as Color | undefined) ?? 'slate');

  return (
  <span className={`badge ${COLOR_CLS[resolvedColor]} ${className}`}>
    {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR[resolvedColor]}`} />}
    {children}
  </span>
  );
};

// ─── Status badge helpers ─────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: Color; label: string }> = {
    ACTIVE:    { color: 'emerald', label: 'Aktif'    },
    active:    { color: 'emerald', label: 'Aktif'    },
    TRIAL:     { color: 'blue',    label: 'Deneme'   },
    trial:     { color: 'blue',    label: 'Deneme'   },
    PAST_DUE:  { color: 'amber',   label: 'Gecikmiş' },
    past_due:  { color: 'amber',   label: 'Gecikmiş' },
    SUSPENDED: { color: 'red',     label: 'Askıya Alındı' },
    suspended: { color: 'red',     label: 'Askıya Alındı' },
    CANCELED:  { color: 'slate',   label: 'İptal'    },
    canceled:  { color: 'slate',   label: 'İptal'    },
    PENDING:   { color: 'amber',   label: 'Bekliyor' },
    pending:   { color: 'amber',   label: 'Bekliyor' },
    SUCCESS:   { color: 'emerald', label: 'Başarılı' },
    success:   { color: 'emerald', label: 'Başarılı' },
    FAILED:    { color: 'red',     label: 'Başarısız' },
    failed:    { color: 'red',     label: 'Başarısız' },
  };

  const cfg = map[status] ?? { color: 'slate' as Color, label: status };
  return <Badge color={cfg.color} dot>{cfg.label}</Badge>;
}

export default Badge;
