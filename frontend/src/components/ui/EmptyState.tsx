import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon:        React.ReactNode;
  title:       string;
  description: string;
  action?:     { label: string; onClick: () => void };
  className?:  string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div className={`empty-state ${className}`}>
    <div className="empty-state-icon">{icon}</div>
    <p className="empty-state-title">{title}</p>
    <p className="empty-state-desc">{description}</p>
    {action && (
      <Button variant="primary" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);

export default EmptyState;
