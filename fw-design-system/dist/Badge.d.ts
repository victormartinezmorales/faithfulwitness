import React from 'react';
export interface BadgeProps {
    /** Color variant */
    variant?: 'gold' | 'navy' | 'muted' | 'green' | 'red';
    /** Badge content */
    children: React.ReactNode;
    /** Additional CSS classes */
    className?: string;
}
/**
 * Small uppercase label. Gold is the default brand variant.
 * Used for section labels, status, and category tagging.
 */
export declare function Badge({ variant, children, className, }: BadgeProps): React.JSX.Element;
