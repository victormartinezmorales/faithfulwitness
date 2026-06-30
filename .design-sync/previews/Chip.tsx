import React from 'react';
import { Chip } from '@faithfulwitness/design-system';

export function AllVariants() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 24 }}>
      <Chip variant="gold">Solidarity Summer</Chip>
      <Chip variant="cream">June 1 – August 31</Chip>
      <Chip variant="navy">New</Chip>
    </div>
  );
}

export function OnDark() {
  return (
    <div style={{ display: 'flex', gap: 10, padding: 24, background: 'var(--fw-navy)', borderRadius: 12 }}>
      <Chip variant="live">Live Data</Chip>
      <Chip variant="live">Updated today</Chip>
    </div>
  );
}
