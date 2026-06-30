import React from 'react';
import { LiveBadge } from '@faithfulwitness/design-system';

export function OnDark() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: 24, background: 'var(--fw-navy)', borderRadius: 12, alignItems: 'center' }}>
      <LiveBadge label="Live" />
      <LiveBadge label="Updated now" />
    </div>
  );
}

export function InNavBar() {
  return (
    <div style={{ background: 'var(--fw-navy)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8 }}>
      <span style={{ fontFamily: 'var(--fw-font-serif)', color: 'var(--fw-white)', fontSize: 15 }}>Insights Dashboard</span>
      <LiveBadge label="Live Data" />
    </div>
  );
}
