import React from 'react';
import { OptionButton } from '@faithfulwitness/design-system';

export function States() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 24, maxWidth: 480, background: 'var(--fw-cream)' }}>
      <OptionButton selected={false}>I'm still forming my views on this issue</OptionButton>
      <OptionButton selected={true}>I feel ready to take faithful action in my community</OptionButton>
      <OptionButton selected={false}>I'm directly affected by these policies</OptionButton>
    </div>
  );
}

export function QuestionFlow() {
  return (
    <div style={{ padding: 24, background: 'var(--fw-cream)', maxWidth: 520 }}>
      <div style={{ fontFamily: 'var(--fw-font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--fw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Q3 of 12</div>
      <div style={{ fontFamily: 'var(--fw-font-sans)', fontSize: 16, fontWeight: 500, color: 'var(--fw-text-primary)', marginBottom: 16 }}>How do you primarily engage with immigration as an issue?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <OptionButton selected={false}>Through personal relationships with immigrants</OptionButton>
        <OptionButton selected={true}>Through my church's ministry and outreach</OptionButton>
        <OptionButton selected={false}>Through civic and political engagement</OptionButton>
        <OptionButton selected={false}>I'm not yet engaged, but want to learn</OptionButton>
      </div>
    </div>
  );
}
