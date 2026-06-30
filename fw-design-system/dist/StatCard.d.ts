import React from 'react';
export interface StatCardProps {
    /** Metric label (uppercase caption) */
    label: string;
    /** Primary numeric or string value */
    value: string | number;
    /** Change indicator text, e.g. "+12% vs last week" */
    change?: string;
    /** Direction of change affects color */
    changeType?: 'positive' | 'negative' | 'neutral';
    /** Optional small icon rendered above the value */
    icon?: React.ReactNode;
    /** Additional CSS classes */
    className?: string;
}
/**
 * Dashboard metric tile. Serif value, uppercase label, optional change row.
 * Used in insights and partner dashboards.
 */
export declare function StatCard({ label, value, change, changeType, icon, className, }: StatCardProps): React.JSX.Element;
