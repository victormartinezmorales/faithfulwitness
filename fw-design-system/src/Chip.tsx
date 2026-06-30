import React from 'react';

export interface ChipProps {
  /** Color variant */
  variant?: 'gold' | 'navy' | 'cream' | 'live';
  /** Chip content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Inline pill label (not uppercase). Smaller than Badge.
 * `live` variant is for use inside dark NavBar backgrounds.
 */
export function Chip({
  variant = 'cream',
  children,
  className = '',
}: ChipProps) {
  const cls = `fw-chip fw-chip--${variant}${className ? ' ' + className : ''}`;
  return <span className={cls}>{children}</span>;
}
