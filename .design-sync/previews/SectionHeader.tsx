import React from 'react';
import { SectionHeader } from '@faithfulwitness/design-system';

export function Default() {
  return (
    <div style={{ padding: 24, background: 'var(--fw-cream)' }}>
      <SectionHeader
        eyebrow="Assessment"
        title="Biblical Foundations"
        description="Explore what Scripture says about hospitality, justice, and the image of God in every person."
      />
    </div>
  );
}

export function OnDarkBackground() {
  return (
    <div style={{ padding: 40, background: 'var(--fw-navy)', borderRadius: 12 }}>
      <SectionHeader
        eyebrow="A Shared Evangelical Initiative"
        title="A Gospel-Centered Response for a Divided Time"
        description="Forming the Church for courageous, nonviolent, Gospel-rooted engagement around immigration — right now."
        onDark
        titleLg
      />
    </div>
  );
}

export function MutedEyebrow() {
  return (
    <div style={{ padding: 24, background: 'var(--fw-white)' }}>
      <SectionHeader
        eyebrow="Your Journey"
        eyebrowMuted
        title="4 Stages of Discernment"
        description="Work through Scripture, prayer, and reflection at your own pace."
      />
    </div>
  );
}
