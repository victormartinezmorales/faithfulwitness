import React from 'react';

export interface LiveBadgeProps {
  /** Label text next to the live dot */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Animated green pulse dot + label for live-data status in dashboards.
 * Designed for use inside the dark NavBar bar.
 */
export function LiveBadge({ label = 'Live', className = '' }: LiveBadgeProps) {
  return (
    <span className={`fw-live-badge${className ? ' ' + className : ''}`}>
      <span className="fw-live-badge__dot" aria-hidden="true" />
      {label}
    </span>
  );
}
