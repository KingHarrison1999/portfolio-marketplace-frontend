// The one shared site header (masthead + off-canvas menu) -- markup lives
// here and nowhere else. Same pattern as js/site-footer.js: every page
// includes this as a plain (non-deferred) script exactly where the header
// belongs, near the top of <body>:
//
//   <script src="js/masthead.js"></script>      (or ../js/... in a subfolder)
//
// It runs synchronously and inserts the header in place of its own <script>
// tag. Links are resolved against this script's own URL, so the same markup
// works from root pages and subfolder pages (account/, admin/, checkout/,
// seller/, shared/) alike. Styles: home.css on index.html,
// sass/Components/_masthead.scss everywhere else.
//
// It also owns, for every page:
// - the light/dark theme: applies the stored choice as soon as it runs (no
//   flash of the wrong theme) and wires the toggle (this replaced js/theme.js)
// - the hamburger -> off-canvas menu (#hamburger-1 here, plus index.html's
//   scroll-up navbar #hamburger-2 if present)
// - the search box -> browse.html?q=...
// - the "Shop by Category" select and the menu's category list, both from
//   GET /api/categories (needs js/auth.js on the page). Listings sit in leaf
//   categories and the API matches category_id exactly, so each entry sends
//   its whole subtree as repeated category_id params (the browse page and
//   API OR them together). If the request fails, the select is hidden.
(function () {
  const THEME_KEY = 'marketplace-theme';
  const script = document.currentScript;
  if (!script) return;

  const root = script.src.replace(/js\/masthead\.js(\?.*)?$/, '');

  try {
    if (localStorage.getItem(THEME_KEY) === 'dark') document.body.classList.add('theme-dark');
  } catch (e) {
    // Storage unavailable -- stay on the default light theme.
  }

  const markup = `
  <header class="masthead">
    <div class="bar">
      <a href="${root}index.html" class="logo">Marketplace</a>
      <div class="right">
        <a href="${root}cart.html" class="masthead-icon" aria-label="Cart"><i class="fa-solid fa-cart-shopping" aria-hidden="true"></i></a>
        <a href="${root}login.html" class="masthead-icon" aria-label="Account"><i class="fa-solid fa-user" aria-hidden="true"></i></a>
        <button class="hamburger" id="hamburger-1" aria-label="Open menu" aria-expanded="false" aria-controls="offcanvas">
          <i class="fa-solid fa-bars" aria-hidden="true"></i>
        </button>
        <button class="mode-toggle pill-toggle" aria-pressed="false" title="Toggle light/dark">
          <span class="toggle-knob">
            <svg class="toggle-icon sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4"></circle>
              <line x1="12" y1="2" x2="12" y2="4"></line>
              <line x1="12" y1="20" x2="12" y2="22"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="2" y1="12" x2="4" y2="12"></line>
              <line x1="20" y1="12" x2="22" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg class="toggle-icon moon-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </span>
        </button>
      </div>
    </div>
    <div class="utility">
      <form class="search combo" id="masthead-search-form" role="search">
        <select id="masthead-category-select" aria-label="Shop by category">
          <option value="">Shop by Category</option>
        </select>
        <input type="search" id="masthead-search-input" placeholder="Search dresses, jackets, shoes, accessories..." aria-label="Search" />
        <button type="submit">Search</button>
      </form>
    </div>
  </header>

  <div class="offcanvas" id="offcanvas">
    <div class="panel" role="dialog" aria-modal="true" aria-label="Menu">
      <button class="close" aria-label="Close menu">✕</button>
      <a href="${root}index.html" class="logo offcanvas-logo">Marketplace</a>
      <nav class="mobile-nav">
        <p class="offcanvas-label">Categories</p>
        <ul id="mobile-nav-menu"></ul>
      </nav>
      <div class="offcanvas-links">
        <a href="${root}browse.html"><i class="fa-solid fa-magnifying-glass"></i> Browse</a>
        <a href="${root}cart.html"><i class="fa-solid fa-cart-shopping"></i> Cart</a>
        <a href="${root}login.html"><i class="fa-solid fa-user"></i> Account</a>
      </div>
    </div>
  </div>`;

  script.insertAdjacentHTML('beforebegin', markup);

  function wireTheme() {
    const toggle = document.querySelector('.masthead .mode-toggle');
    if (!toggle) return;
    const sync = () => toggle.setAttribute('aria-pressed', String(document.body.classList.contains('theme-dark')));
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const isDark = document.body.classList.toggle('theme-dark');
      try {
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
      } catch (err) {
        // Storage unavailable -- the toggle still works for this page load.
      }
      sync();
    });
    sync();
  }

  function wireMenu() {
    const oc = document.getElementById('offcanvas');
    const closeBtn = oc.querySelector('.close');
    const hamburgers = ['hamburger-1', 'hamburger-2'].map((id) => document.getElementById(id)).filter(Boolean);
    let opener = null;

    function openMenu(e) {
      opener = e && e.currentTarget;
      oc.classList.add('open');
      hamburgers.forEach((h) => h.setAttribute('aria-expanded', 'true'));
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function closeMenu() {
      if (!oc.classList.contains('open')) return;
      oc.classList.remove('open');
      hamburgers.forEach((h) => h.setAttribute('aria-expanded', 'false'));
      document.body.style.overflow = '';
      if (opener) opener.focus();
    }

    hamburgers.forEach((h) => h.addEventListener('click', openMenu));
    closeBtn.addEventListener('click', closeMenu);
    oc.addEventListener('click', (e) => {
      if (e.target === oc) closeMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  function browseUrl(params) {
    const qs = params.toString();
    return `${root}browse.html${qs ? `?${qs}` : ''}`;
  }

  function wireSearch() {
    const form = document.getElementById('masthead-search-form');
    const input = document.getElementById('masthead-search-input');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      window.location.href = browseUrl(q ? new URLSearchParams({ q }) : new URLSearchParams());
    });
  }

  // Every id in a category's subtree, the category itself included.
  function subtreeIds(id, childrenByParent) {
    const ids = [id];
    for (const child of childrenByParent.get(id) || []) ids.push(...subtreeIds(child.id, childrenByParent));
    return ids;
  }

  function categoryUrl(ids) {
    const params = new URLSearchParams();
    for (const id of ids) params.append('category_id', id);
    return browseUrl(params);
  }

  async function loadCategories() {
    const select = document.getElementById('masthead-category-select');
    const menu = document.getElementById('mobile-nav-menu');

    let categories;
    try {
      if (!window.MarketplaceAuth) throw new Error('js/auth.js not loaded');
      const res = await window.MarketplaceAuth.fetchWithAuth('/api/categories');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      categories = (await res.json()).categories || [];
      if (categories.length === 0) throw new Error('no categories');
    } catch (err) {
      console.warn('masthead: failed to load categories.', err);
      select.hidden = true;
      return;
    }

    const childrenByParent = new Map();
    for (const cat of categories) {
      if (!cat.parent_id) continue;
      if (!childrenByParent.has(cat.parent_id)) childrenByParent.set(cat.parent_id, []);
      childrenByParent.get(cat.parent_id).push(cat);
    }
    const topLevel = categories.filter((cat) => !cat.parent_id);

    // Select: one group per top-level category ("All Women", then Clothing,
    // Shoes, ...). Deeper levels are reachable from the browse page filters.
    for (const top of topLevel) {
      const group = document.createElement('optgroup');
      group.label = top.name;
      const all = new Option(`All ${top.name}`, subtreeIds(top.id, childrenByParent).join(','));
      group.appendChild(all);
      for (const child of childrenByParent.get(top.id) || []) {
        group.appendChild(new Option(child.name, subtreeIds(child.id, childrenByParent).join(',')));
      }
      select.appendChild(group);
    }
    select.addEventListener('change', () => {
      if (select.value) window.location.href = categoryUrl(select.value.split(','));
    });

    menu.innerHTML = '';
    for (const top of topLevel) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = categoryUrl(subtreeIds(top.id, childrenByParent));
      a.textContent = top.name;
      li.appendChild(a);
      menu.appendChild(li);
    }
  }

  function init() {
    wireTheme();
    wireMenu();
    wireSearch();
    loadCategories();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
