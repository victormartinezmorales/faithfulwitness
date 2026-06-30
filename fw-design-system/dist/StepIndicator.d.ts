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
export declare function StepIndicator({ steps, className }: StepIndicatorProps): React.JSX.Element;
