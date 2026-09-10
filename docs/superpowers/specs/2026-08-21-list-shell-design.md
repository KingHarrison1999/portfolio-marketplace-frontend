# Reusable list-with-actions shell — design

## Context

The seller dashboard's sidebar already has a "Listings" nav link pointing at `listings.html`, which doesn't exist yet. This spec builds that page as the first real use of a reusable list-with-actions shell (filter tabs, checkbox/thumbnail/title/status/info-column table, primary "Add" action) — modeled structurally on a reference screenshot but restyled entirely with this project's own design tokens. Structure and placeholder content only; no real data, filtering, or row actions yet.

## Page

`diecast-models.netlify.app/seller/listings.html` — reuses the `.dashboard-shell` / `.dashboard-sidebar` markup from `dashboard.html` verbatim, with the "Listings" nav item marked `active` instead of "Dashboard". This makes the existing sidebar link real rather than building an isolated demo page.

## New components

Kept domain-agnostic (`.list-*`, not `.listings-*`) so the same shell can later power an orders table, not just listings.

- **`Components/_list-shell.scss`**:
  - `.list-shell-header` — flex row: `h1` + `.btn-primary` "Add listing" button (reuses the button built for the form shell).
  - `.list-tabs` / `.list-tab` (`.active` modifier) — All / Active / Draft / Archived filter tabs, accent-underline active state.
  - `.list-table-wrap` — bordered, `var(--radius)`-rounded card wrapping the table.
  - `.list-table` — `thead`/`tbody` styling, checkbox column (`input[type=checkbox]` with `accent-color: #3b82f6`, scoped to this table, matching the existing scoped-not-global checkbox precedent in `Components/_filter-overlay.scss`), `.list-table-thumb` (gray placeholder square standing in for a product image), title cell, status cell, a few generic info columns.

- **`Components/_status-badge.scss`** — standalone reusable pill: `.status-badge` base + `.status-badge-active` (green), `.status-badge-draft` (amber), `.status-badge-archived` (gray). Split into its own file since it's independently reusable (order statuses later), not table-specific. Colors are semantic but deliberately different from the reference screenshot's green/blue/gray, per "not the reference site's visual style."

## Demo content

3 rows — "Example Listing 1/2/3" — one per status badge variant, so all three render. Other info columns (Category, Price, Stock) show `—` placeholders, matching the convention already used for the dashboard's stat values.

## Explicitly out of scope

- No top app-bar chrome (search/notification/avatar) from the reference — that's the reference site's own shell, and this page already has the dashboard sidebar/header.
- No table toolbar icons (search/filter/sort) — not part of the requested structural list.
- No real data, filtering behavior, or row actions (edit/delete/etc.) — pure structure.

## Theming

Dark-mode rules added to `Themes/_dark.scss` for `.list-shell-header`, `.list-tabs`/`.list-tab`, `.list-table-wrap`/`.list-table`, and `.status-badge` variants — consistent with every other component built so far.

## Verification

- Load `seller/listings.html`: sidebar renders with "Listings" active (not "Dashboard"), header shows "Listings" title + blue "Add listing" button, 4 filter tabs with "All" active, a table with checkbox column, placeholder thumbnails, 3 example rows each showing a different colored status badge.
- Toggle `.theme-dark` on `<body>` and confirm the tabs, table, and badges all shift to dark tones while staying legible (badge colors should stay distinguishable from each other).
- Confirm the `dashboard.html` sidebar's "Listings" link now actually navigates to a working page.
