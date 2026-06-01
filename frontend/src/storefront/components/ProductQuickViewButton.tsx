import { Eye } from 'lucide-react';

type Props = {
  onClick: () => void;
  className?: string;
};

export function ProductQuickViewButton({ onClick, className = '' }: Props) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Hızlı görünüm"
      title="Hızlı görünüm"
      className={`store-product-card-action-btn ${className}`.trim()}
    >
      <Eye className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
