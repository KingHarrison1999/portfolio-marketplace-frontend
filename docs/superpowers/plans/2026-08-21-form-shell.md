# Reusable Form Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, structure-only centered-form shell (labeled fields + helper text + primary button, centered card layout) styled from the existing design system, at `diecast-models.netlify.app/shared/form-shell.html`.

**Architecture:** A new globally-reusable `.btn-primary` class in `Components/_buttons.scss`, plus a new `Components/_form-shell.scss` partial (shell/card/header/field), wired into the existing 7-1 `main.scss`, with matching dark-theme rules in `Themes/_dark.scss`. One new static demo page consumes the resulting classes — no JS, no real form logic.

**Tech Stack:** Plain SCSS (Dart Sass, compiled via `npm run build:css`), static HTML.

**Project notes for this plan:** No test runner, not a git repository — same as the dashboard-shell plan before it. "Verification" means `npm run build:css` + grep checks on the compiled output, plus a final manual browser check. No commit steps.

Design doc: `docs/superpowers/specs/2026-08-21-form-shell-design.md`

---

### Task 1: Add `.btn-primary` to the buttons component

**Files:**
- Modify: `diecast-models.netlify.app/sass/Components/_buttons.scss`

- [ ] **Step 1: Insert `.btn-primary` between the base `button` rule and `.floating-filter-btn`**

Current file starts:
```scss
@use '../Utils/variables' as vars;

button {
  padding: 6px 10px;
  border: none;
  outline: none;
  color: #fff;
  cursor: pointer;
  border-radius: 40px;
  font-weight: 550;
  font-size: 0.85rem;
}

.floating-filter-btn {
```

Change the blank line between the `button { ... }` block and `.floating-filter-btn {` to insert this new rule:

```scss
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.25rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: vars.$color-accent-hover;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
}
```

So the file reads, in order: `@use` line, `button { ... }`, `.btn-primary { ... }` (new), `.floating-filter-btn { ... }` (unchanged).

- [ ] **Step 2: Confirm the edit**

Run: `grep -c "btn-primary" "diecast-models.netlify.app/sass/Components/_buttons.scss"`
Expected: `2` (the rule name appears in the selector and nowhere else duplicated — if you get `1` that's also fine, the important thing is the file contains `.btn-primary {`)

---

### Task 2: Create the form shell component partial

**Files:**
- Create: `diecast-models.netlify.app/sass/Components/_form-shell.scss`

- [ ] **Step 1: Create the file with this exact content**

```scss
.form-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: #f7f7f9;
}

.form-shell-card {
  width: 100%;
  max-width: 420px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 2rem;
}

.form-shell-header {
  text-align: center;
  margin-bottom: 1.5rem;

  h1 {
    margin: 0 0 0.5rem;
    font-size: 1.5rem;
    font-weight: 800;
    color: #0f172a;
  }

  p {
    margin: 0;
    color: #6b7280;
    font-size: 0.9rem;
  }
}

.form-shell-fields {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  .btn-primary {
    width: 100%;
    margin-top: 0.5rem;
  }
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  label {
    font-weight: 600;
    font-size: 0.85rem;
    color: #0f172a;
  }

  input {
    padding: 0.75rem;
    border: 2px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.95rem;
    transition: border-color 0.2s ease;

    &:focus {
      outline: none;
      border-color: #3b82f6;
    }
  }

  .form-field-hint {
    margin: 0;
    font-size: 0.8rem;
    color: #6b7280;
  }
}
```

- [ ] **Step 2: Confirm the file was written correctly**

Run: `grep -c "form-shell\|form-field" "diecast-models.netlify.app/sass/Components/_form-shell.scss"`
Expected: a number greater than `0`

---

### Task 3: Wire the new partial into main.scss

**Files:**
- Modify: `diecast-models.netlify.app/sass/main.scss`

- [ ] **Step 1: Add `form-shell` to the Components group**

Change this (lines 7–11):
```scss
@use 'Components/buttons';
@use 'Components/carousel';
@use 'Components/dropdown';
@use 'Components/filter-overlay';
@use 'Components/stat-card';
```

To:
```scss
@use 'Components/buttons';
@use 'Components/carousel';
@use 'Components/dropdown';
@use 'Components/filter-overlay';
@use 'Components/stat-card';
@use 'Components/form-shell';
```

- [ ] **Step 2: Confirm the edit**

Run: `grep -n "form-shell" "diecast-models.netlify.app/sass/main.scss"`
Expected: one line printed — `@use 'Components/form-shell';`

---

### Task 4: Dark-theme rules for the form shell

**Files:**
- Modify: `diecast-models.netlify.app/sass/Themes/_dark.scss`

- [ ] **Step 1: Insert dark-mode rules after the dashboard block, before "Shared surfaces"**

Find this exact text (the end of the dashboard dark rules added previously):
```scss
  .dashboard-placeholder {
    border-color: var(--dark-line);
    color: var(--dark-muted);
  }

  // --- Shared surfaces (product cards, filters panel, dropdown, toolbar, etc.) ---
```

Replace it with:
```scss
  .dashboard-placeholder {
    border-color: var(--dark-line);
    color: var(--dark-muted);
  }

  // --- Form shell ---
  .form-shell {
    background: var(--dark-bg);
  }

  .form-shell-card {
    background: var(--dark-panel);
    border-color: var(--dark-line);
    box-shadow: var(--dark-shadow);
  }

  .form-shell-header {
    h1 {
      color: var(--dark-ink);
    }

    p {
      color: var(--dark-muted);
    }
  }

  .form-field {
    label {
      color: var(--dark-ink);
    }

    input {
      background: var(--dark-elev);
      border-color: var(--dark-line);
      color: var(--dark-ink);

      &:focus {
        border-color: #3b82f6;
      }
    }

    .form-field-hint {
      color: var(--dark-muted);
    }
  }

  // --- Shared surfaces (product cards, filters panel, dropdown, toolbar, etc.) ---
```

- [ ] **Step 2: Confirm the edit**

Run: `grep -c "form-shell\|form-field" "diecast-models.netlify.app/sass/Themes/_dark.scss"`
Expected: a number greater than `0`

---

### Task 5: Build and verify the CSS compiles

**Files:** none (build step only)

- [ ] **Step 1: Run the build**

Run: `npm run build:css`
Expected: exits with code 0, no Sass errors printed.

- [ ] **Step 2: Confirm the new selectors made it into the compiled output**

Run: `grep -c "\.btn-primary\|\.form-shell\|\.form-field" "diecast-models.netlify.app/Styles/main.compiled.css"`
Expected: a number greater than `0`

Run: `grep -c "\.design-1" "diecast-models.netlify.app/Styles/main.compiled.css"`
Expected: `0` (sanity check consistent with the rest of this codebase's migration — nothing reintroduced old scoping)

---

### Task 6: Form shell demo page

**Files:**
- Create: `diecast-models.netlify.app/shared/form-shell.html`

- [ ] **Step 1: Create the file with this exact content**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Form Shell</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="../Styles/main.compiled.css" />
</head>
<body>
  <div class="form-shell">
    <div class="form-shell-card">
      <div class="form-shell-header">
        <h1>Form title</h1>
        <p>Form subtitle placeholder text</p>
      </div>
      <form class="form-shell-fields">
        <div class="form-field">
          <label for="field-one">Field label one</label>
          <input type="text" id="field-one" placeholder="Enter a value…" />
          <p class="form-field-hint">Helper text goes here</p>
        </div>
        <div class="form-field">
          <label for="field-two">Field label two</label>
          <input type="text" id="field-two" placeholder="Enter a value…" />
          <p class="form-field-hint">Helper text goes here</p>
        </div>
        <div class="form-field">
          <label for="field-three">Field label three</label>
          <input type="text" id="field-three" placeholder="Enter a value…" />
          <p class="form-field-hint">Helper text goes here</p>
        </div>
        <button type="submit" class="btn-primary">Continue</button>
      </form>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Confirm the file was written correctly**

Run: `grep -c "form-shell\|form-field\|btn-primary" "diecast-models.netlify.app/shared/form-shell.html"`
Expected: a number greater than `0`

---

### Task 7: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Open the page**

Open `diecast-models.netlify.app/shared/form-shell.html` directly in a browser (double-click works — plain CSS, no ES modules, no fetch).

Confirm:
- A white card is centered both horizontally and vertically on the page.
- Card shows a title, subtitle, 3 labeled fields (each with an input and helper text below), and a full-width blue "Continue" button.
- Clicking into a field shows a blue focus border.

- [ ] **Step 2: Confirm dark mode**

This page has no theme toggle of its own. In dev tools console, run `document.body.classList.add('theme-dark')` and confirm:
- Page background and card both go dark.
- Title/labels lighten, helper text becomes muted gray.
- Inputs get a dark background with light text; focus border stays visibly blue.

- [ ] **Step 3: Confirm basic narrow-viewport behavior**

Resize to ~375px wide. Confirm the card stays centered, doesn't overflow horizontally, and text remains readable. This is a smoke check, not a responsive-design pass.

---

## Self-review notes

- **Spec coverage:** `.btn-primary` extracted as reusable ✓ Task 1; shell/card/header/field structure ✓ Task 2; wired into build ✓ Task 3; dark theme parity ✓ Task 4; demo page with 3 generic stacked fields (not a single email box) ✓ Task 6; explicitly excludes logo/OAuth/divider/footer-link (none appear in any task) ✓; no real validation/submit logic (form has no JS, `type="submit"` with no handler) ✓.
- **No placeholders:** every step has literal file content or an exact command with an expected result.
- **Type/name consistency:** `.form-shell`, `.form-shell-card`, `.form-shell-header`, `.form-shell-fields`, `.form-field`, `.form-field-hint`, `.btn-primary` used identically across Tasks 1, 2, 4, and 6 — checked for drift, none found.
