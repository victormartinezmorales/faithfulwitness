import React from 'react';

export interface StepItem {
  /** Step number displayed in the circle */
  number: number;
  /** Step label */
  name: string;
  /** Highlight this step as the current one (navy bg) */
  active?: boolean;
  /** Mark step as completed (gold accent) */
  complete?: boolean;
}

export interface StepIndicatorProps {
  /** Ordered list of steps */
  steps: StepItem[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Horizontal step tracker used in the 4-stage discernment journey.
 * Active step gets navy background; complete steps get gold accent.
 * Grid columns auto-set from step count.
 */
export function StepIndicator({ steps, className = '' }: StepIndicatorProps) {
  return (
    <div
      className={`fw-steps${className ? ' ' + className : ''}`}
      style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
    >
      {steps.map((step) => (
        <div
          key={step.number}
          className={[
            'fw-step',
            step.active ? 'fw-step--active' : '',
            step.complete ? 'fw-step--complete' : '',
          ].filter(Boolean).join(' ')}
        >
          <div className="fw-step__number">{step.number}</div>
          <div className="fw-step__name">{step.name}</div>
        </div>
      ))}
    </div>
  );
}
