import React from 'react';
import { Card, SectionHeader, Badge } from '@faithfulwitness/design-system';

export function Base() {
  return (
    <div style={{ padding: 24, background: 'var(--fw-cream)', display: 'grid', gap: 16 }}>
      <Card>
        <SectionHeader eyebrow="Discernment" title="Still forming your views?" description="You can learn, pray, and engage thoughtfully without pressure of partisan framing." />
      </Card>
    </div>
  );
}

export function WithAccent() {
  return (
    <div style={{ padding: 24, background: 'var(--fw-cream)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card accent>
        <Badge variant="gold">Clarity</Badge>
        <div style={{ fontFamily: 'var(--fw-font-serif)', fontSize: 18, color: 'var(--fw-navy)', marginTop: 6, marginBottom: 4 }}>Biblical Grounding</div>
        <div style={{ fontSize: 14, color: 'var(--fw-text-secondary)' }}>Root your response in Scripture and tradition.</div>
      </Card>
      <Card accent>
        <Badge variant="gold">Community</Badge>
        <div style={{ fontFamily: 'var(--fw-font-serif)', fontSize: 18, color: 'var(--fw-navy)', marginTop: 6, marginBottom: 4 }}>Local Movement</div>
        <div style={{ fontSize: 14, color: 'var(--fw-text-secondary)' }}>Connect with churches taking faithful action.</div>
      </Card>
    </div>
  );
}

export function NavyAccent() {
  return (
    <div style={{ padding: 24, background: 'var(--fw-canvas)' }}>
      <Card navyAccent padding="lg">
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fw-text-muted)', marginBottom: 8 }}>PARTNER ORGANIZATION</div>
        <div style={{ fontFamily: 'var(--fw-font-serif)', fontSize: 28, color: 'var(--fw-navy)', marginBottom: 6 }}>First Community Church</div>
        <div style={{ fontSize: 14, color: 'var(--fw-text-secondary)' }}>Austin, TX — Established partner since 2023</div>
      </Card>
    </div>
  );
}
