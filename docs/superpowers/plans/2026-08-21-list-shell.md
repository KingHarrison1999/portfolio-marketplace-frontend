# Reusable List Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, structure-only list-with-actions shell (filter tabs, checkbox/thumbnail/title/status/info-columns table, primary "Add" action), and wire it up as the real `seller/listings.html` page — making the dashboard sidebar's existing "Listings" link work.

**Architecture:** Two new SCSS partials — `Components/_status-badge.scss` (standalone reusable status pill) and `Components/_list-shell.scss` (header row, filter tabs, table) — wired into `main.scss`, with matching dark-theme rules in `Themes/_dark.scss`. `seller/listings.html` reuses the dashboard shell/sidebar markup from `dashboard.html` with "Listings" active, and places the new list-shell markup inside `.dashboard-main`.

**Tech Stack:** Plain SCSS (Dart Sass, compiled via `npm run build:css`), static HTML.

**Project notes for this plan:** No test runner, not a git repository. "Verification" means `npm run build:css` + grep checks on the compiled output, plus a final manual browser check. No commit steps.

Design doc: `docs/superpowers/specs/2026-08-21-list-shell-design.md`

---

### Task 1: Status badge component

**Files:**
- Create: `diecast-models.netlify.app/sass/Components/_status-badge.scss`

- [ ] **Step 1: Create the file with this exact content**

```scss
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.status-badge-active {
  background: #dcfce7;
  color: #166534;
}

.status-badge-draft {
  background: #fef3c7;
  color: #92400e;
}

.status-badge-archived {
  background: #e5e7eb;
  color: #4b5563;
}
```

- [ ] **Step 2: Confirm the file was written correctly**

Run: `grep -c "status-badge" "diecast-models.netlify.app/sass/Components/_status-badge.scss"`
Expected: a number greater than `0`

---

### Task 2: List shell component (header, tabs, table)

**Files:**
- Create: `diecast-models.netlify.app/sass/Components/_list-shell.scss`

- [ ] **Step 1: Create the file with this exact content**

```scss
.list-shell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;

  h1 {
    margin: 0;
  }
}

.list-tabs {
  display: flex;
  gap: 1.5rem;
  border-bottom: 1px solid #d1d5db;
  margin-bottom: 1.25rem;
}

.list-tab {
  background: transparent;
  border: none;
  padding: 0.6rem 0;
  font-weight: 600;
  font-size: 0.9rem;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.2s ease, border-color 0.2s ease;

  &:hover {
    color: #0f172a;
  }

  &.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }
}

.list-table-wrap {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: var(--radius);
  overflow-x: auto;
}

.list-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 0.85rem 1rem;
    text-align: left;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  th {
    color: #6b7280;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid #d1d5db;
  }

  tbody tr {
    border-bottom: 1px solid #e5e7eb;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: #f9fafb;
    }
  }

  input[type="checkbox"] {
    accent-color: #3b82f6;
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
}

.list-table-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  color: #0f172a;
}

.list-table-thumb {
  width: 40px;
  height: 40px;
  border-radius: 0.5rem;
  background: #e5e7eb;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Confirm the file was written correctly**

Run: `grep -c "list-table\|list-tab\|list-shell-header" "diecast-models.netlify.app/sass/Components/_list-shell.scss"`
Expected: a number greater than `0`

---

### Task 3: Wire both new partials into main.scss

**Files:**
- Modify: `diecast-models.netlify.app/sass/main.scss`

- [ ] **Step 1: Add both to the Components group**

Change this (lines 7–12):
```scss
@use 'Components/buttons';
@use 'Components/carousel';
@use 'Components/dropdown';
@use 'Components/filter-overlay';
@use 'Components/stat-card';
@use 'Components/form-shell';
```

To:
```scss
@use 'Components/buttons';
@use 'Components/carousel';
@use 'Components/dropdown';
@use 'Components/filter-overlay';
@use 'Components/stat-card';
@use 'Components/form-shell';
@use 'Components/status-badge';
@use 'Components/list-shell';
```

- [ ] **Step 2: Confirm the edit**

Run: `grep -n "status-badge\|list-shell" "diecast-models.netlify.app/sass/main.scss"`
Expected: two lines printed — `@use 'Components/status-badge';` and `@use 'Components/list-shell';`

---

### Task 4: Dark-theme rules for the list shell and status badges

**Files:**
- Modify: `diecast-models.netlify.app/sass/Themes/_dark.scss`

- [ ] **Step 1: Insert dark-mode rules after the form-shell block, before "Shared surfaces"**

Find this exact text (the end of the form-field dark rules added previously):
```scss
    .form-field-hint {
      color: var(--dark-muted);
    }
  }

  // --- Shared surfaces (product cards, filters panel, dropdown, toolbar, etc.) ---
```

Replace it with:
```scss
    .form-field-hint {
      color: var(--dark-muted);
    }
  }

  // --- List shell ---
  .list-tabs {
    border-bottom-color: var(--dark-line);
  }

  .list-tab {
    color: var(--dark-muted);

    &:hover {
      color: var(--dark-ink);
    }

    &.active {
      color: #3b82f6;
    }
  }

  .list-table-wrap {
    background: var(--dark-panel);
    border-color: var(--dark-line);
  }

  .list-table {
    th {
      color: var(--dark-muted);
      border-bottom-color: var(--dark-line);
    }

    tbody tr {
      border-bottom-color: var(--dark-line);

      &:hover {
        background: var(--dark-elev);
      }
    }
  }

  .list-table-title {
    color: var(--dark-ink);
  }

  .list-table-thumb {
    background: var(--dark-line);
  }

  // --- Status badges ---
  .status-badge-active {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
  }

  .status-badge-draft {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
  }

  .status-badge-archived {
    background: rgba(148, 163, 184, 0.2);
    color: #9aa3b2;
  }

  // --- Shared surfaces (product cards, filters panel, dropdown, toolbar, etc.) ---
```

- [ ] **Step 2: Confirm the edit**

Run: `grep -c "list-table\|list-tab\|status-badge" "diecast-models.netlify.app/sass/Themes/_dark.scss"`
Expected: a number greater than `0`

---

### Task 5: Build and verify the CSS compiles

**Files:** none (build step only)

- [ ] **Step 1: Run the build**

Run: `npm run build:css`
Expected: exits with code 0, no Sass errors printed.

- [ ] **Step 2: Confirm the new selectors made it into the compiled output**

Run: `grep -c "\.list-table\|\.list-tab\|\.status-badge" "diecast-models.netlify.app/Styles/main.compiled.css"`
Expected: a number greater than `0`

Run: `grep -c "\.design-1" "diecast-models.netlify.app/Styles/main.compiled.css"`
Expected: `0`

---

### Task 6: Listings page

**Files:**
- Create: `diecast-models.netlify.app/seller/listings.html`

- [ ] **Step 1: Create the file with this exact content**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Shop Manager — Listings</title>
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
        <li><a href="dashboard.html"><i class="fa-solid fa-gauge"></i><span>Dashboard</span></a></li>
        <li><a href="listings.html" class="active"><i class="fa-solid fa-boxes-stacked"></i><span>Listings</span></a></li>
        <li><a href="settings.html"><i class="fa-solid fa-gear"></i><span>Settings</span></a></li>
      </ul>
    </aside>
    <main class="dashboard-main">
      <div class="list-shell-header">
        <h1>Listings</h1>
        <button type="button" class="btn-primary">Add listing</button>
      </div>
      <div class="list-tabs">
        <button type="button" class="list-tab active">All</button>
        <button type="button" class="list-tab">Active</button>
        <button type="button" class="list-tab">Draft</button>
        <button type="button" class="list-tab">Archived</button>
      </div>
      <div class="list-table-wrap">
        <table class="list-table">
          <thead>
            <tr>
              <th><input type="checkbox" /></th>
              <th>Listing</th>
              <th>Status</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><input type="checkbox" /></td>
              <td>
                <div class="list-table-title">
                  <div class="list-table-thumb"></div>
                  <span>Example Listing 1</span>
                </div>
              </td>
              <td><span class="status-badge status-badge-active">Active</span></td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
            </tr>
            <tr>
              <td><input type="checkbox" /></td>
              <td>
                <div class="list-table-title">
                  <div class="list-table-thumb"></div>
                  <span>Example Listing 2</span>
                </div>
              </td>
              <td><span class="status-badge status-badge-draft">Draft</span></td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
            </tr>
            <tr>
              <td><input type="checkbox" /></td>
              <td>
                <div class="list-table-title">
                  <div class="list-table-thumb"></div>
                  <span>Example Listing 3</span>
                </div>
              </td>
              <td><span class="status-badge status-badge-archived">Archived</span></td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</body>
</html>
```

Note: `dashboard.html` is not modified by this task — each page carries its own copy of the sidebar with its own `active` state, and `dashboard.html`'s "Dashboard" link is already correctly marked active from the earlier build.

- [ ] **Step 2: Confirm the file was written correctly**

Run: `grep -c "list-table\|list-tab\|status-badge" "diecast-models.netlify.app/seller/listings.html"`
Expected: a number greater than `0`

---

### Task 7: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Open the page**

Open `diecast-models.netlify.app/seller/listings.html` directly in a browser.

Confirm:
- Sidebar renders with "Listings" visually active (blue accent), "Dashboard" not active.
- Header row shows "Listings" title and a blue "Add listing" button on the right.
- 4 filter tabs render with "All" underlined in blue.
- Table renders with a checkbox column, 3 rows each with a gray placeholder thumbnail square, a title ("Example Listing 1/2/3"), and a distinctly colored status badge (green/amber/gray for Active/Draft/Archived respectively), plus "—" in the remaining columns.

- [ ] **Step 2: Confirm dashboard.html's sidebar link now works**

Open `diecast-models.netlify.app/seller/dashboard.html`, click the "Listings" nav item, and confirm it navigates to the new `listings.html` page (previously a dead link).

- [ ] **Step 3: Confirm dark mode**

In dev tools console on `listings.html`, run `document.body.classList.add('theme-dark')` and confirm:
- Sidebar, tabs, and table all shift to dark tones (reusing the same dark treatment as the dashboard shell).
- All 3 status badges remain clearly distinguishable from each other in dark mode.

- [ ] **Step 4: Confirm basic narrow-viewport behavior**

Resize to ~375px wide. Confirm the table scrolls horizontally inside `.list-table-wrap` rather than breaking the page layout (this is why `.list-table-wrap` has `overflow-x: auto`). Smoke check only, not a full responsive pass.

---

## Self-review notes

- **Spec coverage:** filter tabs ✓ Task 2/6; table with checkbox/thumbnail/title/status/info-columns ✓ Task 2/6; primary "Add" button reusing `.btn-primary` ✓ Task 6; styled from existing tokens (`--radius`, existing accent blue) not the reference's visual style ✓ Tasks 1–2; status badge colors deliberately different from reference (green/amber/gray vs green/blue/gray) ✓ Task 1; embedded in dashboard shell with "Listings" active, making the sidebar link real ✓ Task 6; dark theme parity ✓ Task 4; no top app-bar chrome, no table toolbar icons, no real data/filtering/row actions — none of these appear in any task ✓.
- **No placeholders:** every step has literal file content or an exact command with an expected result.
- **Type/name consistency:** `.list-shell-header`, `.list-tabs`, `.list-tab`, `.list-table-wrap`, `.list-table`, `.list-table-title`, `.list-table-thumb`, `.status-badge`, `.status-badge-active/-draft/-archived` used identically across Tasks 1, 2, 4, and 6 — checked for drift, none found.
