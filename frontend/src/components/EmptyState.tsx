import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon:         ReactNode;
  title:        string;
  description:  string;
  action?:      { label: string; onClick: () => void };
  actionLabel?: string;
  onAction?:    () => void;
}

export default function EmptyState({ icon, title, description, action, actionLabel, onAction }: EmptyStateProps) {
  const resolvedAction = action ?? (actionLabel && onAction ? { label: actionLabel, onClick: onAction } : undefined);
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="mb-6 text-gray-300 dark:text-gray-600">
        {icon}
      </div>
      <h3 className="text-2xl font-semibold tracking-tight leading-tight text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight text-center max-w-sm mb-8">
        {description}
      </p>
      {resolvedAction && (
        <button
          onClick={resolvedAction.onClick}
          className="btn-primary hover:-translate-y-0.5 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
        >
          {resolvedAction.label}
        </button>
      )}
    </div>
  );
}
