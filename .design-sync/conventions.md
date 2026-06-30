# Faithful Witness Design System — Conventions

## Wrapping and setup

No provider or root wrapper is needed. Components rely entirely on CSS custom properties (`--fw-*`) defined in `styles.css`. That stylesheet must be loaded for any component to be styled — always `@import "styles.css"` (or the path the agent's bundle provides) in the host app's root stylesheet. Without it, components fall back to browser defaults.

Components use `className`-based styling — no CSS-in-JS, no runtime theming.

## The styling idiom

All design values live in CSS custom properties with the `--fw-` prefix. Use these in any layout glue or wrapper elements you write:

| Token group | Examples |
|---|---|
| **Brand navy** | `var(--fw-navy)` `var(--fw-navy-light)` `var(--fw-navy-dark)` |
| **Gold** | `var(--fw-gold)` `var(--fw-gold-light)` `var(--fw-gold-bg)` `var(--fw-gold-pale)` |
| **Backgrounds** | `var(--fw-cream)` `var(--fw-canvas)` `var(--fw-white)` |
| **Text** | `var(--fw-text-primary)` `var(--fw-text-secondary)` `var(--fw-text-muted)` |
| **Border** | `var(--fw-border)` `var(--fw-border-light)` |
| **Status** | `var(--fw-green)` `var(--fw-green-bg)` `var(--fw-red)` `var(--fw-red-bg)` |
| **Radii** | `var(--fw-radius-sm)` `var(--fw-radius)` `var(--fw-radius-lg)` `var(--fw-radius-pill)` |
| **Shadows** | `var(--fw-shadow-sm)` `var(--fw-shadow)` `var(--fw-shadow-md)` |
| **Fonts** | `var(--fw-font-serif)` (Libre Baskerville) `var(--fw-font-sans)` (Plus Jakarta Sans) |

**Personality archetype colors** (for participant type badges/charts):
`--fw-p-open` (blue) · `--fw-p-thoughtful` (purple) · `--fw-p-ready` (coral) · `--fw-p-faithful` (teal) · `--fw-p-careful` (gold)

Never hardcode the hex values — always reference the token. Never use Tailwind or utility classes; this system has none.

## Typography

- **Headings / display text**: `font-family: var(--fw-font-serif)` — Libre Baskerville (serif). Used in `SectionHeader` titles, `StatCard` values, `NavBar` brand name, `Card` header text.
- **Everything else**: `font-family: var(--fw-font-sans)` — Plus Jakarta Sans. Body copy, labels, buttons, badges.
- **Uppercase labels / eyebrows**: 11–12px, `font-weight: 600`, `letter-spacing: 0.08–0.12em`, `text-transform: uppercase`. See `Badge`, `StatCard` label, `NavBar` subtitle.

## Where the truth lives

- Per-component APIs: `components/<group>/<Name>/<Name>.d.ts` (`<Name>Props` interface)
- Per-component usage notes: `components/<group>/<Name>/<Name>.prompt.md`
- All tokens: `styles.css` → `_ds_bundle.css` (the `:root { --fw-* }` block)

## Idiomatic build snippet

```jsx
import { NavBar, Card, SectionHeader, Button, Badge, StatCard } from '@faithfulwitness/design-system';

// Page shell — cream canvas, sticky navy header
function PortalPage() {
  return (
    <div style={{ background: 'var(--fw-canvas)', minHeight: '100vh' }}>
      <NavBar
        title="Faithful Witness"
        subtitle="Discernment Experience"
        showStrip
        actions={<Button variant="primary" size="sm">Join Us</Button>}
      />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem', display: 'grid', gap: '1.5rem' }}>
        <SectionHeader
          eyebrow="Assessment"
          title="Biblical Foundations"
          description="Explore what Scripture says about hospitality, justice, and the image of God in every person."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <StatCard label="Participants" value="1,284" change="↑ 18% this month" changeType="positive" />
          <StatCard label="Active Teams" value="47" />
          <StatCard label="Completion" value="73%" change="↓ 2%" changeType="negative" />
        </div>
        <Card accent>
          <Badge variant="gold">Still Discerning</Badge>
          <div style={{ fontFamily: 'var(--fw-font-serif)', fontSize: 20, color: 'var(--fw-navy)', marginTop: 8 }}>
            Still forming your views?
          </div>
        </Card>
      </div>
    </div>
  );
}
```
