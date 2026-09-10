# Seller dashboard shell — design

## Context

The site currently has only shopper-facing pages (`diecast/design1.html`) and the design-chooser tool (`index.html`). There's no seller-facing area yet. This spec covers the first piece of one: a reusable dashboard shell (sidebar nav + main content area) modeled structurally on Etsy's Shop Manager, but restyled entirely with this project's own design tokens and components. Structure only — no real data, no page-specific content yet. Future seller pages (Listings, Orders, Messages, Settings) are expected to reuse this same shell.

## Page

New file: `diecast-models.netlify.app/seller/dashboard.html`. New top-level `seller/` folder, parallel to `diecast/`, keeping shopper-facing and seller-facing pages separated as the seller area grows. Same page conventions as `design1.html`: links `../Styles/main.compiled.css`, loads the same Font Awesome kit script for icons.

## SCSS additions (added to `sass/main.scss`)

- **`Layout/_dashboard.scss`** — the shell:
  - `.dashboard-shell` — flex container, sidebar + main.
  - `.dashboard-sidebar` — brand/logo header + nav list.
  - `.dashboard-nav` — the 5 nav items: Dashboard, Listings, Orders, Messages, Settings. Icon + label each, Font Awesome icons matching the existing kit. Active item (Dashboard, by default) styled with the `#3b82f6` accent already used site-wide (left border or filled background) — not Etsy's black.
  - `.dashboard-main` — content area to the right of the sidebar.
- **`Components/_stat-card.scss`** — the stats overview row:
  - `.stats-row` — grid of 4 cards.
  - `.stat-card` — label / big value / small meta text. Uses existing `--radius` and `--shadow-soft` tokens, `hover-lift` mixin on hover (same pattern as product cards).

No new colors, shadows, or radii are introduced — everything pulls from `Utils/_variables.scss` and the existing `hover-lift` mixin.

## Content structure

Three zones, matching the structural (not visual) reference:

1. **Sidebar** — brand header ("Shop Manager" or similar generic label) + the 5 nav items above. No promo banner (Etsy-specific, explicitly excluded).
2. **Stats overview row** — 4 `.stat-card`s with generic, realistic e-commerce labels (Total Views, Visits, Orders, Revenue), placeholder values (e.g. `—`).
3. **Main content area below** — one generic placeholder section (a bordered/dashed block, clearly a stand-in), not a replica of Etsy's "open orders / dispatch" widget — that widget reads as Etsy-specific content rather than shell structure.

## Theming

Minimal dark-theme rules added to `Themes/_dark.scss` for the sidebar and stat cards, using the existing `--dark-panel`, `--dark-elev`, `--dark-line`, `--dark-ink`, `--dark-muted` tokens — dark mode is a core existing site feature and the shell should stay consistent with it rather than being light-only.

## Explicitly out of scope

- No real/mock data — this predates the (separately shelved) mock-data-layer work.
- No mobile sidebar collapse behavior — deferred to a later responsive pass.
- No Etsy-specific content (promo banner, specific order-dispatch widget).

## Verification

- Load `seller/dashboard.html` in a browser: sidebar renders with 5 nav items and an active Dashboard state, stats row shows 4 cards, placeholder content area renders below.
- Toggle dark mode (existing site mechanism) and confirm the shell picks up dark styling.
- Resize to a narrow viewport and confirm nothing breaks catastrophically, even without a dedicated mobile layout yet.
