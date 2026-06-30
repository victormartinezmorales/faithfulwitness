import React from 'react';

export interface AvatarProps {
  /** 1–3 character initials to display */
  initials: string;
  /** Size of the avatar */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Background color variant */
  color?: 'navy' | 'gold' | 'cream';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Circular initials avatar. Navy background with white text by default.
 * Sizes: sm 28px, md 36px, lg 48px, xl 64px.
 */
export function Avatar({
  initials,
  size = 'md',
  color = 'navy',
  className = '',
}: AvatarProps) {
  const cls = [
    'fw-avatar',
    `fw-avatar--${size}`,
    color !== 'navy' ? `fw-avatar--${color}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} aria-label={initials}>
      {initials.slice(0, 2).toUpperCase()}
    </div>
  );
}
