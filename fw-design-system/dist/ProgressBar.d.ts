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
export declare function ProgressBar({ value, label, showPercentage, size, className, }: ProgressBarProps): React.JSX.Element;
