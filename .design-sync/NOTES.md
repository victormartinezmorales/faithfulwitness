# Faithful Witness Design System — Sync Notes

## Setup

- This is a hand-built React library (`fw-design-system/`), not extracted from an existing package.
- react and react-dom must be installed as devDependencies in fw-design-system (not just peerDeps) so the converter can find them at `fw-design-system/node_modules`.
- Build command: `cd fw-design-system && npm run build` (runs esbuild + tsc emitDeclarationOnly).
- Converter entry: `fw-design-system/dist/index.es.js`
- CSS entry is the source file directly: `src/styles.css` — no esbuild CSS extraction.
- No `.storybook/` dir; shape is forced to `package` in config.

## Card layout

- `StepIndicator` FourStep story is wider than grid cells → `cfg.overrides.StepIndicator: {"cardMode": "column"}` applied on first sync.

## Fonts

- Libre Baskerville and Plus Jakarta Sans are Google Fonts, loaded via `@import url(...)` in styles.css.
- Not bundled — previews render in system fallback fonts. Real app must include the Google Fonts `<link>` tag.
- `runtimeFontPrefixes` is set for both families to suppress `[FONT_MISSING]`.

## Known render warns

None — all 12 components pass clean.

## Re-sync risks

- Inline preview compositions use hardcoded content (participant names, org names, metric numbers). If the real app changes these concepts they'll diverge silently — they're just demo data in previews, not business logic.
- `src/styles.css` is hand-written CSS. If new tokens are added to the React components, they must also be added to styles.css or they won't ship in the bundle CSS.
- The `.d.ts` parse check was skipped (typescript not installed in .ds-sync/node_modules). On re-sync, add `typescript` to `.ds-sync/` deps if prop extraction accuracy matters.
- Google Fonts URL in styles.css includes all weights (300–800). If the font weights used in components change, update the URL parameters.
