import React from 'react';
export interface NavBarProps {
    /** SVG or img element for the brand mark */
    logo?: React.ReactNode;
    /** Main brand name displayed in serif font */
    title?: string;
    /** Tagline shown below the title in gold uppercase */
    subtitle?: string;
    /** Right-side content (buttons, badges, nav links) */
    actions?: React.ReactNode;
    /** Whether the bar should include the gold accent strip above it */
    showStrip?: boolean;
    /** Additional CSS classes */
    className?: string;
}
/**
 * Sticky top navigation bar. Navy background with optional 4px gold accent strip above.
 * Logo on left, actions slot on right. Title uses Libre Baskerville serif.
 */
export declare function NavBar({ logo, title, subtitle, actions, showStrip, className, }: NavBarProps): React.JSX.Element;
