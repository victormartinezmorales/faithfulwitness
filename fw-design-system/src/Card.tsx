import React from 'react';

export interface CardProps {
  /** Adds a 3px gold top accent strip */
  accent?: boolean;
  /** Adds a 4px navy left accent border (used in dashboard headers) */
  navyAccent?: boolean;
  /** Internal padding size */
  padding?: 'sm' | 'md' | 'lg';
  /** Removes the box shadow */
  flat?: boolean;
  /** Card content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Core container. White background, soft border, 12px radius.
 * `accent` adds a 3px gold top strip; `navyAccent` adds a navy left border for dashboard headers.
 */
export function Card({
  accent = false,
  navyAccent = false,
  padding = 'md',
  flat = false,
  children,
  className = '',
  onClick,
}: CardProps) {
  const cls = [
    'fw-card',
    `fw-card--${padding}`,
    accent ? 'fw-card--accent' : '',
    navyAccent ? 'fw-card--navy-accent' : '',
    flat ? 'fw-card--flat' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      {children}
    </div>
  );
}
