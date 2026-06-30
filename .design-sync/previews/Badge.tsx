import React from 'react';
import { Badge } from '@faithfulwitness/design-system';

export function AllVariants() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 24, alignItems: 'center', background: 'var(--fw-white)' }}>
      <Badge variant="gold">Discernment</Badge>
      <Badge variant="navy">Featured</Badge>
      <Badge variant="muted">Resource</Badge>
      <Badge variant="green">Active</Badge>
      <Badge variant="red">Urgent</Badge>
    </div>
  );
}

export function InContext() {
  return (
    <div style={{ padding: 24, background: 'var(--fw-cream)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Badge variant="gold">Still Discerning</Badge>
        <span style={{ fontFamily: 'var(--fw-font-serif)', fontSize: 20, color: 'var(--fw-navy)' }}>Still forming your views?</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Badge variant="green">Ready to Act</Badge>
        <span style={{ fontFamily: 'var(--fw-font-serif)', fontSize: 20, color: 'var(--fw-navy)' }}>Are you ready?</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Badge variant="muted">Directly Affected</Badge>
        <span style={{ fontFamily: 'var(--fw-font-serif)', fontSize: 20, color: 'var(--fw-navy)' }}>You are not alone.</span>
      </div>
    </div>
  );
}
