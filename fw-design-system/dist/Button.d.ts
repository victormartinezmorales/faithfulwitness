import React from 'react';
export interface ButtonProps {
    /** Visual style of the button */
    variant?: 'primary' | 'secondary' | 'ghost' | 'navy';
    /** Size of the button */
    size?: 'sm' | 'md' | 'lg';
    /** Button content */
    children: React.ReactNode;
    /** Disabled state */
    disabled?: boolean;
    /** Click handler */
    onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
    /** HTML button type */
    type?: 'button' | 'submit' | 'reset';
    /** Renders as an anchor when provided */
    href?: string;
    /** Additional CSS classes */
    className?: string;
}
/**
 * Primary interactive element. Uses pill shape throughout the portal.
 * Primary variant uses gold (#C49A3C). Secondary is a navy outline pill.
 */
export declare function Button({ variant, size, children, disabled, onClick, type, href, className, }: ButtonProps): React.JSX.Element;
