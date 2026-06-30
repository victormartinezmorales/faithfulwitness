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
export declare function SectionHeader({ eyebrow, eyebrowMuted, title, titleLg, onDark, description, className, }: SectionHeaderProps): React.JSX.Element;
