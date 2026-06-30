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
export function NavBar({
  logo,
  title = 'Faithful Witness',
  subtitle,
  actions,
  showStrip = true,
  className = '',
}: NavBarProps) {
  return (
    <div className={`fw-navbar${className ? ' ' + className : ''}`}>
      {showStrip && <div className="fw-navbar__strip" />}
      <nav className="fw-navbar__bar">
        <div className="fw-navbar__logo">
          {logo && <span style={{ display: 'flex', alignItems: 'center' }}>{logo}</span>}
          {title && (
            <div>
              <span className="fw-navbar__title">{title}</span>
              {subtitle && <span className="fw-navbar__subtitle">{subtitle}</span>}
            </div>
          )}
        </div>
        {actions && <div className="fw-navbar__actions">{actions}</div>}
      </nav>
    </div>
  );
}
