# Terms of Service Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `diecast-models.netlify.app/terms.html` — a realistically structured Terms of Service page with clearly-marked placeholder copy, styled from the existing homepage design system.

**Architecture:** One new small SCSS partial (`Pages/_terms.scss`) for the prose-width wrapper and placeholder-notice banner, wired into `main.scss`, plus one dark-theme rule for the banner. Everything else (fonts, colors, `.container`) already exists globally.

**Tech Stack:** Plain SCSS (Dart Sass, compiled via `npm run build:css`), static HTML.

**Project notes for this plan:** No test runner, not a git repository. "Verification" means `npm run build:css` + grep checks on the compiled output, plus a final manual browser check. No commit steps.

Design doc: `docs/superpowers/specs/2026-08-21-terms-page-design.md`

---

### Task 1: Terms page SCSS partial

**Files:**
- Create: `diecast-models.netlify.app/sass/Pages/_terms.scss`

- [ ] **Step 1: Create the file with this exact content**

```scss
.legal-content {
  max-width: 720px;
  margin: 0 auto;

  h1 {
    margin-bottom: 1rem;
  }

  section {
    margin-top: 2rem;

    h2 {
      font-size: 1.15rem;
      margin-bottom: 0.5rem;
      color: #0f172a;
    }

    p {
      color: #374151;
      line-height: 1.6;
    }
  }
}

.placeholder-notice {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  border-radius: var(--radius);
  padding: 1rem 1.25rem;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 2rem;
}
```

- [ ] **Step 2: Confirm the file was written correctly**

Run: `grep -c "legal-content\|placeholder-notice" "diecast-models.netlify.app/sass/Pages/_terms.scss"`
Expected: a number greater than `0`

---

### Task 2: Wire the new partial into main.scss

**Files:**
- Modify: `diecast-models.netlify.app/sass/main.scss`

- [ ] **Step 1: Add `terms` to the Pages group**

Change this (lines 23–24):
```scss
@use 'Pages/home';
@use 'Pages/contact';
```

To:
```scss
@use 'Pages/home';
@use 'Pages/contact';
@use 'Pages/terms';
```

- [ ] **Step 2: Confirm the edit**

Run: `grep -n "Pages/terms" "diecast-models.netlify.app/sass/main.scss"`
Expected: one line printed — `@use 'Pages/terms';`

---

### Task 3: Dark-theme rule for the placeholder notice

**Files:**
- Modify: `diecast-models.netlify.app/sass/Themes/_dark.scss`

- [ ] **Step 1: Insert a dark rule after the status-badge block, before "Shared surfaces"**

Find this exact text:
```scss
  .status-badge-archived {
    background: rgba(148, 163, 184, 0.2);
    color: #9aa3b2;
  }

  // --- Shared surfaces (product cards, filters panel, dropdown, toolbar, etc.) ---
```

Replace it with:
```scss
  .status-badge-archived {
    background: rgba(148, 163, 184, 0.2);
    color: #9aa3b2;
  }

  // --- Terms page ---
  .placeholder-notice {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border-color: rgba(245, 158, 11, 0.4);
  }

  // --- Shared surfaces (product cards, filters panel, dropdown, toolbar, etc.) ---
```

- [ ] **Step 2: Confirm the edit**

Run: `grep -c "placeholder-notice" "diecast-models.netlify.app/sass/Themes/_dark.scss"`
Expected: a number greater than `0`

---

### Task 4: Build and verify the CSS compiles

**Files:** none (build step only)

- [ ] **Step 1: Run the build**

Run: `npm run build:css`
Expected: exits with code 0, no Sass errors printed.

- [ ] **Step 2: Confirm the new selectors made it into the compiled output**

Run: `grep -c "\.legal-content\|\.placeholder-notice" "diecast-models.netlify.app/Styles/main.compiled.css"`
Expected: a number greater than `0`

Run: `grep -c "\.design-1" "diecast-models.netlify.app/Styles/main.compiled.css"`
Expected: `0`

---

### Task 5: Terms of Service page

**Files:**
- Create: `diecast-models.netlify.app/terms.html`

- [ ] **Step 1: Create the file with this exact content**

Note: this file lives at the top level, alongside `index.html` — the stylesheet path is `Styles/main.compiled.css`, not `../Styles/...` (that `../` prefix is only correct for pages nested one folder deep, like `diecast/design1.html` or `seller/dashboard.html`).

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Terms of Service</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="Styles/main.compiled.css" />
</head>
<body>
  <div class="container">
    <div class="legal-content">
      <h1>Terms of Service</h1>
      <div class="placeholder-notice">
        Placeholder content — replace with real Terms of Service before launch.
      </div>

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>Section content goes here. This paragraph is a stand-in for the real acceptance-of-terms language and should be replaced before this page goes live.</p>
      </section>

      <section>
        <h2>2. Use of the Service</h2>
        <p>Section content goes here. This paragraph is a stand-in for the real terms governing how the service may be used and should be replaced before this page goes live.</p>
      </section>

      <section>
        <h2>3. User Accounts</h2>
        <p>Section content goes here. This paragraph is a stand-in for the real account-related terms and should be replaced before this page goes live.</p>
      </section>

      <section>
        <h2>4. Prohibited Conduct</h2>
        <p>Section content goes here. This paragraph is a stand-in for the real list of prohibited conduct and should be replaced before this page goes live.</p>
      </section>

      <section>
        <h2>5. Intellectual Property</h2>
        <p>Section content goes here. This paragraph is a stand-in for the real intellectual property terms and should be replaced before this page goes live.</p>
      </section>

      <section>
        <h2>6. Limitation of Liability</h2>
        <p>Section content goes here. This paragraph is a stand-in for the real limitation-of-liability language and should be replaced before this page goes live.</p>
      </section>

      <section>
        <h2>7. Changes to These Terms</h2>
        <p>Section content goes here. This paragraph is a stand-in for the real terms describing how changes to this policy will be communicated and should be replaced before this page goes live.</p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>Section content goes here. This paragraph is a stand-in for real contact information and should be replaced before this page goes live.</p>
      </section>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Confirm the file was written correctly**

Run: `grep -c "legal-content\|placeholder-notice\|<section>" "diecast-models.netlify.app/terms.html"`
Expected: a number greater than `0`

Run: `grep -c "<h2>" "diecast-models.netlify.app/terms.html"`
Expected: `8`

---

### Task 6: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Open the page**

Open `diecast-models.netlify.app/terms.html` directly in a browser.

Confirm:
- "Terms of Service" title renders at the top.
- An amber placeholder-notice banner is clearly visible directly below the title, reading the "replace before launch" message.
- 8 numbered sections render below it, each with a heading and one paragraph of visibly-placeholder body text.
- The prose column is noticeably narrower than the full browser width (not stretched edge-to-edge).

- [ ] **Step 2: Confirm dark mode**

In dev tools console, run `document.body.classList.add('theme-dark')` and confirm the page background and text switch to dark tones, and the placeholder-notice banner stays legible (amber text on a dark-tinted background, not invisible).

---

## Self-review notes

- **Spec coverage:** heading + sections with subheading/body pattern ✓ Task 5; realistic non-lorem-ipsum placeholder copy explicitly marked as placeholder ✓ Task 5; visible placeholder-notice banner ✓ Tasks 1/5; styled from existing homepage tokens (`.container`, global typography) with no new header/nav ✓ Task 5; dark theme ✓ Task 3.
- **Correction from the design doc:** the design doc said "7 sections" but enumerated 8 section topics (Acceptance, Use of Service, User Accounts, Prohibited Conduct, Intellectual Property, Limitation of Liability, Changes to Terms, Contact) — a miscount in the prose, not a scope decision. This plan uses 8, matching the actual list and the design's own intent.
- **No placeholders (plan-quality sense):** every step has literal file content or an exact command with an expected result. (The page's *content* is intentionally placeholder copy — that's the feature being built, not a gap in this plan.)
- **Type/name consistency:** `.legal-content`, `.placeholder-notice` used identically across Tasks 1, 3, and 5 — checked for drift, none found.
