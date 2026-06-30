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
export declare function Avatar({ initials, size, color, className, }: AvatarProps): React.JSX.Element;
