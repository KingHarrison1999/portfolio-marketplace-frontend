// The one shared site header (masthead nav bar + off-canvas menu) and the
// floating search button -- markup lives here and nowhere else. Same
// pattern as js/site-footer.js: every page includes this as a plain
// (non-deferred) script exactly where the header belongs, near the top of
// <body>:
//
//   <script src="js/masthead.js"></script>      (or ../js/... in a subfolder)
//
// It runs synchronously and inserts the header in place of its own <script>
// tag (the floating search button and its panel go at the end of <body>).
// Links are resolved against this script's own URL, so the same markup
// works from root pages and subfolder pages (account/, admin/, checkout/,
// seller/, shared/) alike. Styles: Styles/masthead.css on every page, plus
// the older bar/toggle/off-canvas rules in home.css (index.html) and
// sass/Components/_masthead.scss (everywhere else).
//
// It also owns, for every page:
// - the light/dark theme: applies the stored choice as soon as it runs (no
//   flash of the wrong theme) and wires the toggle (this replaced js/theme.js)
// - the category nav: one link per top-level category from
//   GET /api/categories (needs js/auth.js on the page), each with a hover /
//   focus dropdown of its subcategories, plus "Browse All". Below 1024px the
//   links are hidden and the hamburger opens the off-canvas menu, which holds
//   the same tree as an accordion. Nothing is hard-coded: if the request
//   fails, only "Browse All" shows.
// - the floating "Search for..." button and its search panel (category +
//   text -> browse.html?q=...&category_id=...). On index.html it stays
//   hidden while the hero search form (#hero-search-form) is on screen.
//
// Listings sit in leaf categories and the API matches category_id exactly,
// so every category link sends its whole subtree as repeated category_id
// params (the browse page and API OR them together).
(function () {
  const THEME_KEY = 'marketplace-theme';
  const DESKTOP_QUERY = '(min-width: 1024px)';
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
      <nav class="masthead-nav" aria-label="Shop by category">
        <ul class="masthead-nav-list" id="masthead-nav-list">
          <li class="masthead-nav-item"><a class="masthead-nav-link" href="${root}browse.html">Browse All</a></li>
        </ul>
      </nav>
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
  </header>

  <div class="offcanvas" id="offcanvas">
    <div class="panel" role="dialog" aria-modal="true" aria-label="Menu">
      <button class="close" aria-label="Close menu">✕</button>
      <a href="${root}index.html" class="logo offcanvas-logo">Marketplace</a>
      <nav class="mobile-nav" aria-label="Shop by category">
        <ul id="mobile-nav-menu"></ul>
      </nav>
      <div class="offcanvas-links">
        <a href="${root}browse.html"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Browse All</a>
        <a href="${root}cart.html"><i class="fa-solid fa-cart-shopping" aria-hidden="true"></i> Cart</a>
        <a href="${root}login.html"><i class="fa-solid fa-user" aria-hidden="true"></i> Account</a>
      </div>
    </div>
  </div>`;

  const searchMarkup = `
  <button type="button" class="floating-search-btn" id="floating-search-btn" aria-haspopup="dialog" aria-expanded="false" aria-controls="search-panel">
    <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
    <span class="floating-search-label">Search for...</span>
  </button>

  <div class="search-panel" id="search-panel" role="dialog" aria-labelledby="search-panel-title" hidden>
    <div class="search-panel-head">
      <h2 class="search-panel-title" id="search-panel-title">Search</h2>
      <button type="button" class="search-panel-close" aria-label="Close search"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    </div>
    <form class="search-panel-form" id="search-panel-form" role="search">
      <label class="search-panel-field">
        <span>Category</span>
        <select id="search-panel-category">
          <option value="">All categories</option>
        </select>
      </label>
      <label class="search-panel-field">
        <span>Search for</span>
        <input type="search" id="search-panel-input" placeholder="Dresses, boots, bags..." autocomplete="off" />
      </label>
      <button type="submit" class="search-panel-submit">Search</button>
    </form>
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
    const hamburger = document.getElementById('hamburger-1');

    function openMenu() {
      oc.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function closeMenu() {
      if (!oc.classList.contains('open')) return;
      oc.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (hamburger.offsetParent) hamburger.focus();
    }

    hamburger.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    oc.addEventListener('click', (e) => {
      if (e.target === oc) closeMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
    // The hamburger disappears at desktop width; don't leave the menu open
    // (and the page scroll-locked) behind it.
    window.matchMedia(DESKTOP_QUERY).addEventListener('change', (e) => {
      if (e.matches) closeMenu();
    });
  }

  function browseUrl(params) {
    const qs = params ? params.toString() : '';
    return `${root}browse.html${qs ? `?${qs}` : ''}`;
  }

  function categoryUrl(ids) {
    const params = new URLSearchParams();
    for (const id of ids) params.append('category_id', id);
    return browseUrl(params);
  }

  // GET /api/categories as a tree: top-level categories in API order, and
  // each category's children. Rejects if the request fails or is empty.
  async function fetchCategoryTree() {
    if (!window.MarketplaceAuth) throw new Error('js/auth.js not loaded');
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/categories');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const categories = (await res.json()).categories || [];
    if (categories.length === 0) throw new Error('no categories');

    const childrenByParent = new Map();
    for (const cat of categories) {
      if (!cat.parent_id) continue;
      if (!childrenByParent.has(cat.parent_id)) childrenByParent.set(cat.parent_id, []);
      childrenByParent.get(cat.parent_id).push(cat);
    }
    const children = (cat) => childrenByParent.get(cat.id) || [];
    // Every id in a category's subtree, the category itself included.
    const subtreeIds = (cat) => [cat.id, ...children(cat).flatMap(subtreeIds)];
    return { topLevel: categories.filter((cat) => !cat.parent_id), children, subtreeIds };
  }

  function link(href, text, className) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    if (className) a.className = className;
    return a;
  }

  // --- Desktop nav: one link per top-level category, each with a dropdown
  // of second-level groups (Clothing, Shoes...) and their third level. ---

  function buildNav(tree) {
    const list = document.getElementById('masthead-nav-list');
    const browseAll = list.lastElementChild;

    tree.topLevel.forEach((top, i) => {
      const li = document.createElement('li');
      li.className = 'masthead-nav-item has-dropdown';

      const panelId = `masthead-dropdown-${i}`;
      const topLink = link(categoryUrl(tree.subtreeIds(top)), top.name, 'masthead-nav-link');
      topLink.setAttribute('aria-expanded', 'false');
      topLink.setAttribute('aria-controls', panelId);
      topLink.insertAdjacentHTML('beforeend', ' <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>');
      li.appendChild(topLink);

      const dropdown = document.createElement('div');
      dropdown.className = 'masthead-dropdown';
      dropdown.id = panelId;
      dropdown.hidden = true;

      const grid = document.createElement('div');
      grid.className = 'masthead-dropdown-grid';
      for (const group of tree.children(top)) {
        const col = document.createElement('div');
        col.className = 'masthead-dropdown-col';
        col.appendChild(link(categoryUrl(tree.subtreeIds(group)), group.name, 'masthead-dropdown-heading'));
        const leaves = tree.children(group);
        if (leaves.length > 0) {
          const ul = document.createElement('ul');
          for (const leaf of leaves) {
            const leafLi = document.createElement('li');
            leafLi.appendChild(link(categoryUrl(tree.subtreeIds(leaf)), leaf.name));
            ul.appendChild(leafLi);
          }
          col.appendChild(ul);
        }
        grid.appendChild(col);
      }
      dropdown.appendChild(grid);
      dropdown.appendChild(link(topLink.href, `Shop all ${top.name}`, 'masthead-dropdown-all'));
      li.appendChild(dropdown);

      list.insertBefore(li, browseAll);
    });

    wireDropdowns(list);
  }

  function wireDropdowns(list) {
    const items = Array.from(list.querySelectorAll('.has-dropdown'));
    let closeTimer = null;
    let lastPointer = 'mouse';
    // Set while focus is moved back to a top link programmatically (Escape),
    // so that focus doesn't immediately re-open the dropdown just closed.
    let suppressFocusOpen = false;

    const topLinkOf = (li) => li.querySelector('.masthead-nav-link');
    const dropdownOf = (li) => li.querySelector('.masthead-dropdown');
    const isOpen = (li) => li.classList.contains('open');

    function open(li) {
      clearTimeout(closeTimer);
      items.forEach((other) => other !== li && close(other));
      li.classList.add('open');
      dropdownOf(li).hidden = false;
      topLinkOf(li).setAttribute('aria-expanded', 'true');
    }

    function close(li) {
      if (!isOpen(li)) return;
      li.classList.remove('open');
      dropdownOf(li).hidden = true;
      topLinkOf(li).setAttribute('aria-expanded', 'false');
    }

    const closeAll = () => items.forEach(close);

    for (const li of items) {
      const topLink = topLinkOf(li);

      li.addEventListener('mouseenter', () => open(li));
      li.addEventListener('mouseleave', () => {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => close(li), 150);
      });

      li.addEventListener('focusin', () => {
        if (suppressFocusOpen) return;
        open(li);
      });
      li.addEventListener('focusout', (e) => {
        if (!li.contains(e.relatedTarget)) close(li);
      });

      li.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen(li)) {
          e.preventDefault();
          close(li);
          suppressFocusOpen = true;
          topLink.focus();
          suppressFocusOpen = false;
        } else if (e.key === 'ArrowDown' && e.target === topLink) {
          // Re-open after Escape, and jump into the dropdown.
          e.preventDefault();
          open(li);
          const first = dropdownOf(li).querySelector('a');
          if (first) first.focus();
        }
      });

      // Touch has no hover: the first tap on a closed top link opens its
      // dropdown instead of navigating; a second tap follows the link.
      topLink.addEventListener('pointerdown', (e) => {
        lastPointer = e.pointerType;
      });
      topLink.addEventListener('click', (e) => {
        if (lastPointer === 'touch' && !li.dataset.touchOpened) {
          e.preventDefault();
          open(li);
          li.dataset.touchOpened = '1';
        }
      });
      li.addEventListener('mouseleave', () => delete li.dataset.touchOpened);
    }

    document.addEventListener('click', (e) => {
      if (!list.contains(e.target)) {
        closeAll();
        items.forEach((li) => delete li.dataset.touchOpened);
      }
    });
  }

  // --- Off-canvas menu: the same tree as a two-level accordion. ---

  let accordionCount = 0;

  function accordionItem(label, allHref, allText, bodyChildren, level) {
    const li = document.createElement('li');
    li.className = `accordion-item level-${level}`;
    const bodyId = `mobile-nav-acc-${accordionCount++}`;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'accordion-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', bodyId);
    toggle.textContent = label;
    toggle.insertAdjacentHTML('beforeend', '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>');

    const body = document.createElement('ul');
    body.className = 'accordion-body';
    body.id = bodyId;
    body.hidden = true;
    const allLi = document.createElement('li');
    allLi.appendChild(link(allHref, allText, 'accordion-all'));
    body.appendChild(allLi);
    bodyChildren.forEach((child) => body.appendChild(child));

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      body.hidden = expanded;
    });

    li.appendChild(toggle);
    li.appendChild(body);
    return li;
  }

  function buildMobileNav(tree) {
    const menu = document.getElementById('mobile-nav-menu');
    menu.innerHTML = '';
    for (const top of tree.topLevel) {
      const groups = tree.children(top).map((group) => {
        const leaves = tree.children(group);
        const groupHref = categoryUrl(tree.subtreeIds(group));
        if (leaves.length === 0) {
          const li = document.createElement('li');
          li.appendChild(link(groupHref, group.name));
          return li;
        }
        const leafItems = leaves.map((leaf) => {
          const li = document.createElement('li');
          li.appendChild(link(categoryUrl(tree.subtreeIds(leaf)), leaf.name));
          return li;
        });
        return accordionItem(group.name, groupHref, `All ${group.name}`, leafItems, 2);
      });
      menu.appendChild(accordionItem(top.name, categoryUrl(tree.subtreeIds(top)), `Shop all ${top.name}`, groups, 1));
    }
  }

  // --- Floating search button + panel ---

  function fillSearchCategories(tree) {
    const select = document.getElementById('search-panel-category');
    if (!select) return;
    // Indent each level under its parent; the value carries the subtree.
    const add = (cat, depth) => {
      const option = new Option(`${'   '.repeat(depth)}${cat.name}`, tree.subtreeIds(cat).join(','));
      select.appendChild(option);
      tree.children(cat).forEach((child) => add(child, depth + 1));
    };
    tree.topLevel.forEach((top) => add(top, 0));
  }

  function wireFloatingSearch() {
    document.body.insertAdjacentHTML('beforeend', searchMarkup);
    const btn = document.getElementById('floating-search-btn');
    const panel = document.getElementById('search-panel');
    const form = document.getElementById('search-panel-form');
    const input = document.getElementById('search-panel-input');
    const select = document.getElementById('search-panel-category');
    const closeBtn = panel.querySelector('.search-panel-close');

    const isOpen = () => !panel.hidden;

    function openPanel() {
      panel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      btn.classList.add('is-active');
      input.focus();
    }

    function closePanel({ returnFocus = true } = {}) {
      if (!isOpen()) return;
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('is-active');
      if (returnFocus) btn.focus();
    }

    btn.addEventListener('click', () => (isOpen() ? closePanel() : openPanel()));
    closeBtn.addEventListener('click', () => closePanel());
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
      }
    });
    document.addEventListener('click', (e) => {
      if (isOpen() && !panel.contains(e.target) && !btn.contains(e.target)) closePanel({ returnFocus: false });
    });
    // Tabbing out of the panel closes it too (it isn't modal).
    panel.addEventListener('focusout', (e) => {
      if (e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== btn) {
        closePanel({ returnFocus: false });
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const params = new URLSearchParams();
      const q = input.value.trim();
      if (q) params.set('q', q);
      if (select.value) select.value.split(',').forEach((id) => params.append('category_id', id));
      window.location.href = browseUrl(params);
    });

    // Step aside (fade out) while something clickable scrolls underneath the
    // button: the footer newsletter form on every page, and listing.html's
    // Buy / Add to Cart buttons on phones. browse.html's filter button is
    // avoided in CSS by stacking above it.
    const obstacles = Array.from(document.querySelectorAll('.newsletter, .purchase-panel-actions'));
    let dodgeQueued = false;
    function dodge() {
      dodgeQueued = false;
      if (isOpen()) return;
      const b = btn.getBoundingClientRect();
      const pad = 12;
      const blocked = obstacles.some((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.left < b.right + pad && b.left - pad < r.right && r.top < b.bottom + pad && b.top - pad < r.bottom;
      });
      btn.classList.toggle('is-dodging', blocked);
    }
    if (obstacles.length > 0) {
      const queue = () => {
        if (dodgeQueued) return;
        dodgeQueued = true;
        requestAnimationFrame(dodge);
      };
      window.addEventListener('scroll', queue, { passive: true });
      window.addEventListener('resize', queue);
      // Content loaded after page load (listing.html fills in the product
      // asynchronously) moves the obstacles without any scroll.
      if ('ResizeObserver' in window) new ResizeObserver(queue).observe(document.body);
      queue();
    }

    // Homepage: the hero already has a search bar, so the floating button
    // only appears once that bar has scrolled out of view.
    const heroSearch = document.getElementById('hero-search-form');
    if (heroSearch && 'IntersectionObserver' in window) {
      btn.classList.add('is-hidden');
      new IntersectionObserver((entries) => {
        const heroVisible = entries[entries.length - 1].isIntersecting;
        btn.classList.toggle('is-hidden', heroVisible);
        if (heroVisible) closePanel({ returnFocus: false });
      }).observe(heroSearch);
    }
  }

  async function loadCategories() {
    let tree;
    try {
      tree = await fetchCategoryTree();
    } catch (err) {
      // Nav keeps just "Browse All"; the search panel keeps "All categories".
      console.warn('masthead: failed to load categories.', err);
      return;
    }
    buildNav(tree);
    buildMobileNav(tree);
    fillSearchCategories(tree);
  }

  function init() {
    wireTheme();
    wireMenu();
    wireFloatingSearch();
    loadCategories();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
