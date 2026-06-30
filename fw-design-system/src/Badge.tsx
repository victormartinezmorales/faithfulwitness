import React from 'react';

export interface BadgeProps {
  /** Color variant */
  variant?: 'gold' | 'navy' | 'muted' | 'green' | 'red';
  /** Badge content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Small uppercase label. Gold is the default brand variant.
 * Used for section labels, status, and category tagging.
 */
export function Badge({
  variant = 'gold',
  children,
  className = '',
}: BadgeProps) {
  const cls = `fw-badge fw-badge--${variant}${className ? ' ' + className : ''}`;
  return <span className={cls}>{children}</span>;
}
