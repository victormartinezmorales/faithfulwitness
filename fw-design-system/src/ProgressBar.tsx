import React from 'react';

export interface ProgressBarProps {
  /** Progress value from 0 to 100 */
  value: number;
  /** Optional left label below the track */
  label?: string;
  /** Show the percentage value on the right */
  showPercentage?: boolean;
  /** Track height size */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Gold-filled progress indicator used in assessment flows.
 * `value` is 0–100. Set both `label` and `showPercentage` for the full caption row.
 */
export function ProgressBar({
  value,
  label,
  showPercentage = false,
  size = 'sm',
  className = '',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const cls = `fw-progress${size !== 'sm' ? ' fw-progress--' + size : ''}${className ? ' ' + className : ''}`;

  return (
    <div className={cls}>
      <div className="fw-progress__track">
        <div className="fw-progress__fill" style={{ width: `${clamped}%` }} />
      </div>
      {(label || showPercentage) && (
        <div className="fw-progress__meta">
          {label && <span>{label}</span>}
          {showPercentage && <span>{clamped}%</span>}
        </div>
      )}
    </div>
  );
}
