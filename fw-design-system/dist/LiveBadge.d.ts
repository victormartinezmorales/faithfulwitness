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
export declare function LiveBadge({ label, className }: LiveBadgeProps): React.JSX.Element;
