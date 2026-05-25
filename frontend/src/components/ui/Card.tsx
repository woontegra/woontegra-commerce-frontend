import React from 'react';

interface CardProps {
  children:   React.ReactNode;
  className?: string;
  padding?:   'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  hover?:     boolean;
  variant?:   string;
  onClick?:   () => void;
}

const PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

export const Card: React.FC<CardProps> = ({
  children,
  className  = '',
  padding    = 'md',
  hoverable  = false,
  hover      = false,
  variant: _variant,
  onClick,
}) => {
  const isHoverable = hoverable || hover;
  return (
    <div
      className={`wn-card ${isHoverable ? 'cursor-pointer' : ''} ${PADDING[padding]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// ─── Card sub-components ──────────────────────────────────────────────────────

export const CardHeader: React.FC<{
  title:     React.ReactNode;
  subtitle?: React.ReactNode;
  action?:   React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className = '' }) => (
  <div className={`flex items-start justify-between gap-4 mb-6 ${className}`}>
    <div>
      {typeof title === 'string' ? (
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      ) : title}
      {subtitle && (
        typeof subtitle === 'string'
          ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          : subtitle
      )}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

export const CardDivider: React.FC = () => (
  <div className="wn-divider" />
);

export default Card;
