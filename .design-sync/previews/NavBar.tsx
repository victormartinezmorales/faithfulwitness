import React from 'react';
import { NavBar, Button, Avatar } from '@faithfulwitness/design-system';

export function Default() {
  return (
    <NavBar
      title="Faithful Witness"
      subtitle="Discernment Experience"
      showStrip
    />
  );
}

export function WithActions() {
  return (
    <NavBar
      title="Faithful Witness"
      subtitle="Partner Dashboard"
      showStrip
      actions={
        <>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>First Community Church</span>
          <Avatar initials="FC" size="sm" />
        </>
      }
    />
  );
}

export function PortalHeader() {
  return (
    <NavBar
      title="Faithful Witness"
      subtitle="Insights Dashboard"
      showStrip
      actions={
        <>
          <Button variant="primary" size="sm">Join Us</Button>
        </>
      }
    />
  );
}
