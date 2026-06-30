import React from 'react';
import { Avatar } from '@faithfulwitness/design-system';

export function Sizes() {
  return (
    <div style={{ display: 'flex', gap: 16, padding: 24, alignItems: 'flex-end' }}>
      <Avatar initials="JD" size="sm" />
      <Avatar initials="MR" size="md" />
      <Avatar initials="AZ" size="lg" />
      <Avatar initials="FW" size="xl" />
    </div>
  );
}

export function Colors() {
  return (
    <div style={{ display: 'flex', gap: 16, padding: 24, alignItems: 'center' }}>
      <Avatar initials="FW" size="lg" color="navy" />
      <Avatar initials="FW" size="lg" color="gold" />
      <Avatar initials="FW" size="lg" color="cream" />
    </div>
  );
}
