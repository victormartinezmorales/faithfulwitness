import React from 'react';
import { Button } from '@faithfulwitness/design-system';

export function Primary() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: 24 }}>
      <Button variant="primary" size="sm">Join Us</Button>
      <Button variant="primary" size="md">Find Your Place →</Button>
      <Button variant="primary" size="lg">Get Started</Button>
    </div>
  );
}

export function Secondary() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: 24 }}>
      <Button variant="secondary" size="sm">Learn More</Button>
      <Button variant="secondary" size="md">Explore Resources</Button>
      <Button variant="secondary" size="lg">View All</Button>
    </div>
  );
}

export function NavyAndGhost() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: 24, background: 'var(--fw-cream)' }}>
      <Button variant="navy" size="md">Submit</Button>
      <Button variant="ghost" size="md">Cancel</Button>
      <Button variant="primary" size="md" disabled>Disabled</Button>
    </div>
  );
}
