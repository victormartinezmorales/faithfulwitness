import React from 'react';
import { StatCard } from '@faithfulwitness/design-system';

export function Dashboard() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 24, background: 'var(--fw-canvas)' }}>
      <StatCard label="Total Participants" value="1,284" change="↑ 18% vs last month" changeType="positive" />
      <StatCard label="Active Teams" value="47" change="↑ 6 new this week" changeType="positive" />
      <StatCard label="Completion Rate" value="73%" change="↓ 2% vs last period" changeType="negative" />
      <StatCard label="Avg. Score" value="4.2" change="No change" changeType="neutral" />
    </div>
  );
}

export function Single() {
  return (
    <div style={{ padding: 24, background: 'var(--fw-canvas)', maxWidth: 280 }}>
      <StatCard label="Partner Organizations" value="23" change="↑ 3 this quarter" changeType="positive" />
    </div>
  );
}
