import React from 'react';

export interface OptionButtonProps {
  /** Whether this option is currently selected */
  selected?: boolean;
  /** Option text content */
  children: React.ReactNode;
  /** Selection handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Radio-style selection button used in assessment question flows.
 * Shows a circular dot indicator on the left; fills navy when selected.
 */
export function OptionButton({
  selected = false,
  children,
  onClick,
  className = '',
}: OptionButtonProps) {
  const cls = [
    'fw-option-btn',
    selected ? 'fw-option-btn--selected' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type="button" className={cls} onClick={onClick} aria-pressed={selected}>
      <span className="fw-option-btn__dot" aria-hidden="true" />
      <span className="fw-option-btn__text">{children}</span>
    </button>
  );
}
