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
export declare function OptionButton({ selected, children, onClick, className, }: OptionButtonProps): React.JSX.Element;
