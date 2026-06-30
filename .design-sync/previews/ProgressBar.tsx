import React from 'react';
import { ProgressBar } from '@faithfulwitness/design-system';

export function States() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24, background: 'var(--fw-white)' }}>
      <ProgressBar value={25} label="Question 3 of 12" showPercentage />
      <ProgressBar value={58} label="Section 2: Neighbor Love" showPercentage />
      <ProgressBar value={90} label="Almost done" showPercentage />
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}>
      <ProgressBar value={60} size="sm" label="Small" />
      <ProgressBar value={60} size="md" label="Medium" />
      <ProgressBar value={60} size="lg" label="Large" />
    </div>
  );
}
