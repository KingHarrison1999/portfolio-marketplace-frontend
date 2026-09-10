# Terms of Service page — design

## Context

The site needs a Terms of Service page built with realistic structure and layout so it's testable, but with placeholder copy clearly marked as such since real legal content doesn't exist yet.

## Page

`diecast-models.netlify.app/terms.html` — top-level, alongside `index.html`. Not seller- or shopper-specific, and it's real (if placeholder) site content rather than a UI-shell demo, so it doesn't belong in `shared/` with the dashboard/form/list shell demos.

## Structure

No site header/nav is reused — the homepage's mega-menu and hero search don't belong on a legal page. Just:
- `.container` (existing, `max-width: 1200px`) as the outer wrapper.
- `.legal-content` (new, `max-width: 720px`, centered) inside it, constraining prose to a readable line length — 1200px is too wide for paragraphs.
- `<h1>` page title ("Terms of Service").
- A placeholder-notice banner directly under the title.
- 7 numbered sections, each `<h2>` + `<p>`: Acceptance of Terms, Use of the Service, User Accounts, Prohibited Conduct, Intellectual Property, Limitation of Liability, Changes to These Terms, Contact. Body copy is generic placeholder text explicitly stating it's a stand-in, not lorem ipsum — easier to spot as "needs real content" at a glance than Latin filler.

## New component

`Pages/_terms.scss` (small, page-specific):
- `.legal-content` — the width-constrained prose wrapper described above.
- `.placeholder-notice` — bordered banner, amber tones reused from the existing `.status-badge-draft` colors (`#fef3c7` background / `#92400e` text) rather than a new color, reading like "Placeholder content — replace with real Terms of Service before launch."

## Styling

Everything else (font, body text color, background, `h1`/`h2` sizing) comes from the existing global `Base/_typography.scss` and `.container` — no new base styles needed.

## Theming

The existing global `body.theme-dark` rule already covers page background/text color. One dark-mode rule added to `Themes/_dark.scss` for `.placeholder-notice` so the amber banner stays legible on a dark background.

## Explicitly out of scope

- No real legal copy — placeholder text throughout, by design.
- No site header, footer, or navigation on this page.
- No table of contents / jump links between sections.

## Verification

- Load `terms.html`: title renders, placeholder-notice banner is clearly visible with its "replace before launch" message, 7 sections render each with a heading and a paragraph, prose column stays narrower than the full page width.
- Toggle `.theme-dark` on `<body>` via dev tools and confirm the page background/text switch to dark tones and the notice banner stays legible.
