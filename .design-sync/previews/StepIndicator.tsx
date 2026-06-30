import React from 'react';
import { StepIndicator } from '@faithfulwitness/design-system';

const journeySteps = [
  { number: 1, name: 'Foundations', complete: true },
  { number: 2, name: 'Neighbor Love', active: true },
  { number: 3, name: 'Justice & Law', complete: false },
  { number: 4, name: 'My Response', complete: false },
];

export function FourStep() {
  return (
    <div style={{ padding: 24, background: 'var(--fw-white)' }}>
      <div style={{ fontFamily: 'var(--fw-font-sans)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fw-text-muted)', marginBottom: 12 }}>Your Journey</div>
      <StepIndicator steps={journeySteps} />
    </div>
  );
}

export function TwoStep() {
  return (
    <div style={{ padding: 24, background: 'var(--fw-white)', maxWidth: 400 }}>
      <StepIndicator steps={[
        { number: 1, name: 'Assessment', complete: true },
        { number: 2, name: 'Your Report', active: true },
      ]} />
    </div>
  );
}
