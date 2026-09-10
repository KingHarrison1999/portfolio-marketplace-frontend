# Seller Dashboard Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, structure-only seller dashboard shell (sidebar nav + stats row + placeholder content area) styled entirely from the existing design system, at `diecast-models.netlify.app/seller/dashboard.html`.

**Architecture:** Two new SCSS partials (`Layout/_dashboard.scss` for the shell/sidebar, `Components/_stat-card.scss` for the stats row) wired into the existing 7-1 `main.scss`, plus matching dark-theme rules in `Themes/_dark.scss`. One new static HTML page consumes the resulting classes — no JS, no real data.

**Tech Stack:** Plain SCSS (Dart Sass, compiled via `npm run build:css`), static HTML, Font Awesome (already loaded via the same kit script `design1.html` uses).

**Project notes for this plan:** This repository has no test runner and is not a git repository (confirmed: no `.git` directory). There is therefore no TDD red/green loop and no commit steps in this plan — "verification" means running `npm run build:css` and confirming the compiled CSS contains the expected selectors (grep), plus a final manual browser check. Skip any instruction elsewhere that assumes `git commit` or a test command; there are none here.

Design doc: `docs/superpowers/specs/2026-08-20-seller-dashboard-shell-design.md`

---

### Task 1: Dashboard shell layout partial

**Files:**
- Create: `diecast-models.netlify.app/sass/Layout/_dashboard.scss`

- [ ] **Step 1: Create the file with this exact content**

```scss
.dashboard-shell {
  display: flex;
  min-height: 100vh;
  background: #f7f7f9;
}

.dashboard-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: white;
  border-right: 1px solid #d1d5db;
  display: flex;
  flex-direction: column;

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    font-weight: 800;
    font-size: 1.1rem;
    border-bottom: 1px solid #d1d5db;
  }
}

.dashboard-nav {
  list-style: none;
  margin: 0;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  li a {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 0.75rem;
    border-radius: var(--radius);
    color: #374151;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
    transition: background 0.2s ease, color 0.2s ease;

    i {
      width: 1.1rem;
      text-align: center;
      font-size: 1rem;
    }

    &:hover {
      background: #f3f4f6;
      color: #0f172a;
    }

    &.active {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
      border-left: 3px solid #3b82f6;
      padding-left: calc(0.75rem - 3px);
    }
  }
}

.dashboard-main {
  flex: 1;
  padding: 2rem;
  min-width: 0;
}

.dashboard-placeholder {
  margin-top: 1.5rem;
  border: 2px dashed #d1d5db;
  border-radius: var(--radius);
  padding: 3rem 1.5rem;
  text-align: center;
  color: #6b7280;
  font-weight: 500;
}
```

- [ ] **Step 2: Confirm the file was written correctly**

Run: `grep -c "dashboard-shell" "diecast-models.netlify.app/sass/Layout/_dashboard.scss"`
Expected: `1` (the selector appears once, in the file you just wrote)

---

### Task 2: Stat card component partial

**Files:**
- Create: `diecast-models.netlify.app/sass/Components/_stat-card.scss`

- [ ] **Step 1: Create the file with this exact content**

```scss
@use '../Utils/mixins' as mixins;

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: var(--radius);
  box-shadow: var(--shadow-soft);
  padding: 1.25rem;
  @include mixins.hover-lift;

  .stat-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }

  .stat-value {
    font-size: 1.75rem;
    font-weight: 800;
    color: #0f172a;
  }

  .stat-meta {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #9aa3b2;
  }
}
```

- [ ] **Step 2: Confirm the file was written correctly**

Run: `grep -c "stat-card" "diecast-models.netlify.app/sass/Components/_stat-card.scss"`
Expected: `2` (the `.stat-card` selector and the `@use` mixin reference both mention it — actual count is fine as long as it's greater than 0; the important check is the file exists and is non-empty)

---

### Task 3: Wire the new partials into main.scss

**Files:**
- Modify: `diecast-models.netlify.app/sass/main.scss`

- [ ] **Step 1: Add the two new `@use` lines**

In the `Layout` group, add `dashboard` after the existing four Layout partials. In the `Components` group, add `stat-card` after the existing four Components partials.

Change this (lines 7–16):
```scss
@use 'Components/buttons';
@use 'Components/carousel';
@use 'Components/dropdown';
@use 'Components/filter-overlay';

@use 'Layout/grid';
@use 'Layout/header';
@use 'Layout/navigation';
@use 'Layout/footer';
@use 'Layout/forms';
```

To:
```scss
@use 'Components/buttons';
@use 'Components/carousel';
@use 'Components/dropdown';
@use 'Components/filter-overlay';
@use 'Components/stat-card';

@use 'Layout/grid';
@use 'Layout/header';
@use 'Layout/navigation';
@use 'Layout/footer';
@use 'Layout/forms';
@use 'Layout/dashboard';
```

- [ ] **Step 2: Confirm the edit**

Run: `grep -n "stat-card\|dashboard" "diecast-models.netlify.app/sass/main.scss"`
Expected: two lines printed — `@use 'Components/stat-card';` and `@use 'Layout/dashboard';`

---

### Task 4: Dark-theme rules for the dashboard shell

**Files:**
- Modify: `diecast-models.netlify.app/sass/Themes/_dark.scss`

- [ ] **Step 1: Add dashboard dark-mode rules inside the existing `.theme-dark { ... }` block**

Find the end of the `.mode-toggle` rule (currently the last rule before the "Shared surfaces" comment, around line 40):

```scss
  .mode-toggle {
    background: #1f2937;
    border-color: #374151;
  }
```

Insert the following immediately after that closing `}` (still inside the surrounding `.theme-dark { ... }` block):

```scss

  // --- Seller dashboard shell ---
  .dashboard-shell {
    background: var(--dark-bg);
  }

  .dashboard-sidebar {
    background: var(--dark-panel);
    border-color: var(--dark-line);
  }

  .dashboard-nav a {
    color: var(--dark-muted);

    &:hover {
      background: var(--dark-elev);
      color: var(--dark-ink);
    }

    &.active {
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
    }
  }

  .stat-card {
    background: var(--dark-elev);
    border-color: var(--dark-line);
    box-shadow: var(--dark-shadow);

    .stat-value {
      color: var(--dark-ink);
    }
  }

  .dashboard-placeholder {
    border-color: var(--dark-line);
    color: var(--dark-muted);
  }
```

- [ ] **Step 2: Confirm the edit**

Run: `grep -c "dashboard-shell\|dashboard-sidebar\|dashboard-nav\|dashboard-placeholder" "diecast-models.netlify.app/sass/Themes/_dark.scss"`
Expected: `4` or greater (each selector name appears at least once)

---

### Task 5: Build and verify the CSS compiles

**Files:** none (build step only)

- [ ] **Step 1: Run the build**

Run: `npm run build:css`
Expected: exits with code 0, no Sass errors printed.

- [ ] **Step 2: Confirm the new selectors made it into the compiled output**

Run: `grep -c "\.dashboard-shell\|\.stat-card\|\.dashboard-nav" "diecast-models.netlify.app/Styles/main.compiled.css"`
Expected: a number greater than `0` (selectors present in the compiled CSS)

Run: `grep -c "\.design-1" "diecast-models.netlify.app/Styles/main.compiled.css"`
Expected: `0` (confirms nothing reintroduced the old `.design-1` scoping pattern — sanity check consistent with the rest of this codebase's migration)

---

### Task 6: Dashboard HTML page

**Files:**
- Create: `diecast-models.netlify.app/seller/dashboard.html`

- [ ] **Step 1: Create the file with this exact content**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Shop Manager — Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="../Styles/main.compiled.css" />
  <script src="https://kit.fontawesome.com/66b2869aef.js" crossorigin="anonymous"></script>
</head>
<body>
  <div class="dashboard-shell">
    <aside class="dashboard-sidebar">
      <div class="sidebar-brand">
        <i class="fa-solid fa-store"></i>
        <span>Shop Manager</span>
      </div>
      <ul class="dashboard-nav">
        <li><a href="dashboard.html" class="active"><i class="fa-solid fa-gauge"></i><span>Dashboard</span></a></li>
        <li><a href="listings.html"><i class="fa-solid fa-boxes-stacked"></i><span>Listings</span></a></li>
        <li><a href="orders.html"><i class="fa-solid fa-receipt"></i><span>Orders</span></a></li>
        <li><a href="messages.html"><i class="fa-solid fa-comment"></i><span>Messages</span></a></li>
        <li><a href="settings.html"><i class="fa-solid fa-gear"></i><span>Settings</span></a></li>
      </ul>
    </aside>
    <main class="dashboard-main">
      <h1>Dashboard</h1>
      <section class="stats-row">
        <div class="stat-card">
          <div class="stat-label">Total Views</div>
          <div class="stat-value">—</div>
          <div class="stat-meta">Just now</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Visits</div>
          <div class="stat-value">—</div>
          <div class="stat-meta">Just now</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Orders</div>
          <div class="stat-value">—</div>
          <div class="stat-meta">Just now</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Revenue</div>
          <div class="stat-value">—</div>
          <div class="stat-meta">Just now</div>
        </div>
      </section>
      <div class="dashboard-placeholder">
        Main content area — placeholder
      </div>
    </main>
  </div>
</body>
</html>
```

Note: the nav links point to sibling pages (`listings.html`, `orders.html`, `messages.html`, `settings.html`) that don't exist yet — that's expected, they're placeholders for future pages that will reuse this same shell.

- [ ] **Step 2: Confirm the file was written correctly**

Run: `grep -c "dashboard-shell\|stat-card\|dashboard-nav" "diecast-models.netlify.app/seller/dashboard.html"`
Expected: a number greater than `0`

---

### Task 7: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Open the page**

Open `diecast-models.netlify.app/seller/dashboard.html` directly in a browser (double-click works — this page uses plain CSS, no ES modules, no fetch).

Confirm:
- Sidebar renders on the left with brand label "Shop Manager" and 5 nav items (Dashboard, Listings, Orders, Messages, Settings), each with an icon.
- "Dashboard" is visually marked active (blue accent, left border).
- To the right, a 4-card stats row renders (Total Views, Visits, Orders, Revenue), each showing "—" as the value.
- Below the stats row, a dashed placeholder box renders with the text "Main content area — placeholder".

- [ ] **Step 2: Confirm dark mode**

This page has no theme toggle button of its own (that's `design1.html`-specific JS, not part of this shell). To check dark styling, open the browser dev tools, run `document.body.classList.add('theme-dark')` in the console, and confirm:
- Sidebar background goes dark, nav text lightens, active item keeps its blue accent.
- Stat cards go dark with light text.
- Placeholder box border/text shift to the dark-mode muted tones.

- [ ] **Step 3: Confirm basic narrow-viewport behavior**

Resize the browser window down to ~375px wide (or use dev tools device toolbar). The sidebar will not collapse (explicitly deferred per the design doc) — confirm only that nothing overlaps unreadably or breaks the page entirely. This is a smoke check, not a responsive-design pass.

---

## Self-review notes

- **Spec coverage:** page location (`seller/dashboard.html`) ✓ Task 6; sidebar nav with exactly 5 items, no promo banner ✓ Task 6; stats row using existing tokens ✓ Task 2; generic placeholder main content (not Etsy's order-dispatch widget) ✓ Task 6; styling from `Utils/_variables.scss` (`--radius`, `--shadow-soft`, `hover-lift` mixin, `#3b82f6` accent) ✓ Tasks 1–2; dark-theme parity ✓ Task 4; no mobile collapse (explicitly deferred) ✓ noted in Task 7 Step 3; no real/mock data ✓ Task 6 uses static placeholder values only.
- **No placeholders:** every step has literal, complete file content or an exact command with an expected result — no "TBD"/"add appropriate styling" left in.
- **Type/name consistency:** `.dashboard-shell`, `.dashboard-sidebar`, `.dashboard-nav`, `.dashboard-main`, `.dashboard-placeholder`, `.stats-row`, `.stat-card` (with `.stat-label`/`.stat-value`/`.stat-meta`) are used identically across Tasks 1, 2, 4, and 6 — checked for drift, none found.
