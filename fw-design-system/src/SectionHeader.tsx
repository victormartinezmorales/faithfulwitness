import React from 'react';

export interface SectionHeaderProps {
  /** Small uppercase eyebrow label above the title */
  eyebrow?: string;
  /** Muted style for the eyebrow (gray instead of gold) */
  eyebrowMuted?: boolean;
  /** Main heading */
  title: string;
  /** Large display heading size */
  titleLg?: boolean;
  /** White text for use on dark backgrounds */
  onDark?: boolean;
  /** Supporting paragraph below the title */
  description?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Eyebrow + serif title + description block.
 * `onDark` flips text to white for hero/navy backgrounds.
 * `titleLg` uses a responsive clamp for hero-size headings.
 */
export function SectionHeader({
  eyebrow,
  eyebrowMuted = false,
  title,
  titleLg = false,
  onDark = false,
  description,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`fw-section-header${className ? ' ' + className : ''}`}>
      {eyebrow && (
        <div className={`fw-section-header__eyebrow${eyebrowMuted ? ' fw-section-header__eyebrow--muted' : ''}`}>
          {eyebrow}
        </div>
      )}
      <div
        className={[
          'fw-section-header__title',
          titleLg ? 'fw-section-header__title--lg' : '',
          onDark ? 'fw-section-header__title--white' : '',
        ].filter(Boolean).join(' ')}
      >
        {title}
      </div>
      {description && (
        <div className={`fw-section-header__description${onDark ? ' fw-section-header__description--white' : ''}`}>
          {description}
        </div>
      )}
    </div>
  );
}
