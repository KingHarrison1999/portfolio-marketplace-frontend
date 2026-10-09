// The one set of listing filters -- Category (the full tree), Price Range
// and Condition -- used in three places: the homepage and browse.html
// sidebars (1024px and wider) and the floating search panel (below 1024px,
// every page). Styles: Styles/shop-filters.css.
//
//   const filters = ShopFilters.mount(container, { idPrefix, state, onChange });
//   filters.getState()   // { categoryIds, minPrice, maxPrice, conditions }
//   filters.setState(state)
//
// onChange (optional) fires on every change, for sidebars that apply
// filters as you go; the search panel leaves it out and reads getState()
// on submit.
//
// Categories come from js/masthead.js (window.MarketplaceCategories), so
// the page fetches them once. A checked category always includes its whole
// subtree: checking a parent checks everything under it, and categoryIds
// carries every checked id, because listings sit in leaf categories and the
// API matches category_id exactly. That's the same shape the masthead's
// category links put in the URL.
(function () {
  const CONDITION_ORDER = ['new', 'like_new', 'used', 'for_parts'];
  const PRICE_DEBOUNCE_MS = 500;

  let conditionsPromise = null;

  // The condition values active listings actually use, in CONDITION_ORDER.
  function conditionsInUse() {
    if (!conditionsPromise) {
      conditionsPromise = Promise.resolve()
        .then(() => window.MarketplaceAuth.fetchWithAuth('/api/listings?limit=100'))
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((body) => {
          const used = new Set((body.listings || []).map((l) => l.condition).filter(Boolean));
          return CONDITION_ORDER.filter((c) => used.has(c));
        })
        .catch((err) => {
          console.warn('shop-filters: failed to load conditions.', err);
          return [];
        });
    }
    return conditionsPromise;
  }

  function categoryTree() {
    return window.MarketplaceCategories || Promise.reject(new Error('js/masthead.js not loaded'));
  }

  // --- URL <-> state ---

  function readPrice(value) {
    if (value === null || value === undefined || String(value).trim() === '') return '';
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? String(n) : '';
  }

  function fromParams(params) {
    return {
      categoryIds: params.getAll('category_id'),
      minPrice: readPrice(params.get('min_price')),
      maxPrice: readPrice(params.get('max_price')),
      conditions: params.getAll('condition'),
    };
  }

  function toParams(state, params = new URLSearchParams()) {
    for (const id of state.categoryIds || []) params.append('category_id', id);
    if (state.minPrice) params.set('min_price', state.minPrice);
    if (state.maxPrice) params.set('max_price', state.maxPrice);
    for (const c of state.conditions || []) params.append('condition', c);
    return params;
  }

  const isEmpty = (state) =>
    !(state.categoryIds || []).length && !state.minPrice && !state.maxPrice && !(state.conditions || []).length;

  // GET /api/listings for a filter state. The API has no condition
  // parameter, so condition is applied here, to the one generous page that
  // comes back (fine at this catalog's size). Rejects on any failure.
  async function fetchListings(state, { q = '', sort = 'newest', limit = 50 } = {}) {
    const params = toParams({ ...state, conditions: [] });
    if (q) params.set('q', q);
    params.set('sort', sort);
    params.set('limit', String(limit));
    const res = await window.MarketplaceAuth.fetchWithAuth(`/api/listings?${params.toString()}`);
    if (!res.ok) throw new Error(`listings request failed: ${res.status}`);
    const listings = (await res.json()).listings || [];
    const conditions = state.conditions || [];
    return conditions.length ? listings.filter((l) => conditions.includes(l.condition)) : listings;
  }

  // --- Describing a state in words (browse.html's heading) ---

  // The checked categories that aren't under another checked one,
  // e.g. "Men: Clothing" or "Women: Dresses".
  function categoryLabel(categoryIds, tree) {
    const ids = new Set(categoryIds);
    const named = categoryIds
      .map((id) => tree.byId.get(id))
      .filter((cat) => cat && !(cat.parent_id && ids.has(cat.parent_id)));
    const label = (cat) => {
      const top = tree.topOf(cat);
      return top === cat ? cat.name : `${top.name}: ${cat.name}`;
    };
    if (named.length === 0) return '';
    if (named.length > 3) return `${named.length} categories`;
    return named.map(label).join(', ');
  }

  function priceLabel(state) {
    if (state.minPrice && state.maxPrice) return `£${state.minPrice}–£${state.maxPrice}`;
    if (state.minPrice) return `£${state.minPrice} and up`;
    if (state.maxPrice) return `Up to £${state.maxPrice}`;
    return '';
  }

  // "Browse All", 'Results for "boots"', "Men: Clothing", 'Results for
  // "boots" in Women: Shoes', "Used, Up to £50"... tree may be null when
  // categories failed to load.
  function describe(state, q, tree) {
    const category = tree ? categoryLabel(state.categoryIds || [], tree) : '';
    const extras = [
      (state.conditions || []).map((c) => window.ShopCard.conditionLabel(c)).join(' or '),
      priceLabel(state),
    ].filter(Boolean);

    if (q) return `Results for "${q}"${category ? ` in ${category}` : ''}`;
    if (category) return category;
    if (extras.length) return extras.join(', ');
    if ((state.categoryIds || []).length) return 'Filtered listings';
    return 'Browse All';
  }

  // --- The component ---

  let instanceCount = 0;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function mount(container, { idPrefix = `shop-filters-${instanceCount}`, state = {}, onChange } = {}) {
    instanceCount += 1;
    let current = { categoryIds: [], minPrice: '', maxPrice: '', conditions: [], ...state };
    let priceTimer = null;

    container.innerHTML = '';
    const root = el('div', 'shop-filters');

    // Category
    const catGroup = el('fieldset', 'sf-group sf-categories');
    catGroup.appendChild(el('legend', 'sf-legend', 'Category'));
    const treeHost = el('div', 'sf-tree-host');
    treeHost.appendChild(el('p', 'sf-note', 'Loading categories…'));
    catGroup.appendChild(treeHost);
    root.appendChild(catGroup);

    // Price Range
    const priceGroup = el('fieldset', 'sf-group sf-price');
    priceGroup.appendChild(el('legend', 'sf-legend', 'Price Range'));
    const priceRow = el('div', 'sf-price-row');
    const priceInput = (name, placeholder) => {
      const label = el('label', 'sf-price-field');
      label.appendChild(el('span', 'sf-price-label', name));
      const wrap = el('span', 'sf-price-input');
      wrap.appendChild(el('span', 'sf-currency', '£'));
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.step = '1';
      input.inputMode = 'decimal';
      input.placeholder = placeholder;
      input.id = `${idPrefix}-${name.toLowerCase()}`;
      wrap.appendChild(input);
      label.appendChild(wrap);
      priceRow.appendChild(label);
      return input;
    };
    const minInput = priceInput('Min', '0');
    priceRow.insertBefore(el('span', 'sf-price-sep', 'to'), null);
    const maxInput = priceInput('Max', 'Any');
    priceGroup.appendChild(priceRow);
    root.appendChild(priceGroup);

    // Condition
    const condGroup = el('fieldset', 'sf-group sf-conditions');
    condGroup.appendChild(el('legend', 'sf-legend', 'Condition'));
    const condHost = el('div', 'sf-chips');
    condGroup.appendChild(condHost);
    root.appendChild(condGroup);

    container.appendChild(root);

    let categoryInputs = []; // { input, cat }
    let tree = null;
    let conditionValues = [];

    const changed = () => {
      if (onChange) onChange(getState());
    };

    // --- Category tree ---

    const inputFor = (id) => categoryInputs.find((entry) => entry.cat.id === id);

    // Parents reflect their children: checked when every child is,
    // indeterminate when only some are.
    function syncParents() {
      const visit = (cat) => {
        const entry = inputFor(cat.id);
        const kids = tree.children(cat);
        if (kids.length === 0) return entry.input.checked ? 'all' : 'none';
        const results = kids.map(visit);
        const all = results.every((r) => r === 'all');
        const none = results.every((r) => r === 'none');
        entry.input.checked = all;
        entry.input.indeterminate = !all && !none;
        return all ? 'all' : none ? 'none' : 'some';
      };
      tree.topLevel.forEach(visit);
    }

    function setSubtree(cat, checked) {
      for (const id of tree.subtreeIds(cat)) {
        const entry = inputFor(id);
        if (entry) entry.input.checked = checked;
      }
    }

    function applyCategories(ids) {
      if (!tree) return;
      const wanted = new Set(ids);
      categoryInputs.forEach(({ input }) => {
        input.checked = false;
        input.indeterminate = false;
      });
      // An id in the URL stands for its whole subtree.
      for (const { cat } of categoryInputs) if (wanted.has(cat.id)) setSubtree(cat, true);
      syncParents();
      // Open the branches that hold a selection.
      for (const [toggle, branch] of branches) {
        if (branch.querySelector('input:checked')) setExpanded(toggle, true);
      }
    }

    const branches = new Map(); // expand button -> the <ul> it shows

    function setExpanded(toggle, expanded) {
      toggle.setAttribute('aria-expanded', String(expanded));
      branches.get(toggle).hidden = !expanded;
    }

    function buildNode(cat, depth) {
      const li = el('li', `sf-node depth-${depth}`);
      const row = el('div', 'sf-row');
      const label = el('label', 'sf-check');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = cat.id;
      label.appendChild(input);
      label.appendChild(el('span', 'sf-check-text', cat.name));
      row.appendChild(label);
      li.appendChild(row);
      categoryInputs.push({ input, cat });

      input.addEventListener('change', () => {
        setSubtree(cat, input.checked);
        syncParents();
        changed();
      });

      const kids = tree.children(cat);
      if (kids.length > 0) {
        const branchId = `${idPrefix}-cat-${cat.id}`;
        const toggle = el('button', 'sf-expand');
        toggle.type = 'button';
        toggle.setAttribute('aria-controls', branchId);
        toggle.setAttribute('aria-label', `Show ${cat.name} categories`);
        toggle.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
        row.appendChild(toggle);

        const ul = el('ul', 'sf-branch');
        ul.id = branchId;
        branches.set(toggle, ul);
        kids.forEach((kid) => ul.appendChild(buildNode(kid, depth + 1)));
        li.appendChild(ul);
        toggle.addEventListener('click', () => setExpanded(toggle, toggle.getAttribute('aria-expanded') !== 'true'));
        // Top level starts open (Men, Women show their groups); deeper
        // levels start closed unless they hold a selection.
        setExpanded(toggle, depth === 0);
      }
      return li;
    }

    categoryTree()
      .then((t) => {
        tree = t;
        treeHost.innerHTML = '';
        const ul = el('ul', 'sf-tree');
        tree.topLevel.forEach((top) => ul.appendChild(buildNode(top, 0)));
        treeHost.appendChild(ul);
        applyCategories(current.categoryIds);
      })
      .catch((err) => {
        console.warn('shop-filters: categories unavailable.', err);
        treeHost.innerHTML = '';
        treeHost.appendChild(el('p', 'sf-note', 'Unable to load categories right now.'));
      });

    // --- Conditions ---

    function renderConditions() {
      const selected = new Set(current.conditions);
      // Show a condition from the URL even if no listing uses it any more,
      // so it can be unchecked.
      const values = CONDITION_ORDER.filter((c) => conditionValues.includes(c) || selected.has(c));
      condHost.innerHTML = '';
      if (values.length === 0) {
        condHost.appendChild(el('p', 'sf-note', 'No conditions to filter by yet.'));
        return;
      }
      for (const value of values) {
        const label = el('label', 'sf-chip');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = value;
        input.checked = selected.has(value);
        input.addEventListener('change', changed);
        label.appendChild(input);
        label.appendChild(document.createTextNode(window.ShopCard.conditionLabel(value)));
        condHost.appendChild(label);
      }
    }

    conditionsInUse().then((values) => {
      conditionValues = values;
      current = getState();
      renderConditions();
    });

    // --- Price ---

    const priceChanged = () => {
      clearTimeout(priceTimer);
      priceTimer = setTimeout(changed, PRICE_DEBOUNCE_MS);
    };
    for (const input of [minInput, maxInput]) {
      input.addEventListener('input', priceChanged);
      input.addEventListener('change', () => {
        clearTimeout(priceTimer);
        changed();
      });
    }

    // --- State ---

    function getState() {
      const categoryIds = tree
        ? categoryInputs.filter(({ input }) => input.checked).map(({ cat }) => cat.id)
        : current.categoryIds.slice();
      const conditionInputs = condHost.querySelectorAll('input[type="checkbox"]');
      const conditions = conditionInputs.length
        ? Array.from(conditionInputs).filter((i) => i.checked).map((i) => i.value)
        : current.conditions.slice();
      let minPrice = readPrice(minInput.value);
      let maxPrice = readPrice(maxInput.value);
      if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) [minPrice, maxPrice] = [maxPrice, minPrice];
      return { categoryIds, minPrice, maxPrice, conditions };
    }

    function setState(next) {
      current = { categoryIds: [], minPrice: '', maxPrice: '', conditions: [], ...next };
      minInput.value = current.minPrice;
      maxInput.value = current.maxPrice;
      applyCategories(current.categoryIds);
      renderConditions();
    }

    setState(current);
    return { getState, setState, element: root };
  }

  window.ShopFilters = { mount, fromParams, toParams, isEmpty, describe, fetchListings, categoryTree };
})();
