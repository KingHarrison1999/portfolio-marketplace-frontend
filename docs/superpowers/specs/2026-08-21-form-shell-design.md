# Reusable centered-form shell — design

## Context

Several upcoming pages (login/signup, password reset, the seller listing editor) will need a centered, card-based form layout. Rather than building that layout once per page, this spec covers a single reusable shell — structure and styling only, no real form content or validation logic yet — modeled structurally on a reference screenshot (a login screen) but restyled entirely with this project's own design tokens. No branding, colors, icons, or copy from the reference are carried over.

## New reusable button class

`Components/_buttons.scss` gains `.btn-primary`: `background: #3b82f6`, white text, `border-radius: 0.5rem`, hover state using the existing `$color-accent-hover` variable. This is extracted from the filter overlay's `.btn-apply`, which is nested too deep in its own component to reuse elsewhere. `.btn-primary` becomes the first globally-reusable primary button in the codebase.

## New component: `Components/_form-shell.scss`

- `.form-shell` — full-viewport flex container; centers its child both axes.
- `.form-shell-card` — white card: `var(--radius)`, `var(--shadow-card)`, `1px solid #d1d5db`, `max-width: 420px`, padding.
- `.form-shell-header` — `h1` (title) + `p` (subtitle), centered text.
- `.form-shell-fields` — the `<form>` wrapper, stacks its children (`.form-field`s and the submit button) vertically with consistent gap.
- `.form-field` — one labeled field: `label`, `input`, `.form-field-hint` (helper text below, muted/small). Input styling reuses the existing `.newsletter input` pattern (2px border `#d1d5db`, `0.5rem` radius, `0.75rem` padding, border turns `#3b82f6` on focus) rather than the pill-shaped search inputs — closer match for a standalone field.
- Submit button: `.btn-primary`, full width within the card.

Explicitly excluded (present in the reference screenshot, not in the requested structure): logo/icon slot, OAuth-style social login buttons, "or continue with" divider, footer sign-up link.

## Demo page

`diecast-models.netlify.app/shared/form-shell.html` — new top-level `shared/` folder for cross-cutting UI that isn't shopper- or seller-specific. Uses 3 stacked `.form-field`s with deliberately generic placeholder copy ("Field label one/two/three", generic helper text, generic input placeholder text) to demonstrate the shell holds more than a single field, plus one `.btn-primary` submit button labeled "Continue". Same page conventions as the other pages in this project (links `../Styles/main.compiled.css`).

## Theming

Dark-mode rules added to `Themes/_dark.scss` for `.form-shell` (background), `.form-shell-card` (dark surface tokens), and `.form-field input` (dark input styling with focus state preserved) — consistent with how every other component in this codebase has been treated.

## Explicitly out of scope

- No real fields, validation, or submit behavior — pure structure/styling.
- No specific future-form content (login fields, password-reset fields, listing-editor fields) — those are separate future tasks that will reuse this shell.
- No logo/branding slot, no OAuth buttons, no divider, no footer link — not part of the requested structural list.

## Verification

- Load `shared/form-shell.html` in a browser: centered card renders with title/subtitle, 3 labeled fields each with helper text, full-width "Continue" button styled with the accent blue.
- Toggle `.theme-dark` on `<body>` via dev tools and confirm the card, inputs, and text all shift to dark tones with the focus state still visible.
- Resize to a narrow viewport and confirm the card stays legible and centered (no dedicated mobile pass required, but nothing should break).
